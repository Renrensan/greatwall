
"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { useNetwork } from "@/app/network-provider";
import { zcashnetwork } from "@/index";
import { ZcashWalletContextType, ZcashWalletType } from "./config/type";

const ZcashWalletContext = createContext<ZcashWalletContextType>({} as any);

export function useZcashWallet() {
  return useContext(ZcashWalletContext);
}

export function ZcashProvider({ children }: { children: ReactNode }) {
  const { zcashMainnet } = useNetwork();
  
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState<ZcashWalletType | null>(null);

  const connect = async (wallet: ZcashWalletType) => {
    setIsConnecting(true);
    setTimeout(() => {
        setIsConnecting(false);
        setConnected(true);
        setWalletType(wallet);
        setAddress("t1ZcashStubAddressDoNotUse123456789");
    }, 1000);
  };

  const disconnect = () => {
    setConnected(false);
    setAddress(null);
    setWalletType(null);
  };

  const switchWallet = async (wallet: ZcashWalletType) => {
    disconnect();
    await connect(wallet);
  };

  const checkAddress = (addr: string) => ({ valid: addr.startsWith('t1') || addr.startsWith('zs'), reason: "invalid" as any });
  const isValidAddress = (addr: string) => checkAddress(addr).valid;

  return (
    <ZcashWalletContext.Provider value={{
      connected, address, isConnecting, walletType, availableWallets: ["walletconnect"],
      balance: { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false, tokens: [] },
      estimatedFee: { low: 0, medium: 0, high: 0, selectedFee: "medium", fetched: false },
      currencyTicker: "ZEC", decimals: 8, ipowDecimals: 8, networkName: "Zcash",
      networkDescription: {}, networkLogo: zcashnetwork, price: null, networkExplorer: {},
      ipowConvert: "comingsoon", ipowNetworkId: 99,
      connect, disconnect, switchWallet, checkAddress, isValidAddress,
      estimateBitcoinFromNative: async () => null,
      estimateNativeFromBitcoin: async () => null
    }}>
      {children}
    </ZcashWalletContext.Provider>
  );
}
