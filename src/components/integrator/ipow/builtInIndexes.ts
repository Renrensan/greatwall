// Index tokens whose metadata, written before Greatwall pinned to IPFS,
// ships with the app in public/: by the id in their chain's link. GREAT on
// Solana devnet (basket 53b21a…aaKu) holds http://0.0.0.0:3001/api/beta/
// metadata/6c2e0b411ff18702517978a3 for good (its metadata is immutable), a
// link no one else can read; its files kept here load on any server. No
// imports, so the API routes read it without the client's modules.

export const BUILT_IN: Record<string, { metadata: string; image: string }> = {
  "6c2e0b411ff18702517978a3": { metadata: "/assets/index/great/metadata.json", image: "/assets/index/great/image.png" },
};
