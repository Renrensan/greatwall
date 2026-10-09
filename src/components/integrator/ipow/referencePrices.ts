// Reference prices, in dollars per whole token, of Greatwall's mock RWA
// tokens on the test networks: the market price of the real asset each
// stands in for, as the operator node prices them (node/node.testnet.yml
// in the iPoW repo: sats per token at a hundredth of the market, so dollars
// = sats / 10). The test tokens have no market of their own; these let the
// Create page show what an index's parts are worth and set a part by its
// share. Keyed by symbol: the same asset is priced alike on every network.

export const REFERENCE_USD: Record<string, number> = {
  // Ethereum (Sepolia)
  AAPL: 230, TSLA: 430, NVDA: 180, GOLD: 4000,
  XAUT: 4000, STRCx: 100, IVVon: 650, QQQon: 600, NVDAon: 180, SLVon: 45, IEFAon: 90, AMDon: 160, SOFIon: 25, HIMSon: 50,
  VTIon: 320, IEMGon: 65,
  // Base
  GLDY: 1, JTRSY: 1, AUDD: 0.7, JSPXA: 100, JSPX: 100, bTSLA: 430, USTBL: 1.1, wtNKE: 70, "AMZN.d": 220, wtMCD: 300, GLDx: 370,
  // Robinhood
  USDG: 1, SPYr: 650, NVDAr: 180, SPCXr: 200, METAr: 700, COINr: 300, USOr: 75, GMEr: 25, PLTRr: 180, SGOVr: 100,
  // Hyperliquid
  thBILL: 1, USDH: 1, GMEx: 25, MUx: 180, USDHL: 1, SKHYx: 300, NBISx: 100, IWMx: 240, CRWVx: 120, SPYx: 650,
  // Arbitrum
  rINTC: 35, rMSTR: 330, rMU: 180, rMRNA: 28, rOKLO: 100, PGOLD: 4000, rDRAM: 30, rSPY: 650, rSNDK: 120, rTSM: 290, cbBTC: 100000,
  // Solana
  ONyc: 1, MSTRx: 330, CRCLx: 120, TSLAx: 430, GOOGLx: 250, SPCXx: 200, QQQx: 600, HOODx: 120,
  // Tempo
  EURC: 1.17, USDY: 1.1, syrupUSDC: 1.12,
  // Tempo's fee token, a US dollar stablecoin.
  pathUSD: 1,
};
