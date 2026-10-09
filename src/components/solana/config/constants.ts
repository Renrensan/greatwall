

export const IPOW_NETWORK_ID = 3;
export const SOLANA_NATIVE_MINT = "So11111111111111111111111111111111111111112"
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
export const REMOTE_TOKEN_LOGO_URL = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet";
export const SOL_LOGO = `${REMOTE_TOKEN_LOGO_URL}/${SOLANA_NATIVE_MINT}/logo.png`;
// USDC's logo, at its path in Solana's token-list repo (named by the token's own mint there).
export const USDC_LOGO = `${REMOTE_TOKEN_LOGO_URL}/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png`;
export const SOL_DATA = { id: "sol", symbol: "SOL", name: "Solana", icon: SOL_LOGO, mint: SOLANA_NATIVE_MINT, decimals: 9 };
export const USDC_DATA = { id: "usdc", symbol: "USDC", name: "USD Coin", icon: USDC_LOGO, mint: USDC_MINT_DEVNET, decimals: 6 };
export const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export  const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
export  const NATIVE_STAKE_RENT_FEE = 0.00228288;
