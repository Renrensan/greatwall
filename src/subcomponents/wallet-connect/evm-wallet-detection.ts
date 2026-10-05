export type EIP6963ProviderInfo = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
};

export type EIP6963ProviderDetail = {
  info: EIP6963ProviderInfo;
  provider: any;
};

/**
 * Discovers injected EVM wallets via EIP-6963 (Multi Injected Provider Discovery). This
 * exists because self-reported flags like `isMetaMask`/`isPhantom` on `window.ethereum`
 * aren't reliable: Phantom (and others) deliberately set `isMetaMask: true` on the
 * `window.ethereum` object they inject, for compatibility with dapps that only ever check
 * that flag — sometimes without also setting `isPhantom` on that same object, so excluding
 * `isPhantom` isn't always enough to unmask it. EIP-6963 providers self-identify via a
 * `rdns` (reverse-DNS) id announced on a separate channel from that legacy compatibility
 * shim, so it isn't subject to the same spoofing. Both Ethereum's and Hedera's providers
 * (both EVM-based) share this.
 */
export function discoverEip6963Providers(timeoutMs = 300): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const found = new Map<string, EIP6963ProviderDetail>();

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      if (detail?.info?.uuid) found.set(detail.info.uuid, detail);
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}

function findEip6963Provider(
  providers: EIP6963ProviderDetail[],
  match: (rdnsLowercase: string) => boolean,
): EIP6963ProviderDetail | undefined {
  return providers.find((p) => match(p.info.rdns.toLowerCase()));
}

/**
 * Resolves the actual injected provider object for a given EVM wallet, preferring EIP-6963's
 * spoof-resistant `rdns` identity and only falling back to legacy `isMetaMask`/`isPhantom`
 * flag-guessing when nothing on the page supports EIP-6963 at all. If EIP-6963 discovery did
 * find providers but none matched, that's treated as a real "not found" rather than falling
 * through to the very flags that can't be trusted — a masquerading legacy `window.ethereum`
 * is exactly the case EIP-6963 exists to see through.
 */
export async function getEvmWalletProvider(
  wallet: "metamask" | "phantom",
  eip6963Providers?: EIP6963ProviderDetail[],
): Promise<any> {
  if (typeof window === "undefined") return null;

  const providers = eip6963Providers ?? (await discoverEip6963Providers());

  if (wallet === "phantom") {
    const viaEip6963 = findEip6963Provider(providers, (rdns) => rdns.includes("phantom"));
    if (viaEip6963) return viaEip6963.provider;
    return (window as any).phantom?.ethereum ?? null;
  }

  const viaEip6963 = findEip6963Provider(
    providers,
    (rdns) => rdns.includes("metamask") && !rdns.includes("phantom"),
  );
  if (viaEip6963) return viaEip6963.provider;
  if (providers.length > 0) return null;

  const eth = (window as any).ethereum;
  if (eth?.providers?.length) {
    return eth.providers.find((p: any) => p.isMetaMask && !p.isPhantom) || null;
  }
  return eth?.isMetaMask && !eth?.isPhantom ? eth : null;
}

/** Same resolution logic as getEvmWalletProvider, reduced to presence booleans for UI gating. */
export async function detectEvmWallets(): Promise<{ metamask: boolean; phantom: boolean }> {
  if (typeof window === "undefined") return { metamask: false, phantom: false };

  const eip6963Providers = await discoverEip6963Providers();
  const [metamaskProvider, phantomProvider] = await Promise.all([
    getEvmWalletProvider("metamask", eip6963Providers),
    getEvmWalletProvider("phantom", eip6963Providers),
  ]);
  return { metamask: !!metamaskProvider, phantom: !!phantomProvider };
}

/** The wallet's own error code (EIP-1193: 4001 rejected, 4902 chain not
 *  added), whether it comes bare or wrapped by ethers (`error.error`,
 *  `error.info.error`) or by MetaMask (`data.originalError`). */
export function walletErrorCode(e: any): number | undefined {
  for (const c of [e?.code, e?.error?.code, e?.info?.error?.code, e?.data?.originalError?.code, e?.error?.data?.originalError?.code])
    if (typeof c === "number") return c;
  return undefined;
}

/** Whether the wallet's user declined a prompt. */
export const walletRejected = (e: any): boolean => walletErrorCode(e) === 4001 || e?.code === "ACTION_REJECTED";
