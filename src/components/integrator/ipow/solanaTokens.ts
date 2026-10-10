// What a Solana token is, for showing it: a name the app knows (wrapped SOL,
// a vault receipt of an EVM network's coin) or its short address, and its
// decimals from its mint. Read once per token and kept.

import { PublicKey } from "@solana/web3.js";
import { WRAPPED_SOL } from "@ipow/sdk";

import { SolanaVault } from "@ipow/sdk";

import { EVM_CHAINS, TICKER, deploymentOf, solanaConnection, solanaVaultWith, type BasketChain } from "./sdk";
import { rwaTokensOf } from "./rwaTokens";

export type SolanaToken = { mint: string; symbol: string; decimals: number };

/** The receipts made here of each EVM network's coin (its asset 0), and
 *  of Tempo's PathUSD (its vault's asset 0). */
export function receiptMints(): { peer: BasketChain; mint: string; symbol: string }[] {
  const tempo = deploymentOf("tempo");
  return [
    ...EVM_CHAINS.map((peer) => ({
      peer: peer as BasketChain,
      mint: solanaVaultWith(peer, null).receiptMint(0).toBase58(),
      // The source coin's name, not the receipt's vETH: ETH locked on Ethereum.
      symbol: `${TICKER[peer]} · ${peer.charAt(0).toUpperCase() + peer.slice(1)}`,
    })),
    ...(tempo ? [{ peer: "tempo" as const, mint: new SolanaVault(solanaConnection(), tempo.number).receiptMint(0).toBase58(), symbol: `${TICKER.tempo} · Tempo` }] : []),
  ];
}

export function solanaSymbol(mint: string): string {
  if (mint === WRAPPED_SOL) return "SOL";
  const rwa = rwaTokensOf("solana").find((r) => r.token === mint);
  if (rwa) return rwa.symbol;
  const receipt = receiptMints().find((r) => r.mint === mint);
  return receipt ? receipt.symbol : `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

const known = new Map<string, Promise<SolanaToken>>();

/** A token's symbol and decimals; refused when `mint` is no token here. */
export function solanaToken(mint: string): Promise<SolanaToken> {
  let info = known.get(mint);
  if (!info) {
    info = solanaConnection()
      .getTokenSupply(new PublicKey(mint))
      .then((s) => ({ mint, symbol: solanaSymbol(mint), decimals: s.value.decimals }));
    info.catch(() => known.delete(mint));
    known.set(mint, info);
  }
  return info;
}

