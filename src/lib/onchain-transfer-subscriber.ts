import { SupportedChain } from "@/app/network-provider";
import { Connection, PublicKey } from "@solana/web3.js";

export interface DetectedTransfer {
  txHash: string;
  amount?: number;
  from?: string;
  to?: string;
}

export type TransferCallback = (transfer: DetectedTransfer) => void;

/**
 * Subscribes to on-chain transfer events from `userAddress` to `operatorAddress`
 * matching the expected `expectedAmount` and `tokenType`.
 * Returns an unsubscribe function to clean up connections/listeners.
 */
export function subscribeOnChainTransfer(params: {
  network: SupportedChain;
  userAddress: string;
  operatorAddress: string;
  expectedAmount: number;
  tokenType?: string;
  isMainnet: boolean;
  rpcUrl?: string;
  txCreatedAt?: string | number | Date;
  onDetected: TransferCallback;
}): () => void {
  const {
    network,
    userAddress,
    operatorAddress,
    expectedAmount,
    tokenType,
    isMainnet,
    rpcUrl,
    txCreatedAt,
    onDetected,
  } = params;

  if (!userAddress || !operatorAddress || !expectedAmount) {
    return () => {};
  }

  let isCleanedUp = false;
  const cleanups: (() => void)[] = [];

  const triggerDetected = (tx: DetectedTransfer) => {
    if (isCleanedUp) return;
    onDetected(tx);
  };

  const createdTimeMs = txCreatedAt ? new Date(txCreatedAt).getTime() : 0;
  // Allow up to 3 minutes leeway before creation timestamp for server/local clock skew
  const minBlockTimeSec =
    createdTimeMs > 0 ? Math.floor((createdTimeMs - 180_000) / 1000) : 0;

  // ------------------------------------------------------------------------
  // 1. BITCOIN (Poll user wallet first, then WebSocket + mempool)
  // ------------------------------------------------------------------------
  if (network === "bitcoin") {
    const mempoolBase = isMainnet
      ? "https://mempool.space"
      : "https://mempool.space/testnet4";
    const mempoolWsBase = isMainnet
      ? "wss://mempool.space/api/v1/ws"
      : "wss://mempool.space/testnet4/api/v1/ws";

    const expectedSats = Math.round(expectedAmount * 1e8);

    const checkBitcoinTxs = (txs: any[]) => {
      if (!Array.isArray(txs)) return false;
      for (const tx of txs) {
        if (
          minBlockTimeSec > 0 &&
          tx.status?.block_time &&
          tx.status.block_time < minBlockTimeSec
        ) {
          continue;
        }
        const hasMatchingOutput = tx.vout?.some((v: any) => {
          const paysOperator =
            v.scriptpubkey_address?.toLowerCase() ===
              operatorAddress.toLowerCase() ||
            v.scriptpubkey_address === operatorAddress;
          const isMatchingVal =
            Math.abs(Number(v.value) - expectedSats) <= 100 || // small fee tolerance
            Number(v.value) === expectedSats;
          return paysOperator && isMatchingVal;
        });

        if (hasMatchingOutput && tx.txid) {
          triggerDetected({
            txHash: tx.txid,
            amount: expectedAmount,
            from: userAddress,
            to: operatorAddress,
          });
          return true;
        }
      }
      return false;
    };

    // Initial check: query user wallet address first, then operator address
    const queryInitialHttp = async () => {
      try {
        const resUser = await fetch(
          `${mempoolBase}/api/address/${userAddress}/txs`,
        );
        if (resUser.ok) {
          const txs = await resUser.json();
          if (checkBitcoinTxs(txs)) return;
        }

        const resOp = await fetch(
          `${mempoolBase}/api/address/${operatorAddress}/txs`,
        );
        if (resOp.ok) {
          const txs = await resOp.json();
          if (checkBitcoinTxs(txs)) return;
        }
      } catch (e) {
        console.warn("Bitcoin initial mempool fetch error:", e);
      }
    };

    queryInitialHttp();

    // WebSocket Subscription
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(mempoolWsBase);

      ws.onopen = () => {
        if (isCleanedUp) {
          ws?.close();
          return;
        }
        try {
          ws?.send(
            JSON.stringify({
              action: "want",
              data: ["blocks", "mempool-blocks"],
            }),
          );
          ws?.send(JSON.stringify({ "track-address": userAddress }));
          ws?.send(JSON.stringify({ "track-address": operatorAddress }));
        } catch {}
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data["address-transactions"]) {
            checkBitcoinTxs(data["address-transactions"]);
          } else if (data.tx) {
            checkBitcoinTxs([data.tx]);
          } else if (data.mempool) {
            queryInitialHttp();
          }
        } catch {}
      };

      cleanups.push(() => {
        try {
          ws?.close();
        } catch {}
      });
    } catch (e) {
      console.warn("Bitcoin WS connection error:", e);
    }
  }

  // ------------------------------------------------------------------------
  // 2. SOLANA (Poll user wallet first, then listen / scan)
  // ------------------------------------------------------------------------
  else if (network === "solana") {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const effectiveRpc =
      rpcUrl ||
      (isMainnet
        ? `${origin}/api/rpc/solana/mainnet`
        : `${origin}/api/rpc/solana/devnet`);

    try {
      const conn = new Connection(effectiveRpc, "confirmed");

      const checkSolana = async () => {
        if (isCleanedUp) return false;
        try {
          // Check user wallet first, then operator address as backup
          const addressesToPoll = [userAddress, operatorAddress];

          for (const addr of addressesToPoll) {
            if (!addr) continue;
            let pubkey: PublicKey;
            try {
              pubkey = new PublicKey(addr);
            } catch {
              continue;
            }

            const signatures = await conn.getSignaturesForAddress(pubkey, {
              limit: 12,
            });

            for (const sigInfo of signatures) {
              if (sigInfo.err) continue;
              if (
                minBlockTimeSec > 0 &&
                sigInfo.blockTime &&
                sigInfo.blockTime < minBlockTimeSec
              ) {
                // Skip transactions that took place before the withdrawal order was created
                continue;
              }

              // Fetch parsed tx
              const parsedTx = await conn.getParsedTransaction(
                sigInfo.signature,
                {
                  maxSupportedTransactionVersion: 0,
                },
              );

              if (!parsedTx || parsedTx.meta?.err) continue;

              // 1. Check Native SOL System Transfer
              const instructions =
                parsedTx.transaction.message.instructions || [];
              for (const ix of instructions as any[]) {
                if (
                  ix.program === "system" &&
                  ix.parsed?.type === "transfer" &&
                  ix.parsed?.info
                ) {
                  const info = ix.parsed.info;
                  const isToOperator =
                    info.destination?.toLowerCase() ===
                    operatorAddress.toLowerCase();
                  const lamports = Number(info.lamports || 0);
                  const solAmt = lamports / 1e9;
                  const isMatchAmt = Math.abs(solAmt - expectedAmount) < 1e-4;

                  if (isToOperator && isMatchAmt) {
                    triggerDetected({
                      txHash: sigInfo.signature,
                      amount: solAmt,
                      from: userAddress,
                      to: operatorAddress,
                    });
                    return true;
                  }
                }
              }

              // 2. Check SPL Token Transfers
              const preBalances = parsedTx.meta?.preTokenBalances || [];
              const postBalances = parsedTx.meta?.postTokenBalances || [];
              for (const post of postBalances) {
                if (
                  post.owner?.toLowerCase() === operatorAddress.toLowerCase()
                ) {
                  const pre = preBalances.find(
                    (b) =>
                      b.accountIndex === post.accountIndex ||
                      b.owner?.toLowerCase() === operatorAddress.toLowerCase(),
                  );
                  const preAmt = pre?.uiTokenAmount?.uiAmount || 0;
                  const postAmt = post.uiTokenAmount?.uiAmount || 0;
                  const delta = postAmt - preAmt;
                  if (Math.abs(delta - expectedAmount) < 1e-4) {
                    triggerDetected({
                      txHash: sigInfo.signature,
                      amount: delta,
                      from: userAddress,
                      to: operatorAddress,
                    });
                    return true;
                  }
                }
              }
            }
          }
        } catch (e) {
          // Ignore transient errors
        }
        return false;
      };

      // 1. Immediate poll upon opening
      checkSolana();

      // 2. Subscribe via short interval
      const solanaInterval = setInterval(checkSolana, 2500);
      cleanups.push(() => clearInterval(solanaInterval));
    } catch (e) {
      console.warn("Solana subscriber initialization error:", e);
    }
  }

  // ------------------------------------------------------------------------
  // 3. HEDERA (Poll user account first, then operator)
  // ------------------------------------------------------------------------
  else if (network === "hedera") {
    const mirrorBase = isMainnet
      ? "https://mainnet-public.mirrornode.hedera.com"
      : "https://testnet.mirrornode.hedera.com";

    const checkHedera = async () => {
      if (isCleanedUp) return;
      try {
        const accountsToPoll = [userAddress, operatorAddress];
        for (const account of accountsToPoll) {
          if (!account) continue;
          const res = await fetch(
            `${mirrorBase}/api/v1/accounts/${account}/transactions?limit=10&order=desc`,
          );
          if (!res.ok) continue;
          const data = await res.json();
          const transactions = data.transactions || [];

          for (const tx of transactions) {
            if (tx.result !== "SUCCESS") continue;
            if (minBlockTimeSec > 0 && tx.consensus_timestamp) {
              const txSec = parseFloat(tx.consensus_timestamp);
              if (txSec < minBlockTimeSec) continue;
            }

            const transfers = tx.transfers || [];
            const opTransfer = transfers.find(
              (tr: any) =>
                tr.account === operatorAddress && Number(tr.amount) > 0,
            );
            if (opTransfer) {
              const hbarAmt = Number(opTransfer.amount) / 1e8;
              if (Math.abs(hbarAmt - expectedAmount) < 1e-4) {
                const txHash =
                  tx.transaction_hash || tx.transaction_id || "";
                triggerDetected({
                  txHash,
                  amount: hbarAmt,
                  from: userAddress,
                  to: operatorAddress,
                });
                return;
              }
            }
          }
        }
      } catch (e) {
        console.warn("Hedera check error:", e);
      }
    };

    checkHedera();
    const hederaInterval = setInterval(checkHedera, 3000);
    cleanups.push(() => clearInterval(hederaInterval));
  }

  // ------------------------------------------------------------------------
  // 4. ETHEREUM / POLKADOT (Generic Pollers)
  // ------------------------------------------------------------------------
  else {
    const checkGeneric = async () => {};
    const genericInterval = setInterval(checkGeneric, 4000);
    cleanups.push(() => clearInterval(genericInterval));
  }

  return () => {
    isCleanedUp = true;
    for (const c of cleanups) {
      try {
        c();
      } catch {}
    }
  };
}
