"use client";

import { StaticImageData } from "next/image";
import { useTranslations } from "next-intl";
import { WalletListItem } from "./WalletListItem";
import { WalletStoreLinks, resolveWalletInstallTarget } from "./wallet-install-links";
import { WalletBrowseLinkBuilder, isMobileUserAgent } from "./wallet-browse-links";

/** A not-detected wallet's row in a connect sheet.
 *
 * On mobile, when the wallet publishes an official "open in my in-app browser" Universal
 * Link (`browseLink`), the row shows no label at all — just the icon and name, same as a
 * detected one — because tapping it always does the right thing on its own: the OS opens
 * the wallet app straight to this page if it's installed (where its injected provider then
 * works normally), or the same link just loads the wallet's own website, which shows its
 * own install page, if it isn't. There's no "not detected" state to label here since we
 * never actually know which of those two will happen until the tap.
 *
 * Without a `browseLink` (desktop, or a wallet with no verified deep-link format), this
 * falls back to the plain "Install"/"Get the app" row pointing at the wallet's store page. */
export function WalletInstallItem({
  icon,
  name,
  links,
  browseLink,
}: {
  icon: StaticImageData;
  name: string;
  links: WalletStoreLinks;
  browseLink?: WalletBrowseLinkBuilder;
}) {
  const t = useTranslations("All");
  const install = resolveWalletInstallTarget(links);
  if (install.kind === "desktop-only") return null;

  if (browseLink && isMobileUserAgent() && install.target === "mobile-app") {
    return (
      <WalletListItem
        icon={icon}
        name={name}
        onClick={() => {
          window.location.href = browseLink(window.location.href);
        }}
      />
    );
  }

  return (
    <WalletListItem
      icon={icon}
      name={name}
      actionLabel={install.target === "mobile-app" ? t("text312") : t("text311")}
      onClick={() => window.open(install.url, "_blank", "noopener,noreferrer")}
    />
  );
}
