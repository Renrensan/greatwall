import { getSs58AddressInfo, fromBufferToBase58 } from "@polkadot-api/substrate-bindings";

export function toPlanck(amount: number, decimals: number): bigint {
  const [whole, frac = ""] = amount.toString().split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole) * BigInt(10) ** BigInt(decimals) + BigInt(paddedFrac || "0");
}

export function fromPlanck(planck: bigint | string, decimals: number): number {
  const value = typeof planck === "string" ? BigInt(planck) : planck;
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  return Number(`${whole}.${frac.toString().padStart(decimals, "0")}`);
}

export function ellipsifyAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

/**
 * Re-encodes an SS58 address to a different network prefix (same underlying public key,
 * different cosmetic display format — e.g. Polkadot mainnet's `1...` vs Paseo's generic `5...`).
 * Returns the address unchanged if it isn't valid SS58 (defensive; shouldn't happen for
 * addresses sourced from a wallet extension).
 */
export function reencodeAddress(address: string, ss58Format: number): string {
  const info = getSs58AddressInfo(address);
  if (!info.isValid) return address;
  return fromBufferToBase58(ss58Format)(info.publicKey);
}

/**
 * Compares two SS58 addresses by their underlying public key rather than their string form,
 * since the same account can be validly encoded with different prefixes (e.g. our re-encoded
 * display address vs. a wallet extension's own raw-format address for the same account).
 */
export function sameAccount(addressA: string, addressB: string): boolean {
  if (addressA === addressB) return true;
  const a = getSs58AddressInfo(addressA);
  const b = getSs58AddressInfo(addressB);
  if (!a.isValid || !b.isValid) return false;
  return (
    a.publicKey.length === b.publicKey.length &&
    a.publicKey.every((byte: number, i: number) => byte === b.publicKey[i])
  );
}

/** Whether a string decodes as a valid SS58 address, regardless of network prefix. */
export function isValidSs58Address(address: string): boolean {
  try {
    return getSs58AddressInfo(address).isValid;
  } catch {
    return false;
  }
}
