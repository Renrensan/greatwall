import { PublicKey } from "@solana/web3.js";
import betaIdl from "../solana-beta/idl.json";


export const BETA_PROGRAM_ID = new PublicKey(betaIdl.address);
export const BETA_MINT_ADDRESS = new PublicKey("J6dQhh7RwR6YEccB8zcyfednwGNXjvEeyuT5ZPSda64r");
export const PYTH_RECEIVER_ID = new PublicKey("rec5EKMGg6Mz7uFZUw3vK2eQqFAnzX1PjXGvN5XnawL");


export const RAW_MINTS = {
  cbbtc: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
  vt:    "XsEdDDTcVGJU6nvdRdVnj53eKTrsCkvtrVfXGmUK68V",
  spy:   "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
  qqq:   "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ",
  iemg:  "XsFnZawJdLdXfBSEt5Vw29K5vdBiHotdPLjUPafpfHs",
  gld:   "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re",
  usdc:  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};


export const mints = {
  beta:  BETA_MINT_ADDRESS,
  cbbtc: new PublicKey(RAW_MINTS.cbbtc),
  usdc:  new PublicKey(RAW_MINTS.usdc),
  vt:    new PublicKey(RAW_MINTS.vt),
  spy:   new PublicKey(RAW_MINTS.spy),
  qqq:   new PublicKey(RAW_MINTS.qqq),
  iemg:  new PublicKey(RAW_MINTS.iemg),
  gld:   new PublicKey(RAW_MINTS.gld),
};

export const PORTFOLIO_WEIGHTS = [
  { mint: RAW_MINTS.cbbtc, pct: 0.15 }, 
  { mint: RAW_MINTS.vt,    pct: 0.30 }, 
  { mint: RAW_MINTS.spy,   pct: 0.15 },
  { mint: RAW_MINTS.qqq,   pct: 0.10 },
  { mint: RAW_MINTS.iemg,  pct: 0.05 }, 
  { mint: RAW_MINTS.gld,   pct: 0.15 },
  { mint: RAW_MINTS.usdc,  pct: 0.10 },
];

export const FEED_IDS = {
  gld   : "e190f467043db04548200354889dfe0d9d314c08b8d4e62fabf4d5a3140fecca", // Equity.US.GLD/USD
  cbbtc : "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", // Crypto.BTC/USD
  iemg  : "96b1207c795f31283f5e44c527a1db18cacfb68de745a0de326611b0b5af3fc3", // Equity.US.IEMG/USD
  qqq   : "9695e2b96ea7b3859da9ed25b7a46a920a776e2fdae19a7bcfdf2b219230452d", // Equity.US.QQQ/USD
  spy   : "19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5", // Equity.US.SPY/USD
  vt    : "b167b163565d841b1477cb942bf3b2d28214f3eedf343de7536d6e5b6250d45b", // Equity.US.VT/USD
  usdc  : "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a", // Crypto.USDC/USD
};