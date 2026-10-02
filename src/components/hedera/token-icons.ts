// DavinciGraph's "DaVinciPic" service — the icon backend HashPack's own docs point to as the
// "DaVinci token icon manager" ("[a]ny wallet or dapp using this service will automatically
// pull in your token icon once uploaded"). Public and keyless, verified live:
//   GET https://s1.pics.davincigraph.io/api/v2/tokens/hedera/{tokenId}
//     -> { address, pic: "<arweave.net image url>", title, type, ... }
// CORS is open (reflects any Origin), so this is called directly rather than proxied.
const DAVINCI_PIC_API_URL = "https://s1.pics.davincigraph.io/api/v2";
const DAVINCI_PIC_BACKUP_API_URL = "https://s2.pics.davincigraph.io/api/v2";

async function fetchOne(baseUrl: string, tokenId: string): Promise<string | null> {
  const url = `${baseUrl}/tokens/hedera/${tokenId}?scope=supplementary&noMissingError=true&includeBgColor=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DavinciPic ${res.status} for ${tokenId}`);
  const data = await res.json();
  return typeof data?.pic === "string" ? data.pic : null;
}

export async function fetchHederaTokenIcons(
  tokenIds: string[],
): Promise<Record<string, string>> {
  if (tokenIds.length === 0) return {};

  const results = await Promise.all(
    tokenIds.map(async (tokenId) => {
      try {
        const pic = await fetchOne(DAVINCI_PIC_API_URL, tokenId);
        return [tokenId, pic] as const;
      } catch {
        try {
          const pic = await fetchOne(DAVINCI_PIC_BACKUP_API_URL, tokenId);
          return [tokenId, pic] as const;
        } catch (err) {
          console.error(`Failed to fetch Hedera token icon for ${tokenId}:`, err);
          return [tokenId, null] as const;
        }
      }
    }),
  );

  const icons: Record<string, string> = {};
  for (const [tokenId, pic] of results) {
    if (pic) icons[tokenId] = pic;
  }
  return icons;
}
