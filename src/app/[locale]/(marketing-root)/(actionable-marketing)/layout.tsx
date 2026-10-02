import Navbar from "@/subcomponents/Navbar";
import { AllDappProviders } from "@/components/providers/dapp-providers";
import GradualBlur from "@/marketing-components/GradualBlur";

export default function ActionableMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AllDappProviders (not SolanaDappProviders): Navbar renders here as a sibling of
  // {children}, not inside it, so any per-route provider a child page nests around its own
  // content (e.g. buy-bitcoin wrapping just its page in BitcoinProvider) never reaches the
  // Navbar above it — its wallet-connect button and network icon would read a separate,
  // disconnected default context instead of the page's real connection state. Mounting every
  // chain provider once, here, is what buy-and-stake-usdc already relied on implicitly for
  // Solana; it costs nothing extra for a wallet nobody's connected to.
  return (
    <AllDappProviders>
      <Navbar forceShow={true} />
      <main className="relative min-h-screen overflow-hidden">
        <div className="relative z-10">{children}</div>

        <GradualBlur
          target="page"
          position="bottom"
          height="4rem"
          strength={2}
          divCount={5}
          curve="bezier"
          exponential
          zIndex={10}
          opacity={1}
        />
      </main>
    </AllDappProviders>
  );
}
