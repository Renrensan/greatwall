export const MARINADE_USDC_VAULT = "2TNCzzYJt3uHmpFpqeeJkza4pQUK9xoLa79DJH9AdgGA";
export const PARADAPP_MARINANDE_FEE = 0.005;
export const SOL_TOKEN_ICON = "token:sol";
export const USDC_TOKEN_ICON = "formkit:usdc";
export const MIN_SOL_LAMPORTS = 50_000_000;
// Lowered from 5.0 — network/ATA rent costs are now itemized and charged separately (see
// computeUsdcFeeBreakdown in marinade-stake.ts) rather than relying on the flat platform
// percentage alone to cover them, so there's no longer a technical reason to require a
// larger minimum just to make the fee "worth it" for the relayer.
export const MIN_USDC_AMOUNT = 1.0;
export const MIN_CLAIM_REWARD_USDC = 1.0; 
export const MARINADE_ALT_ADDRESS = "3PvnvzdVTCk8CFHCvePDVfpfZi8uGeX7rpD6fhLxhRvV";
export const ESTIMATED_NETWORK_FEE_LAMPORTS = 15_000; 
// Was previously a wrong/fabricated address ("mSoLz6xHDyN43m3m2zG69D1g5L36p4Q7f1854n2g557")
// — same vanity "mSoLz" prefix as the real mint but a completely different address after
// that, so checkAtaRequired(address, MSOL_MINT) was checking whether the user had an ATA
// for a token they could never actually hold, always reporting an ATA was needed even when
// their real mSOL account already existed. Verified against Marinade's own SDK README
// (its documented address-lookup-table entries).
export const MSOL_MINT = "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So";
