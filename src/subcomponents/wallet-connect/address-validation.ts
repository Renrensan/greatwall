/** Which specific rule a recipient address fails — lets the UI show a specific,
 * actionable message instead of a single generic "invalid address" string.
 * `null` means the address is valid. */
export type AddressErrorReason =
  | "wrong-prefix"
  | "invalid-characters"
  /** Fixed-length formats (e.g. Ethereum's 42 chars) where under and
   * over show the same message either way. */
  | "wrong-length"
  /** Variable-length formats (Bitcoin, Solana) where under vs. over need
   * different messages. */
  | "too-short"
  | "too-long"
  | "invalid"
  | null;

export type AddressCheckResult = {
  valid: boolean;
  /** null when valid; otherwise which rule failed. */
  reason: AddressErrorReason;
};

export type ValidatableNetwork = "bitcoin" | "ethereum" | "solana" | "tempo" | "hyperliquid" | "robinhood" | "base" | "arbitrum";

/**
 * Maps a network + failure reason to the specific, existing translation key
 * that describes it — reusing the original per-network messages rather than
 * a single generic fallback, so the interactive feedback stays specific.
 */
const REASON_MESSAGE_KEYS: Record<ValidatableNetwork, Partial<Record<NonNullable<AddressErrorReason>, string>>> = {
  bitcoin: {
    "wrong-prefix": "text133",
    "invalid-characters": "text15",
    "too-short": "text16",
    "too-long": "text17",
    invalid: "text306",
  },
  ethereum: {
    "wrong-prefix": "text136",
    "invalid-characters": "text138",
    "wrong-length": "text137",
    invalid: "text307",
  },
  solana: {
    "invalid-characters": "text139",
    "too-short": "text141",
    "too-long": "text308",
    invalid: "text308",
  },
  tempo: {
    "wrong-prefix": "text333",
    "wrong-length": "text334",
    "invalid-characters": "text335",
    invalid: "text335",
  },
  hyperliquid: {
    "wrong-prefix": "text336",
    "wrong-length": "text337",
    "invalid-characters": "text338",
    invalid: "text339",
  },
  robinhood: {
    "wrong-prefix": "text340",
    "wrong-length": "text341",
    "invalid-characters": "text342",
    invalid: "text343",
  },
  base: {
    "wrong-prefix": "text344",
    "wrong-length": "text345",
    "invalid-characters": "text346",
    invalid: "text347",
  },
  arbitrum: {
    "wrong-prefix": "text350",
    "wrong-length": "text351",
    "invalid-characters": "text352",
    invalid: "text353",
  },
};

export function getAddressErrorMessageKey(network: ValidatableNetwork, reason: AddressErrorReason): string {
  if (!reason) return "";
  return REASON_MESSAGE_KEYS[network][reason] ?? "text305";
}
