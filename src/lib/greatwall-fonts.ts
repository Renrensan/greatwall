import { Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";

/** Headlines & hierarchy — see .agents/brand-guidelines.md */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

/** Body, buttons, UI — self-hosted; see .agents/brand-guidelines.md */
export const bdoGrotesk = localFont({
  src: [
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-DemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../assets/fonts/bdo-grotesk/BDOGrotesk-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-bdo-grotesk",
  display: "swap",
});

export const greatwallFontClassNames = `${instrumentSerif.variable} ${bdoGrotesk.variable}`;
