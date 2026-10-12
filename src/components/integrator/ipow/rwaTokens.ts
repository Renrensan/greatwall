// The mock RWA tokens of each test network, as deployed from the iPoW repo
// (evm/deployments/<network>-testnet-rwa.json and
// solana/testnet-rwa.json, 2026-10-05): stand-ins for
// real tokenized assets (rwa.xyz), named "<asset> (<test network> Greatwall)"
// or, on Solana, "(GW Devnet)" (Solana's Token Metadata allows 32 bytes), with no backing, for converting and for locking
// into BETA. Greatwall's server faucet sends them, paying the fee: on EVM
// from its faucet wallet's stock (/api/faucet/[chain]), falling back to the
// token's own `faucet()`; on Solana it mints as the mint authority
// (/api/faucet/solana). The logos are served from public/assets/rwa; an
// ERC-20 has no image on chain (see /api/tokenlist and "Add to wallet"),
// a Solana mint's Token Metadata points at public/assets/rwa/solana/<symbol>.json.

import type { SupportedChain } from "@/app/network-provider";

export type RwaToken = {
  chain: SupportedChain;
  symbol: string;
  name: string;
  /** The ERC-20 address, or the SPL mint. */
  token: string;
  decimals: number;
  /** What one faucet claim gives, in whole tokens. */
  faucet: number;
  /** The logo, a path under public/ (served at that path, and in the token list). */
  logo?: string;
  /** The real tokenized asset this stands in for, on rwa.xyz. */
  about?: string;
  /** What the real asset is, in a line. */
  description?: string;
};

