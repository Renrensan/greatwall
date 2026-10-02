"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import OnboardingModal from "@/subcomponents/OnboardingModal";

interface OnboardingContextType {
  startOnboarding: (
    walletAddress: string,
    network?: string,
    initialEmail?: string,
    isReauth?: boolean,
  ) => void;
  closeOnboarding: () => void;
  isOpen: boolean;
  walletAddress: string;
  network?: string;
  initialEmail?: string;
  isReauth?: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState<string | undefined>();
  const [initialEmail, setInitialEmail] = useState<string | undefined>();
  const [isReauth, setIsReauth] = useState<boolean | undefined>();

  const startOnboarding = (
    address: string,
    net?: string,
    email?: string,
    reauth?: boolean,
  ) => {
    setWalletAddress(address);
    setNetwork(net);
    setInitialEmail(email);
    setIsReauth(reauth);
    setIsOpen(true);
  };

  const closeOnboarding = () => {
    setIsOpen(false);
    setWalletAddress("");
    setNetwork(undefined);
    setInitialEmail(undefined);
    setIsReauth(undefined);
  };

  return (
    <OnboardingContext.Provider
      value={{
        startOnboarding,
        closeOnboarding,
        isOpen,
        walletAddress,
        network,
        initialEmail,
        isReauth,
      }}
    >
      {children}
      <OnboardingModal
        isOpen={isOpen}
        onClose={closeOnboarding}
        walletAddress={walletAddress}
        network={network}
        initialEmail={initialEmail}
        isReauth={isReauth}
      />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

