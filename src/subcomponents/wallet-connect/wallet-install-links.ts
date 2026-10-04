/**
 * Verified real install destinations for wallets shared across multiple chains' connect
 * sheets (Phantom: Solana/Ethereum/Bitcoin; MetaMask: Ethereum/Hedera) — each vendor's own
 * official download hub, confirmed by fetching the page itself. `website` is deliberately a
 * single link rather than separate Chrome/Firefox store URLs: these download hubs already
 * detect the visitor's browser and surface the right install button themselves, so there's
 * no need to sniff the user agent and guess a specific store listing on our end.
 */
export type WalletStoreLinks = { website: string; ios?: string; android?: string };

export const PHANTOM_INSTALL_LINKS: WalletStoreLinks = {
  website: "https://phantom.com/download",
  ios: "https://apps.apple.com/app/phantom-crypto-wallet/id1598432977",
  android: "https://play.google.com/store/apps/details?id=app.phantom",
};

export const METAMASK_INSTALL_LINKS: WalletStoreLinks = {
  website: "https://metamask.io/download/",
  ios: "https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202",
  android: "https://play.google.com/store/apps/details?id=io.metamask",
};

export const XVERSE_INSTALL_LINKS: WalletStoreLinks = {
  website: "https://www.xverse.app/download",
  ios: "https://apps.apple.com/app/xverse-bitcoin-web3-wallet/id1552272513",
  android: "https://play.google.com/store/apps/details?id=com.secretkeylabs.xverse",
};

export type WalletInstallTarget =
  | { kind: "store"; url: string; target: "mobile-app" | "browser-extension" }
  | { kind: "desktop-only" };

/**
 * Resolves where an "install this wallet" row should send the user — the real App
 * Store/Play Store listing on mobile (which itself shows "Open" instead of "Get" when the
 * app is already installed, so this covers the install-or-open behavior without needing an
 * unverified custom `wallet://` deep link), or the wallet's own official download page on
 * desktop, which handles picking the right browser build itself.
 */
export function resolveWalletInstallTarget(links: WalletStoreLinks): WalletInstallTarget {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return links.ios ? { kind: "store", url: links.ios, target: "mobile-app" } : { kind: "desktop-only" };
  }
  if (/Android/i.test(ua)) {
    return links.android ? { kind: "store", url: links.android, target: "mobile-app" } : { kind: "desktop-only" };
  }
  return { kind: "store", url: links.website, target: "browser-extension" };
}
