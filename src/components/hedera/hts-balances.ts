// Unlike Ethereum, Hedera's mirror node can directly enumerate every HTS token an account
// holds — /accounts/{id}/tokens — so there's no need for a hand-curated allowlist just to
// discover balances. Per the user's own call, this shows everything held rather than
// filtering to a verified subset for now, same tradeoff Solana had before its spam-token fix
// was scoped down to a verified list — worth revisiting if spam tokens show up here too.
export interface HeldHtsToken {
  mint: string; // Hedera token ID (e.g. "0.0.456858") — reusing the shared field name used elsewhere (Solana's mint/Ethereum's contract address)
  symbol: string;
  name: string;
  decimals: number;
  amount: number;
  isNative: false;
  logo: string | null;
  price: string;
  dueDiligenceComplete: boolean;
}

interface MirrorTokenRelationship {
  token_id: string;
  balance: number;
  decimals: number;
}

export async function fetchHeldHtsTokens(
  mirrorNodeUrl: string,
  accountIdOrEvmAddress: string,
): Promise<HeldHtsToken[]> {
  try {
    let relationships: MirrorTokenRelationship[] = [];
    let nextPath: string | undefined = `/api/v1/accounts/${accountIdOrEvmAddress}/tokens?limit=100`;

    for (let guard = 0; nextPath && guard < 20; guard++) {
      const pageUrl: string = `${mirrorNodeUrl}${nextPath}`;
      const pageRes: Response = await fetch(pageUrl);
      if (!pageRes.ok) break;
      const pageData: { tokens?: MirrorTokenRelationship[]; links?: { next?: string } } = await pageRes.json();
      relationships = relationships.concat(pageData.tokens || []);
      nextPath = pageData.links?.next;
    }

    const held = relationships.filter((t) => t.balance > 0);
    if (held.length === 0) return [];

    const resolved = await Promise.all(
      held.map(async (t): Promise<HeldHtsToken | null> => {
        try {
          const res = await fetch(`${mirrorNodeUrl}/api/v1/tokens/${t.token_id}`);
          if (!res.ok) return null;
          const meta = await res.json();

          // NFTs (NON_FUNGIBLE_UNIQUE) don't fit a fungible "amount" balance row — skip them
          // here rather than showing a nonsensical decimal amount.
          if (meta.type && meta.type !== "FUNGIBLE_COMMON") return null;

          return {
            mint: t.token_id,
            symbol: meta.symbol || t.token_id,
            name: meta.name || meta.symbol || t.token_id,
            decimals: t.decimals,
            amount: t.balance / Math.pow(10, t.decimals),
            isNative: false,
            logo: null,
            price: "0",
            dueDiligenceComplete: false,
          };
        } catch {
          return null;
        }
      }),
    );

    return resolved.filter((t): t is HeldHtsToken => t !== null && t.amount > 0);
  } catch (err) {
    console.error("Failed to fetch held HTS tokens:", err);
    return [];
  }
}
