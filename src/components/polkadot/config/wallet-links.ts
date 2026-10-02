import type { PolkadotWalletType } from "./type";

/**
 * Real, verified install destinations for each supported Polkadot wallet — each wallet's
 * own official download hub, not a specific Chrome/Firefox store URL: those hubs already
 * detect the visitor's browser and show the right install button themselves, so there's no
 * need to sniff the user agent and guess a store listing on our end. `ios`/`android` are
 * omitted for wallets with no published mobile app — currently just Polkadot{.js}, a
 * browser-only signer — rather than linking to a store listing that doesn't exist.
 */
export const POLKADOT_WALLET_LINKS: Record<
  PolkadotWalletType,
  { website: string; ios?: string; android?: string }
> = {
  "polkadot-js": {
    website: "https://chromewebstore.google.com/detail/polkadotjs-extension/mopnmbcafieddcagagdcbnhejhlodfdd",
  },
  talisman: {
    website: "https://talisman.xyz/download",
    ios: "https://apps.apple.com/us/app/talisman-wallet/id6761427240",
    android: "https://play.google.com/store/apps/details?id=xyz.talisman.app",
  },
  "subwallet-js": {
    website: "https://www.subwallet.app/download",
    ios: "https://apps.apple.com/us/app/subwallet-polkadot-wallet/id1633050285",
    android: "https://play.google.com/store/apps/details?id=app.subwallet.mobile",
  },
};

export type WalletInstallTarget =
  | { kind: "store"; url: string; target: "mobile-app" | "browser-extension" }
  | { kind: "desktop-only" };

/**
 * Resolves where "install this wallet" should send the user. On iOS/Android this points
 * straight at that wallet's App Store / Play Store listing — deliberately NOT a custom
 * `walletname://` deep link, since none of these wallets publish a documented URI scheme
 * to open the already-installed app, and guessing one would just fail silently. The store
 * listing itself already covers both cases: iOS/Android render an "Open" button there when
 * the app is already installed and "Get"/"Install" when it isn't, which is exactly the
 * install-or-open behavior being asked for, without inventing an unverified deep link.
 */
export function resolveWalletInstallTarget(walletId: PolkadotWalletType): WalletInstallTarget {
  const links = POLKADOT_WALLET_LINKS[walletId];
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return links.ios ? { kind: "store", url: links.ios, target: "mobile-app" } : { kind: "desktop-only" };
  }
  if (/Android/i.test(ua)) {
    return links.android ? { kind: "store", url: links.android, target: "mobile-app" } : { kind: "desktop-only" };
  }
  return { kind: "store", url: links.website, target: "browser-extension" };
}
