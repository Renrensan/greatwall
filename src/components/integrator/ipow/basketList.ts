// The baskets this browser knows: those made or opened here. Neither the
// EVM contract nor the Solana program lists baskets (one is found by its key
// or address), so the app remembers them, by the contract or program, so a
// new deployment starts clean. EVM baskets are 32-byte keys, Solana's are
// account addresses.

// Solana addresses are case-sensitive: only EVM's are folded.
const keyOf = (baskets: string) => `greatwall:beta:${baskets.startsWith("0x") ? baskets.toLowerCase() : baskets}:baskets`;

const valid = (key: string) => isBasketKey(key) || isSolanaBasket(key);

export function knownBaskets(baskets: string): string[] {
  try {
    const raw = localStorage.getItem(keyOf(baskets));
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === "string" && valid(k)) : [];
  } catch {
    return [];
  }
}

export function rememberBasket(baskets: string, key: string) {
  try {
    const list = knownBaskets(baskets).filter((k) => !same(k, key));
    localStorage.setItem(keyOf(baskets), JSON.stringify([key, ...list].slice(0, 50)));
  } catch {}
}

export const isBasketKey = (key: string) => /^0x[0-9a-fA-F]{64}$/.test(key.trim());

/** A Solana basket: an account address, 32 bytes in base58. */
export const isSolanaBasket = (key: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(key.trim());

const same = (a: string, b: string) => (a.startsWith("0x") ? a.toLowerCase() === b.toLowerCase() : a === b);
