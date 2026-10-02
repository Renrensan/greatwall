/**
 * Each wallet's official "open this URL inside my in-app browser" Universal Link (iOS) /
 * App Link (Android) — plain HTTPS links to the wallet's own domain, not a custom
 * `wallet://` scheme. The OS opens the installed app straight to our page (where the
 * wallet's injected provider then works exactly like the desktop extension) if it's
 * installed; if it isn't, the same link just loads the wallet's own website, which handles
 * showing its install page itself. That means one link covers both "open" and "install"
 * without us needing to detect which one will happen, or fabricate a scheme/timeout guess.
 *
 * Sources:
 * - Phantom: https://docs.phantom.com/phantom-deeplinks/other-methods/browse
 * - MetaMask: https://github.com/MetaMask/metamask-deeplinks/blob/master/js/index.js
 * - Xverse: https://docs.xverse.app/sats-connect/guides/mobile-integration
 * - SubWallet: no public docs page — format lives in deeplink.subwallet.app's own
 *   generator bundle (js/main.*.js)
 */
export type WalletBrowseLinkBuilder = (targetUrl: string) => string;

function currentOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

export const PHANTOM_BROWSE_LINK: WalletBrowseLinkBuilder = (targetUrl) =>
  `https://phantom.app/ul/browse/${encodeURIComponent(targetUrl)}?ref=${encodeURIComponent(currentOrigin())}`;

export const METAMASK_BROWSE_LINK: WalletBrowseLinkBuilder = (targetUrl) =>
  `https://metamask.app.link/dapp/${targetUrl.replace(/^https?:\/\//, "")}`;

export const XVERSE_BROWSE_LINK: WalletBrowseLinkBuilder = (targetUrl) =>
  `https://connect.xverse.app/browser?url=${encodeURIComponent(targetUrl)}`;

export const SUBWALLET_BROWSE_LINK: WalletBrowseLinkBuilder = (targetUrl) =>
  `https://mobile.subwallet.app/browser?url=${encodeURIComponent(targetUrl)}`;

export function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}
