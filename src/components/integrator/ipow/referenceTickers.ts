// The real asset each Greatwall token stands for, as a price-history source
// can name it, for the indexes' past performance (/api/history): a stock,
// ETF, future or currency pair on Yahoo Finance (dividend-adjusted, so
// total return), a coin on CoinGecko, or a dollar token, held at $1 and
// growing at its reference yield (referenceYields.ts). A token with no
// public price (SpaceX, a Korean-listed stock, a fund too new) is left out,
// and an index holding one shows no performance rather than a guess.

export type Ticker = { yahoo: string } | { coingecko: string } | { dollar: true } | { euro: true };

export const REFERENCE_TICKER: Record<string, Ticker> = {
  // Coins.
  BTC: { coingecko: "bitcoin" },
  cbBTC: { coingecko: "bitcoin" },
  ETH: { coingecko: "ethereum" },
  SOL: { coingecko: "solana" },
  HYPE: { coingecko: "hyperliquid" },
  // Gold and silver.
  XAUT: { yahoo: "GC=F" },
  PGOLD: { yahoo: "GC=F" },
  GOLD: { yahoo: "GC=F" },
  GLDx: { yahoo: "GLD" },
  SLVon: { yahoo: "SLV" },
  // Funds and indexes.
  IVVon: { yahoo: "IVV" },
  QQQon: { yahoo: "QQQ" },
  QQQx: { yahoo: "QQQ" },
  VTIon: { yahoo: "VTI" },
  IEMGon: { yahoo: "IEMG" },
  IEFAon: { yahoo: "IEFA" },
  SPYr: { yahoo: "SPY" },
  SPYx: { yahoo: "SPY" },
  rSPY: { yahoo: "SPY" },
  JSPXA: { yahoo: "SPY" },
  JSPX: { yahoo: "SPY" },
  IWMx: { yahoo: "IWM" },
  USOr: { yahoo: "USO" },
  SGOVr: { yahoo: "SGOV" },
  // Stocks.
  AAPL: { yahoo: "AAPL" },
  TSLA: { yahoo: "TSLA" },
  bTSLA: { yahoo: "TSLA" },
  TSLAx: { yahoo: "TSLA" },
  NVDA: { yahoo: "NVDA" },
  NVDAon: { yahoo: "NVDA" },
  NVDAr: { yahoo: "NVDA" },
  STRCx: { yahoo: "STRC" },
  AMDon: { yahoo: "AMD" },
  SOFIon: { yahoo: "SOFI" },
  HIMSon: { yahoo: "HIMS" },
  wtNKE: { yahoo: "NKE" },
  "AMZN.d": { yahoo: "AMZN" },
  wtMCD: { yahoo: "MCD" },
  METAr: { yahoo: "META" },
  COINr: { yahoo: "COIN" },
  GMEr: { yahoo: "GME" },
  GMEx: { yahoo: "GME" },
  PLTRr: { yahoo: "PLTR" },
  MUx: { yahoo: "MU" },
  rMU: { yahoo: "MU" },
  NBISx: { yahoo: "NBIS" },
  CRWVx: { yahoo: "CRWV" },
  rINTC: { yahoo: "INTC" },
  rMSTR: { yahoo: "MSTR" },
  MSTRx: { yahoo: "MSTR" },
  rMRNA: { yahoo: "MRNA" },
  rOKLO: { yahoo: "OKLO" },
  rSNDK: { yahoo: "SNDK" },
  rTSM: { yahoo: "TSM" },
  CRCLx: { yahoo: "CRCL" },
  GOOGLx: { yahoo: "GOOGL" },
  HOODx: { yahoo: "HOOD" },
  // Currencies other than the dollar.
  EURC: { euro: true },
  AUDD: { yahoo: "AUDUSD=X" },
  // Dollar tokens: $1, growing at their reference yield where they have one.
  USDG: { dollar: true },
  USDH: { dollar: true },
  USDHL: { dollar: true },
  pathUSD: { dollar: true },
  JTRSY: { dollar: true },
  USTBL: { dollar: true },
  GLDY: { dollar: true },
  thBILL: { dollar: true },
  USDY: { dollar: true },
  syrupUSDC: { dollar: true },
  ONyc: { dollar: true },
};

/** The history source's key for a ticker: what /api/history is asked for. */
export const sourceKey = (t: Ticker): string =>
  "yahoo" in t ? `y:${t.yahoo}` : "coingecko" in t ? `c:${t.coingecko}` : "euro" in t ? "y:EURUSD=X" : "dollar";

/** Every source key the app may ask for: /api/history serves only these. */
export const SOURCE_KEYS = new Set(Object.values(REFERENCE_TICKER).map(sourceKey).filter((k) => k !== "dollar"));