export const RWA_TOKENS: Partial<Record<SupportedChain, RwaToken[]>> = {
  ethereum: [
    { chain: "ethereum", symbol: "XAUT", name: "Tether Gold (Sepolia Greatwall)", token: "0x1a7bd06F30b7ED12f6C698b0B3a289eBB379aaC9", decimals: 18, faucet: 1, logo: "/assets/rwa/XAUT.png", about: "https://app.rwa.xyz/assets/XAUT", description: "Tether's gold token: each one backed by one troy ounce of physical gold." },
    { chain: "ethereum", symbol: "STRCx", name: "Strategy PP Variable xStock (Sepolia Greatwall)", token: "0xB364813e60dB761FCF7FebFa9b1caD062797a9D6", decimals: 18, faucet: 5, logo: "/assets/rwa/STRCx.png", about: "https://app.rwa.xyz/assets/STRCx", description: "Backed Finance's xStock of Strategy's STRC variable-rate perpetual preferred stock." },
    { chain: "ethereum", symbol: "IVVon", name: "iShares Core S&P 500 ETF (Ondo) (Sepolia Greatwall)", token: "0x866D9360E35c3DaE8B1ad98aeCC729647C093852", decimals: 18, faucet: 5, logo: "/assets/rwa/IVVon.png", about: "https://app.rwa.xyz/assets/IVVon", description: "Ondo's tokenized iShares Core S&P 500 ETF: the 500 largest US companies." },
    { chain: "ethereum", symbol: "QQQon", name: "Invesco QQQ (Ondo) (Sepolia Greatwall)", token: "0x6c472F0404179BE1985D92C759Fd9293252Ab858", decimals: 18, faucet: 5, logo: "/assets/rwa/QQQon.png", about: "https://app.rwa.xyz/assets/QQQon", description: "Ondo's tokenized Invesco QQQ ETF: the Nasdaq-100." },
    { chain: "ethereum", symbol: "NVDAon", name: "NVIDIA (Ondo) (Sepolia Greatwall)", token: "0xE8F52D763CF87154DC443fa36F9f6D65f44CCaE0", decimals: 18, faucet: 5, logo: "/assets/rwa/NVDAon.png", about: "https://app.rwa.xyz/assets/NVDAon", description: "Ondo's tokenized NVIDIA stock." },
    { chain: "ethereum", symbol: "SLVon", name: "iShares Silver Trust (Ondo) (Sepolia Greatwall)", token: "0xc22Ca2B75825cE64a3937F155698C968848d9645", decimals: 18, faucet: 5, logo: "/assets/rwa/SLVon.png", about: "https://app.rwa.xyz/assets/SLVon", description: "Ondo's tokenized iShares Silver Trust: physical silver." },
    { chain: "ethereum", symbol: "IEFAon", name: "iShares Core MSCI EAFE ETF (Ondo) (Sepolia Greatwall)", token: "0x3baaC1a56A8431fea5d0ee0636f285d4F996Bc4C", decimals: 18, faucet: 5, logo: "/assets/rwa/IEFAon.png", about: "https://app.rwa.xyz/assets/IEFAon", description: "Ondo's tokenized iShares Core MSCI EAFE ETF: developed markets outside North America." },
    { chain: "ethereum", symbol: "AMDon", name: "AMD (Ondo) (Sepolia Greatwall)", token: "0x04b4Cfe08b2C79fFeBc083E5e7091CfAC142c201", decimals: 18, faucet: 5, logo: "/assets/rwa/AMDon.png", about: "https://app.rwa.xyz/assets/AMDon", description: "Ondo's tokenized AMD stock." },
    { chain: "ethereum", symbol: "SOFIon", name: "SoFi Technologies (Ondo) (Sepolia Greatwall)", token: "0xA83EE721F0f398A920f4c35Eb04aa244d2c5d1fC", decimals: 18, faucet: 5, logo: "/assets/rwa/SOFIon.png", about: "https://app.rwa.xyz/assets/SOFIon", description: "Ondo's tokenized SoFi Technologies stock." },
    { chain: "ethereum", symbol: "HIMSon", name: "Hims & Hers Health (Ondo) (Sepolia Greatwall)", token: "0x2c8b859ff059554ff363dED4a484062E247E03BC", decimals: 18, faucet: 5, logo: "/assets/rwa/HIMSon.png", about: "https://app.rwa.xyz/assets/HIMSon", description: "Ondo's tokenized Hims & Hers Health stock." },
    // 2026-10-06, for Greatwall's index; the address is filled by scripts/sync-rwa.mjs once deployed.
    { chain: "ethereum", symbol: "VTIon", name: "Vanguard Total Stock Market ETF (Ondo) (Sepolia Greatwall)", token: "0x0082296c24D2c994DC6DC5DEa74e77ddFC0A0895", decimals: 18, faucet: 5, logo: "/assets/rwa/VTIon.png", about: "https://app.rwa.xyz/assets/VTIon", description: "Ondo's tokenized Vanguard Total Stock Market ETF: the whole US stock market." },
    { chain: "ethereum", symbol: "IEMGon", name: "iShares Core MSCI Emerging Markets ETF (Ondo) (Sepolia Greatwall)", token: "0xb934E173e34e8F3e9e6E6B2F7A901B75c9D8C7F8", decimals: 18, faucet: 5, logo: "/assets/rwa/IEMGon.png", about: "https://app.rwa.xyz/assets/IEMGon", description: "Ondo's tokenized iShares Core MSCI Emerging Markets ETF: large and mid-size companies of emerging markets." },
  ],
  base: [
    { chain: "base", symbol: "GLDY", name: "Streamex GLDY (Base Sepolia Greatwall)", token: "0xbc653e8dB02870f0562231BA55E6f4F182cAaF4c", decimals: 18, faucet: 5, logo: "/assets/rwa/base/GLDY.png", about: "https://app.rwa.xyz/assets/GLDY", description: "Streamex's gold-backed yield token." },
    { chain: "base", symbol: "JTRSY", name: "Janus Henderson Treasury Fund (Base Sepolia Greatwall)", token: "0x1FB8F1986E4a484d8A0E6b4F281A3066B8166a3d", decimals: 18, faucet: 100, logo: "/assets/rwa/base/JTRSY.png", about: "https://app.rwa.xyz/assets/JTRSY", description: "Janus Henderson's tokenized US Treasury fund (Anemoy), a dollar yield." },
    { chain: "base", symbol: "AUDD", name: "Australian Digital Dollar (Base Sepolia Greatwall)", token: "0x2Cb59E06223ADdb03C7565b62b37FA834809BC77", decimals: 18, faucet: 100, logo: "/assets/rwa/base/AUDD.png", about: "https://app.rwa.xyz/assets/AUDD", description: "The Australian Digital Dollar: a stablecoin backed by Australian dollars." },
    { chain: "base", symbol: "JSPXA", name: "Janus Henderson S&P500 Fund (Base Sepolia Greatwall)", token: "0xD8fC94eCa1cf8b7F227d8AD0e624ACAe5e997Ad4", decimals: 18, faucet: 5, logo: "/assets/rwa/base/JSPXA.png", about: "https://app.rwa.xyz/assets/JSPXA", description: "Janus Henderson's tokenized S&P 500 fund." },
    { chain: "base", symbol: "JSPX", name: "S&P 500 DeFi (Centrifuge) (Base Sepolia Greatwall)", token: "0x3980adc2E7D776a5e8E264Aed684c9a43E736D5e", decimals: 18, faucet: 5, logo: "/assets/rwa/base/JSPX.png", about: "https://app.rwa.xyz/assets/JSPX", description: "Centrifuge's S&P 500 DeFi fund: the index, on chain." },
    { chain: "base", symbol: "bTSLA", name: "Backed Tesla Inc (Base Sepolia Greatwall)", token: "0xd8e8c41817760cf312559dce320b5c5E0AaFecc1", decimals: 18, faucet: 5, logo: "/assets/rwa/base/bTSLA.png", about: "https://app.rwa.xyz/assets/bTSLA", description: "Backed Finance's tokenized Tesla stock." },
    { chain: "base", symbol: "USTBL", name: "Spiko US T-Bills Money Market Fund (Base Sepolia Greatwall)", token: "0xce8DF6A9CbCE4c98c33B2ca8843cA57B8839e22d", decimals: 18, faucet: 100, logo: "/assets/rwa/base/USTBL.png", about: "https://app.rwa.xyz/assets/USTBL", description: "Spiko's US T-Bills money market fund: a dollar yield." },
    { chain: "base", symbol: "wtNKE", name: "Wrapped NIKE, Inc. ST0x (Base Sepolia Greatwall)", token: "0xbf869aa1EAb77acdAF5419CD18C3c2d0A60A019a", decimals: 18, faucet: 5, logo: "/assets/rwa/base/wtNKE.png", about: "https://app.rwa.xyz/assets/wtNKE", description: "ST0x's wrapped tokenized Nike stock." },
    { chain: "base", symbol: "AMZN.d", name: "Amazon.com, Inc. Common Stock (Base Sepolia Greatwall)", token: "0x763d74652203aab8341914D99C0C102640FcBb9E", decimals: 18, faucet: 5, logo: "/assets/rwa/base/AMZN.d.png", about: "https://app.rwa.xyz/assets/AMZN.d", description: "Dinari's tokenized Amazon stock." },
    { chain: "base", symbol: "wtMCD", name: "Wrapped McDonald's Corporation ST0x (Base Sepolia Greatwall)", token: "0x36BA462fF711C7261C4894Af40E5f0c49C98b280", decimals: 18, faucet: 5, logo: "/assets/rwa/base/wtMCD.png", about: "https://app.rwa.xyz/assets/wtMCD", description: "ST0x's wrapped tokenized McDonald's stock." },
    { chain: "base", symbol: "GLDx", name: "Gold xStock (Base Sepolia Greatwall)", token: "0x5a7Af423913dbB082BaCEBF3c0Daac52789b1F4A", decimals: 18, faucet: 5, logo: "/assets/rwa/base/GLDx.png", about: "https://app.rwa.xyz/assets/GLDx", description: "Backed Finance's xStock of the SPDR Gold Shares ETF: physical gold." },
  ],
  robinhood: [
    { chain: "robinhood", symbol: "USDG", name: "Global Dollar (Robinhood Testnet Greatwall)", token: "0x01BE560A22e91201C9414b634f0a61085F84dD08", decimals: 18, faucet: 100, logo: "/assets/rwa/robinhood/USDG.png", about: "https://app.rwa.xyz/assets/USDG", description: "Global Dollar: Paxos's US dollar stablecoin." },
    { chain: "robinhood", symbol: "SPYr", name: "SPDR S&P 500 ETF Trust Robinhood Token (Robinhood Testnet Greatwall)", token: "0xCA39c4e5d4f938A380E61475bF4CeF8D1B7d6190", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/SPYr.png", about: "https://app.rwa.xyz/assets/SPDRSP500ETFTrust.Robinhood", description: "Robinhood's token of the SPDR S&P 500 ETF Trust." },
    { chain: "robinhood", symbol: "NVDAr", name: "NVIDIA Robinhood Token (Robinhood Testnet Greatwall)", token: "0x07eFF65A853f36cBA8FEFbC495eb6A0D98d26a75", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/NVDAr.png", about: "https://app.rwa.xyz/assets/NVIDIA.Robinhood", description: "Robinhood's token of NVIDIA stock." },
    { chain: "robinhood", symbol: "SPCXr", name: "SpaceX Class A Common Stock Robinhood Token (Robinhood Testnet Greatwall)", token: "0x6c692BEdCa89292D0FEfc6e86b82f451E371f11D", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/SPCXr.png", about: "https://app.rwa.xyz/assets/SpaceX.Robinhood", description: "Robinhood's token tracking SpaceX Class A shares, a private company." },
    { chain: "robinhood", symbol: "METAr", name: "Meta Platforms Robinhood Token (Robinhood Testnet Greatwall)", token: "0xB75ABD27218B2b31ABb5B0F61F11a107377bEA06", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/METAr.png", about: "https://app.rwa.xyz/assets/MetaPlatforms.Robinhood", description: "Robinhood's token of Meta Platforms stock." },
    { chain: "robinhood", symbol: "COINr", name: "Coinbase Robinhood Token (Robinhood Testnet Greatwall)", token: "0x525D70BBc90149345a171F5E308C923A4B8b109A", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/COINr.png", about: "https://app.rwa.xyz/assets/Coinbase.Robinhood", description: "Robinhood's token of Coinbase stock." },
    { chain: "robinhood", symbol: "USOr", name: "United States Oil Fund Robinhood Token (Robinhood Testnet Greatwall)", token: "0xeF3A9120a087cf5795a60BB2e9FfF15b8E35c69e", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/USOr.png", about: "https://app.rwa.xyz/assets/UnitedStatesOilFund.Robinhood", description: "Robinhood's token of the United States Oil Fund: crude oil futures." },
    { chain: "robinhood", symbol: "GMEr", name: "GameStop Robinhood Token (Robinhood Testnet Greatwall)", token: "0x1bF2c8784e5e801BeAb042791fE161156e771B66", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/GMEr.png", about: "https://app.rwa.xyz/assets/GameStop.Robinhood", description: "Robinhood's token of GameStop stock." },
    { chain: "robinhood", symbol: "PLTRr", name: "Palantir Technologies Robinhood Token (Robinhood Testnet Greatwall)", token: "0x3Fc561125a24C7Bb02f1edd1f8F773e16185799f", decimals: 18, faucet: 5, logo: "/assets/rwa/robinhood/PLTRr.png", about: "https://app.rwa.xyz/assets/PalantirTechnologies.Robinhood", description: "Robinhood's token of Palantir Technologies stock." },
    { chain: "robinhood", symbol: "SGOVr", name: "iShares 0-3 Month Treasury Bond Robinhood Token (Robinhood Testnet Greatwall)", token: "0xdfB626fA52Ef04EAf2DfC4fA30e9B3d7E5fA90DC", decimals: 18, faucet: 100, logo: "/assets/rwa/robinhood/SGOVr.png", about: "https://app.rwa.xyz/assets/iShares03MonthTreasuryBondETF.Robinhood", description: "Robinhood's token of the iShares 0-3 Month Treasury Bond ETF: a dollar yield." },
  ],
  hyperliquid: [
    { chain: "hyperliquid", symbol: "thBILL", name: "Theo Short Duration US Treasury Fund (HyperEVM Testnet Greatwall)", token: "0xbc653e8dB02870f0562231BA55E6f4F182cAaF4c", decimals: 18, faucet: 100, logo: "/assets/rwa/hyperliquid/thBILL.png", about: "https://app.rwa.xyz/assets/thBILL", description: "Theo's short-duration US Treasury fund: a dollar yield from T-bills." },
    { chain: "hyperliquid", symbol: "USDH", name: "USDH (HyperEVM Testnet Greatwall)", token: "0xDaB99518afF82db3c16ad748B56884238bb2C5C5", decimals: 18, faucet: 100, logo: "/assets/rwa/hyperliquid/USDH.png", about: "https://app.rwa.xyz/assets/USDH", description: "Hyperliquid's native US dollar stablecoin, issued by Native Markets." },
    { chain: "hyperliquid", symbol: "GMEx", name: "Gamestop xStock (HyperEVM Testnet Greatwall)", token: "0xC034e3Fc38E88D12922A285D09470510d320a200", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/GMEx.png", about: "https://app.rwa.xyz/assets/GMEx", description: "Backed Finance's xStock of GameStop stock." },
    { chain: "hyperliquid", symbol: "MUx", name: "Micron Technology xStock (HyperEVM Testnet Greatwall)", token: "0xCeee90F921AA994B837B97B4886c1A2AE56b2550", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/MUx.png", about: "https://app.rwa.xyz/assets/MUx", description: "Backed Finance's xStock of Micron Technology stock." },
    { chain: "hyperliquid", symbol: "USDHL", name: "Hyper USD (HyperEVM Testnet Greatwall)", token: "0x8965958BC61220d8add02E227437Fa363E21D96f", decimals: 18, faucet: 100, logo: "/assets/rwa/hyperliquid/USDHL.png", about: "https://app.rwa.xyz/assets/USDHL", description: "Hyper USD: a US dollar stablecoin on HyperEVM." },
    { chain: "hyperliquid", symbol: "SKHYx", name: "SK hynix xStock (HyperEVM Testnet Greatwall)", token: "0xE101001bD62451c6f3337f44EF2cC4F166dd891D", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/SKHYx.png", about: "https://app.rwa.xyz/assets/SKHYx", description: "Backed Finance's xStock of SK hynix stock." },
    { chain: "hyperliquid", symbol: "NBISx", name: "Nebius xStock (HyperEVM Testnet Greatwall)", token: "0xFcbF76B91dDebbee0c21d808B26a9Fb8fcC0ca94", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/NBISx.png", about: "https://app.rwa.xyz/assets/NBISx", description: "Backed Finance's xStock of Nebius Group stock." },
    { chain: "hyperliquid", symbol: "IWMx", name: "Russell 2000 xStock (HyperEVM Testnet Greatwall)", token: "0x1E5da6001764bB4e76321FD90Dfaf626cA1f3A83", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/IWMx.png", about: "https://app.rwa.xyz/assets/IWMx", description: "Backed Finance's xStock of the iShares Russell 2000 ETF: US small caps." },
    { chain: "hyperliquid", symbol: "CRWVx", name: "CoreWeave xStock (HyperEVM Testnet Greatwall)", token: "0xda238E5F844d01554b1A9F2342F733A8205d0586", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/CRWVx.png", about: "https://app.rwa.xyz/assets/CRWVx", description: "Backed Finance's xStock of CoreWeave stock." },
    { chain: "hyperliquid", symbol: "SPYx", name: "SP500 xStock (HyperEVM Testnet Greatwall)", token: "0x48aA89dcB9355016c2010426f99d4c44D65281e9", decimals: 18, faucet: 5, logo: "/assets/rwa/hyperliquid/SPYx.png", about: "https://app.rwa.xyz/assets/SPYx", description: "Backed Finance's xStock of the SPDR S&P 500 ETF: the 500 largest US companies." },
  ],
  // Arbitrum (network 9, D141), 2026-10-06: addresses filled by
  // scripts/sync-rwa.mjs once deployed.
  arbitrum: [
    { chain: "arbitrum", symbol: "rINTC", name: "Intel Reality (Arbitrum Sepolia Greatwall)", token: "0x4265A27605cDd45b69d36f17635Bad03351387e6", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rINTC.png", about: "https://app.rwa.xyz/assets/rINTC", description: "Reality's token of Intel stock." },
    { chain: "arbitrum", symbol: "rMSTR", name: "MicroStrategy Reality (Arbitrum Sepolia Greatwall)", token: "0x75A1ADc3a4194f580eeCCa5473197Ff32414d2C1", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rMSTR.png", about: "https://app.rwa.xyz/assets/rMSTR", description: "Reality's token of Strategy (MicroStrategy) stock." },
    { chain: "arbitrum", symbol: "rMU", name: "Micron Technology Reality (Arbitrum Sepolia Greatwall)", token: "0x525D70BBc90149345a171F5E308C923A4B8b109A", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rMU.png", about: "https://app.rwa.xyz/assets/rMU", description: "Reality's token of Micron Technology stock." },
    { chain: "arbitrum", symbol: "rMRNA", name: "Moderna Reality (Arbitrum Sepolia Greatwall)", token: "0xE101001bD62451c6f3337f44EF2cC4F166dd891D", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rMRNA.png", about: "https://app.rwa.xyz/assets/rMRNA", description: "Reality's token of Moderna stock." },
    { chain: "arbitrum", symbol: "rOKLO", name: "Oklo Inc Reality (Arbitrum Sepolia Greatwall)", token: "0xbf869aa1EAb77acdAF5419CD18C3c2d0A60A019a", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rOKLO.png", about: "https://app.rwa.xyz/assets/rOKLO", description: "Reality's token of Oklo stock." },
    { chain: "arbitrum", symbol: "PGOLD", name: "Pleasing Gold (Arbitrum Sepolia Greatwall)", token: "0x51d0bc4CE62Fa394242415d0DAa167A5AF6Bb45B", decimals: 18, faucet: 1, logo: "/assets/rwa/arbitrum/PGOLD.png", about: "https://app.rwa.xyz/assets/PGOLD", description: "Pleasing's gold token, backed by physical gold." },
    { chain: "arbitrum", symbol: "rDRAM", name: "Roundhill Memory ETF Reality (Arbitrum Sepolia Greatwall)", token: "0xB6C7e5Db33F34D86102C8Df0AcACAd7052699162", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rDRAM.png", about: "https://app.rwa.xyz/assets/rDRAM", description: "Reality's token of the Roundhill Memory ETF." },
    { chain: "arbitrum", symbol: "rSPY", name: "SPDR S&P 500 ETF Reality (Arbitrum Sepolia Greatwall)", token: "0xE610e70B799b3d169BeA946a9029655226985805", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rSPY.png", about: "https://app.rwa.xyz/assets/rSPY", description: "Reality's token of the SPDR S&P 500 ETF: the 500 largest US companies." },
    { chain: "arbitrum", symbol: "rSNDK", name: "SanDisk Reality (Arbitrum Sepolia Greatwall)", token: "0x966Afd06E991A771F5f64DFf032465E42C02769D", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rSNDK.png", about: "https://app.rwa.xyz/assets/rSNDK", description: "Reality's token of SanDisk stock." },
    { chain: "arbitrum", symbol: "rTSM", name: "Taiwan Semiconductor Reality (Arbitrum Sepolia Greatwall)", token: "0xEB4CF40eFFbec1758b0Fa6a6CC4b4E5a2091b1cF", decimals: 18, faucet: 5, logo: "/assets/rwa/arbitrum/rTSM.png", about: "https://app.rwa.xyz/assets/rTSM", description: "Reality's token of Taiwan Semiconductor (TSMC) stock." },
    { chain: "arbitrum", symbol: "cbBTC", name: "Coinbase Wrapped BTC (Arbitrum Sepolia Greatwall)", token: "0x5cE276280542817547D075a51E6A0B563FF5D9c8", decimals: 18, faucet: 0.01, logo: "/assets/rwa/arbitrum/cbBTC.png", about: "https://app.rwa.xyz/assets/cbBTC", description: "Coinbase's wrapped bitcoin: each one backed by one bitcoin Coinbase holds." },
  ],
  tempo: [
    { chain: "tempo", symbol: "EURC", name: "EURC (Tempo Testnet Greatwall)", token: "0x15390C4901e11D3732489825c2FBa33A2E3e5b37", decimals: 18, faucet: 100, logo: "/assets/rwa/tempo/EURC.png", about: "https://app.rwa.xyz/assets/EURC", description: "Circle's euro stablecoin." },
    { chain: "tempo", symbol: "USDY", name: "Ondo U.S. Dollar Yield (Tempo Testnet Greatwall)", token: "0xf35A1C4A9dE7B7FffF62c7cEfda2ac91a71cB6cc", decimals: 18, faucet: 100, logo: "/assets/rwa/tempo/USDY.png", about: "https://app.rwa.xyz/assets/USDY", description: "Ondo's US Dollar Yield token: a dollar backed by Treasuries, accruing yield." },
    { chain: "tempo", symbol: "syrupUSDC", name: "Syrup USDC (Tempo Testnet Greatwall)", token: "0x4cFD981522F31A4dc12Aeb433907ebc3CBD37A55", decimals: 18, faucet: 100, logo: "/assets/rwa/tempo/syrupUSDC.png", about: "https://app.rwa.xyz/assets/syrupUSDC", description: "Maple's Syrup USDC: USDC lent to institutional borrowers, accruing yield." },
  ],
  solana: [
    { chain: "solana", symbol: "ONyc", name: "OnRe Reinsurance (GW Devnet)", token: "3Rz3KnHk5TFecwkjn5iUVNgSmNxscT5k1VaJskP8Y5i1", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/ONyc.png", about: "https://app.rwa.xyz/assets/ONyc", description: "OnRe's tokenized reinsurance yield: returns from a pool of reinsurance contracts." },
    { chain: "solana", symbol: "MSTRx", name: "MicroStrategy xStock (GW Devnet)", token: "CuJKX2cCGbjRztMMKPDmtRtxPsi33siXSmDvum4aWHDG", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/MSTRx.png", about: "https://app.rwa.xyz/assets/MSTRx", description: "Backed Finance's xStock of Strategy (MicroStrategy) stock." },
    { chain: "solana", symbol: "CRCLx", name: "Circle xStock (GW Devnet)", token: "23EfYUXxaUuhQUeYHFwCvWQGJcQ5J7voFjXLE7nAqzHx", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/CRCLx.png", about: "https://app.rwa.xyz/assets/CRCLx", description: "Backed Finance's xStock of Circle Internet Group stock." },
    { chain: "solana", symbol: "SPYx", name: "SP500 xStock (GW Devnet)", token: "5DPmBfTHyvrgWsFzLL8mTTE7C8Aw8dWYb3eiijZcwkvw", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/SPYx.png", about: "https://app.rwa.xyz/assets/SPYx", description: "Backed Finance's xStock of the SPDR S&P 500 ETF." },
    { chain: "solana", symbol: "TSLAx", name: "Tesla xStock (GW Devnet)", token: "Ds6YjJDgHNSbCNu3fJXR7JhK2KKHr69t9NttxurPBZ2x", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/TSLAx.png", about: "https://app.rwa.xyz/assets/TSLAx", description: "Backed Finance's xStock of Tesla stock." },
    { chain: "solana", symbol: "GLDx", name: "Gold xStock (GW Devnet)", token: "ED4i81SD8b5PwCJiSW3mU5VmeTuAgFVEBx4Kzi21d8rf", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/GLDx.png", about: "https://app.rwa.xyz/assets/GLDx", description: "Backed Finance's xStock of the SPDR Gold Shares ETF: physical gold." },
    { chain: "solana", symbol: "GOOGLx", name: "Alphabet xStock (GW Devnet)", token: "H5jmGEmxJ1rt6CdwUXfoj5euBE4ZLWXuBQKsgPjJD7e4", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/GOOGLx.png", about: "https://app.rwa.xyz/assets/GOOGLx", description: "Backed Finance's xStock of Alphabet (Google) stock." },
    { chain: "solana", symbol: "SPCXx", name: "SpaceX xStock (GW Devnet)", token: "FEzJpUCA5JXs3uEfc94Gx9CebP4UHAeeTuonNSB49kha", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/SPCXx.png", about: "https://app.rwa.xyz/assets/SPCXx", description: "Backed Finance's xStock tracking SpaceX, a private company." },
    { chain: "solana", symbol: "QQQx", name: "Nasdaq xStock (GW Devnet)", token: "GoZFcM4moGyWh8Tr41Y3LiR1p7JYo6ZgUebxp8gy1Mvx", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/QQQx.png", about: "https://app.rwa.xyz/assets/QQQx", description: "Backed Finance's xStock of the Invesco QQQ ETF: the Nasdaq-100." },
    { chain: "solana", symbol: "HOODx", name: "Robinhood xStock (GW Devnet)", token: "DYMkgJF2GLeWrgbx4wWE5FBzKURL5CKqaPAD9mcAEgBs", decimals: 9, faucet: 5, logo: "/assets/rwa/solana/HOODx.png", about: "https://app.rwa.xyz/assets/HOODx", description: "Backed Finance's xStock of Robinhood Markets stock." },
  ],
};

/** A network's tokens that are deployed: one listed ahead of its deployment
 *  has no address yet and is left out. */
export const rwaTokensOf = (chain: SupportedChain): RwaToken[] => (RWA_TOKENS[chain] ?? []).filter((t) => t.token !== "");

/** The token a new index starts with on the Create page: the network's
 *  S&P 500 token where it has one, else its first test token. Not the
 *  network's coin, which the operator's fast path carries in small amounts
 *  only; the coin stays one pick away. */
const STARTER = ["SPYx", "IVVon", "JSPX", "rSPY", "SPYr", "EURC"];
export const starterTokenOf = (chain: SupportedChain): RwaToken | null => {
  const list = rwaTokensOf(chain);
  return STARTER.map((s) => list.find((t) => t.symbol === s)).find(Boolean) ?? list[0] ?? null;
};
