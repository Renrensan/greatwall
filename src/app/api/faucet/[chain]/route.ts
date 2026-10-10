// The faucet of the EVM test networks: this server's faucet wallet sends a
// test RWA token from its stock (minted to it by the tokens' minter), and a
// little of the network's gas coin when the address has too little to use
// it, paying the fees itself, so a new wallet needs nothing to start. The
// wallet's key is FAUCET_EVM_KEY in the server's .env.local: one test key
// for every EVM network, never the deployer's or the operator's. Solana's
// faucet is /api/faucet/solana.
//
//   POST /api/faucet/<chain>  {address, token}    token: an RWA token's address, or "gas"
//   -> {hash, amount, symbol, gas: {hash, amount, symbol} | null}
//   -> {error, faucet?}  faucet: a public faucet, when this one is out of gas
//
// Limits (../limits.ts): this site only, ten claims an hour per visitor,
// each address once a day per token and once a day for gas.

import { NextResponse } from "next/server";
import { Contract, FetchRequest, JsonRpcProvider, Wallet, formatUnits, getAddress, isAddress, parseUnits, type TransactionResponse } from "ethers";

import { RWA_TOKENS } from "@/components/integrator/ipow/rwaTokens";
import { PATH_USD } from "@/components/integrator/ipow/sdk";
import { PUBLIC_FAUCET, refused, take, takeDrip, type Hold } from "../limits";

export const runtime = "nodejs";

type Gas = {
  symbol: string;
  decimals: number;
  /** What one drip sends, and the balance under which an address gets one. */
  drip: string;
  below: string;
  /** The gas token, on a network whose gas is a token (Tempo's PathUSD). */
  token?: string;
};
type Chain = { rpc: () => string | undefined; send?: string; chainId: number; gas: Gas };

const ETH_L2: Gas = { symbol: "ETH", decimals: 18, drip: "0.0005", below: "0.0002" };
const CHAINS: Record<string, Chain> = {
  ethereum: { rpc: () => process.env.ETH_TESTNET_RPC_URL, chainId: 11155111, gas: { symbol: "ETH", decimals: 18, drip: "0.002", below: "0.001" } },
  base: { rpc: () => process.env.BASE_TESTNET_RPC_URL, chainId: 84532, gas: ETH_L2 },
  arbitrum: { rpc: () => process.env.ARBITRUM_TESTNET_RPC_URL, chainId: 421614, gas: ETH_L2 },
  robinhood: { rpc: () => process.env.ROBINHOOD_TESTNET_RPC_URL, chainId: 46630, gas: ETH_L2 },
  // Its provider refuses sends: they go to the network's own endpoint.
  hyperliquid: { rpc: () => process.env.HYPERLIQUID_TESTNET_RPC_URL, send: "https://rpc.hyperliquid-testnet.xyz/evm", chainId: 998, gas: { symbol: "HYPE", decimals: 18, drip: "0.002", below: "0.001" } },
  // Fees are paid in PathUSD (6 decimals); there is no native coin to send.
  tempo: { rpc: () => process.env.TEMPO_TESTNET_RPC_URL, chainId: 42431, gas: { symbol: "PathUSD", decimals: 6, drip: "1", below: "0.5", token: PATH_USD } },
};

const ERC20 = ["function balanceOf(address) view returns (uint256)", "function transfer(address to, uint256 amount) returns (bool)"];
/** How long the server waits for a send to be mined before answering. */
const WAIT_MS = 90_000;

function provider(url: string, chainId: number) {
  const r = new FetchRequest(url);
  r.timeout = 20_000;
  return new JsonRpcProvider(r, chainId, { staticNetwork: true });
}

/** One send at a time per network, so two claims never take the same nonce. */
const turns = new Map<string, Promise<unknown>>();
function inTurn<T>(chain: string, run: () => Promise<T>): Promise<T> {
  const next = (turns.get(chain) ?? Promise.resolve()).catch(() => {}).then(run);
  turns.set(chain, next);
  return next;
}
/** The next nonce per network, kept here: a load-balanced RPC's "pending"
 *  count can trail a send made a moment ago. Forgotten after a failed send. */
const nonces = new Map<string, number>();

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });
/** A failure as the user sees it: plain words; the details in the server's log. */
function failed(chain: string, what: string, e: any) {
  console.error(`[faucet ${chain}] ${what}:`, e?.shortMessage ?? e?.message ?? e);
  return fail(`The faucet couldn't send it (${what}). Try again in a minute.`, 502);
}

