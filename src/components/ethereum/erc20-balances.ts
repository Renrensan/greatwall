import { ethers } from "ethers";
import { VerifiedErc20Token } from "./config/verified-tokens";

// Deployed at this same address on essentially every EVM chain, including Sepolia —
// https://www.multicall3.com/deployments
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
];
const ERC20_BALANCE_ABI = ["function balanceOf(address) view returns (uint256)"];

export interface HeldErc20Token {
  mint: string; // contract address — named to match the shared token-row shape used elsewhere (Solana's mint/Assets.tsx)
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  isNative: false;
  price: string;
  priceChange24h: number;
  logo: string | null;
}

/**
 * Batches a balanceOf call per candidate token into a single multicall so the cost stays
 * constant regardless of how many tokens are on the allowlist, then filters to whatever the
 * wallet actually holds a nonzero amount of.
 */
export async function fetchErc20Balances(
  provider: ethers.Provider,
  owner: string,
  candidates: VerifiedErc20Token[],
): Promise<HeldErc20Token[]> {
  if (candidates.length === 0) return [];

  const erc20Iface = new ethers.Interface(ERC20_BALANCE_ABI);
  const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);

  const calls = candidates.map((token) => ({
    target: token.address,
    allowFailure: true,
    callData: erc20Iface.encodeFunctionData("balanceOf", [owner]),
  }));

  const results: { success: boolean; returnData: string }[] = await multicall.aggregate3(calls);

  const held: HeldErc20Token[] = [];
  results.forEach((result, i) => {
    const token = candidates[i];
    if (!result.success || !result.returnData || result.returnData === "0x") return;

    try {
      const [raw] = erc20Iface.decodeFunctionResult("balanceOf", result.returnData);
      const amount = Number(ethers.formatUnits(raw, token.decimals));
      if (amount > 0) {
        held.push({
          mint: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          amount,
          isNative: false,
          price: "0",
          priceChange24h: 0,
          logo: null,
        });
      }
    } catch {
      // Malformed/unexpected return data from a non-standard token — skip it rather than
      // letting one bad entry fail the whole balance fetch.
    }
  });

  return held;
}
