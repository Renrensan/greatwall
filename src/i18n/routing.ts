import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "id"],

  // Used when no locale matches
  defaultLocale: "id",

  // custom pathnames
  pathnames: {
    "/landing-usdc": {
      en: "/buy-usdc-and-earn-yield",
      id: "/beli-usdc-dan-dapat-bunga",
    },
    "/learn-blockchain": {
      en: "/learn-blockchain",
      id: "/belajar-blockchain",
    },
  },
});
