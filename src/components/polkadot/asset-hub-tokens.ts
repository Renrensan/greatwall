import type { TypedApi } from "polkadot-api";
import type { assetHubPolkadot } from "@polkadot-api/descriptors";

type AssetHubApi = TypedApi<typeof assetHubPolkadot>;

// Asset Hub has no equivalent of Hedera's mirror node ("list everything this account
// holds") or Ethereum's Uniswap token list — pallet-assets registers assets under plain
// numeric IDs with no external verified registry installed in this repo, and a wrong
// hardcoded ID here wouldn't just show a missing logo, it'd show a balance under the wrong
// token's name entirely. So this discovers real registered assets live from the chain
// instead: every asset with on-chain Metadata set, then checks which of those the
// connected account actually holds a nonzero balance of, in one batched call.
//
// Scope note: this only covers the local `Assets` pallet (plain numeric asset IDs).
// Bridged assets (e.g. Snowbridge USDC/USDT) are typically registered under `ForeignAssets`
// instead, which uses an XCM MultiLocation key rather than a plain number — a separate,
// larger piece of work, not covered here yet.
export interface HeldAssetHubToken {
  mint: string; // stringified numeric asset ID — reusing the shared field name used elsewhere
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  isNative: false;
  logo: string | null;
  price: string;
}

function decodeBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder().decode(bytes).replace(/\0+$/, "").trim();
  } catch {
    return "";
  }
}

export async function fetchHeldAssetHubTokens(
  typedApi: AssetHubApi,
  address: string,
): Promise<HeldAssetHubToken[]> {
  try {
    const metadataEntries = await typedApi.query.Assets.Metadata.getEntries();
    if (metadataEntries.length === 0) return [];

    const assetIds = metadataEntries.map((e) => e.keyArgs[0]);
    const accountBalances = await typedApi.query.Assets.Account.getValues(
      assetIds.map((assetId) => [assetId, address] as const),
    );

    const held: HeldAssetHubToken[] = [];
    metadataEntries.forEach((entry, i) => {
      const account = accountBalances[i];
      if (!account || account.balance <= BigInt(0)) return;

      const assetId = entry.keyArgs[0];
      const decimals = entry.value.decimals;
      const symbol = decodeBytes(entry.value.symbol) || `Asset #${assetId}`;
      const name = decodeBytes(entry.value.name) || symbol;

      held.push({
        mint: assetId.toString(),
        symbol,
        name,
        decimals,
        amount: Number(account.balance) / Math.pow(10, decimals),
        isNative: false,
        logo: null,
        price: "0",
      });
    });

    return held;
  } catch (err) {
    console.error("Failed to fetch held Asset Hub tokens:", err);
    return [];
  }
}