export async function POST(req: Request, { params }: { params: Promise<{ chain: string }> }) {
  const no = refused(req);
  if (no) return no;
  const { chain } = await params;
  const c = CHAINS[chain];
  if (!c) return fail("No faucet on this network", 404);
  const key = process.env.FAUCET_EVM_KEY;
  const rpc = c.rpc();
  if (!key || !rpc) return fail("The faucet is not set up on this server", 503);

  const body = (await req.json().catch(() => ({}))) as { address?: unknown; token?: unknown };
  if (typeof body.address !== "string" || !isAddress(body.address)) return fail("Not an EVM address", 400);
  const to = getAddress(body.address);
  const wantsGasOnly = body.token === "gas";
  const rwa = wantsGasOnly ? null : (RWA_TOKENS[chain as keyof typeof RWA_TOKENS] ?? []).find((t) => typeof body.token === "string" && t.token.toLowerCase() === body.token.toLowerCase());
  if (!wantsGasOnly && !rwa) return fail("Not one of the test tokens", 400);

  // Taken now, before anything is awaited: a second request at once is refused.
  const gasLock = `${chain}:${to}:gas`;
  const claim = take(rwa ? `${chain}:${to}:${rwa.token.toLowerCase()}` : gasLock);
  if ("until" in claim) return fail(`Already claimed; again at ${claim.until}`, 429);
  let gasHold: Hold | null = wantsGasOnly ? claim : null;
  let budget: Hold | null = null;
  const giveBack = () => [claim, gasHold, budget].forEach((h) => h?.release());

  const read = provider(rpc, c.chainId);
  const wallet = new Wallet(key, c.send ? provider(c.send, c.chainId) : read);
  const gasToken = c.gas.token ? new Contract(c.gas.token, ERC20, read) : null;
  const gasBalance = (a: string): Promise<bigint> => (gasToken ? gasToken.balanceOf(a) : read.getBalance(a));
  const drip = parseUnits(c.gas.drip, c.gas.decimals);

  // Gas for the address when it has too little: once a day per address, and
  // within the network's daily budget.
  let sendGas = false;
  try {
    const [theirs, ours] = await Promise.all([gasBalance(to), gasBalance(wallet.address)]);
    if (theirs < parseUnits(c.gas.below, c.gas.decimals)) {
      if (!gasHold) {
        const g = take(gasLock);
        gasHold = "until" in g ? null : g;
      }
      budget = gasHold ? takeDrip(chain) : null;
      sendGas = !!budget;
    }
    if (wantsGasOnly && !sendGas) {
      giveBack();
      return theirs < parseUnits(c.gas.below, c.gas.decimals)
        ? fail("Greatwall's faucet has given today's gas; get some from the public faucet.", 503, { faucet: PUBLIC_FAUCET[chain] ?? null, dry: "gas" })
        : fail(`You have enough ${c.gas.symbol} for fees already`, 400);
    }
    if (!sendGas && gasHold !== claim) {
      gasHold?.release();
      gasHold = null;
    }
    // The faucet's own fees need a little too; say so plainly when it is out.
    if (ours < (sendGas ? drip : BigInt(0)) + drip / BigInt(4)) {
      giveBack();
      return fail(`Greatwall's faucet is out of ${c.gas.symbol} on this network. Get some from the public faucet.`, 503, { faucet: PUBLIC_FAUCET[chain] ?? null, dry: "gas" });
    }
    if (rwa) {
      const stock: bigint = await new Contract(rwa.token, ERC20, read).balanceOf(wallet.address);
      if (stock < parseUnits(String(rwa.faucet), rwa.decimals)) {
        giveBack();
        return fail(`Greatwall's faucet is out of ${rwa.symbol}`, 503, { dry: "token" });
      }
    }
  } catch (e) {
    giveBack();
    return failed(chain, "reading balances", e);
  }

  // Each send keeps its own hold once it is out; only what didn't go out is
  // given back.
  let gasTx: TransactionResponse | null = null;
  let tokenTx: TransactionResponse | null = null;
  try {
    await inTurn(chain, async () => {
      let nonce = Math.max(nonces.get(chain) ?? 0, await wallet.getNonce("pending"));
      try {
        if (sendGas) {
          gasTx = gasToken ? await (gasToken.connect(wallet) as Contract).transfer(to, drip, { nonce }) : await wallet.sendTransaction({ to, value: drip, nonce });
          nonces.set(chain, ++nonce);
        }
        if (rwa) {
          tokenTx = await (new Contract(rwa.token, ERC20, wallet) as Contract).transfer(to, parseUnits(String(rwa.faucet), rwa.decimals), { nonce });
          nonces.set(chain, ++nonce);
        }
      } catch (e) {
        nonces.delete(chain);
        throw e;
      }
    });
  } catch (e) {
    if (!gasTx) [gasHold, budget].forEach((h) => h?.release());
    if (!tokenTx && rwa) claim.release();
    return failed(chain, "sending", e);
  }

  // Mined before answering, so the wallet shows it when the toast says so;
  // the hash is answered anyway when the network is slow.
  const sentGas = gasTx as TransactionResponse | null;
  const sentToken = tokenTx as TransactionResponse | null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const results = await Promise.race([
    Promise.allSettled([sentGas?.wait(), sentToken?.wait()]),
    new Promise<null>((r) => (timer = setTimeout(() => r(null), WAIT_MS))),
  ]);
  clearTimeout(timer);
  if (results) {
    const [g, t] = results;
    if (g.status === "rejected") [gasHold, budget].forEach((h) => h?.release());
    if (t.status === "rejected" && rwa) claim.release();
    const bad = rwa ? t : g;
    if (bad.status === "rejected") return failed(chain, "on chain", bad.reason);
  }
  const main = (sentToken ?? sentGas)!;
  return NextResponse.json({
    hash: main.hash,
    amount: rwa ? rwa.faucet : Number(formatUnits(drip, c.gas.decimals)),
    symbol: rwa ? rwa.symbol : c.gas.symbol,
    gas: sentGas && rwa && results?.[0].status !== "rejected" ? { hash: sentGas.hash, amount: Number(formatUnits(drip, c.gas.decimals)), symbol: c.gas.symbol } : null,
  });
}
