'use client'

import dynamic from 'next/dynamic'
import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react'

const PolkadotConnectButton = dynamic(() => import('@/subcomponents/PolkadotConnectButton').then(m => m.PolkadotConnectButton), { ssr: false })
const BitcoinConnectButton = dynamic(() => import('@/subcomponents/BitcoinConnectButton').then(m => m.BitcoinConnectButton), { ssr: false })
const EthereumConnectButton = dynamic(() => import('@/subcomponents/EthereumConnectButton').then(m => m.EthereumConnectButton), { ssr: false })
const SolanaConnectButton = dynamic(() => import('@/subcomponents/SolanaConnectButton').then(m => m.SolanaConnectButton), { ssr: false })
const HederaConnectButton = dynamic(() => import('@/subcomponents/HederaConnectButton').then(m => m.HederaConnectButton), { ssr: false })
const TronConnectButton = dynamic(() => import('@/subcomponents/TronConnectButton').then(m => m.TronConnectButton), { ssr: false })
const HyperliquidConnectButton = dynamic(() => import('@/subcomponents/HyperliquidConnectButton').then(m => m.HyperliquidConnectButton), { ssr: false })
const RobinhoodConnectButton = dynamic(() => import('@/subcomponents/RobinhoodConnectButton').then(m => m.RobinhoodConnectButton), { ssr: false })
const BaseConnectButton = dynamic(() => import('@/subcomponents/BaseConnectButton').then(m => m.BaseConnectButton), { ssr: false })
const ArbitrumConnectButton = dynamic(() => import('@/subcomponents/ArbitrumConnectButton').then(m => m.ArbitrumConnectButton), { ssr: false })

export type SupportedChain = 'polkadot' | 'bitcoin' | 'hedera' | 'ethereum' | 'solana' | 'tron' | 'hyperliquid' | 'robinhood' | 'base' | 'arbitrum'

export const SUPPORTED_CHAINS: SupportedChain[] = ['polkadot', 'bitcoin', 'hedera', 'ethereum', 'solana', 'tron', 'hyperliquid', 'robinhood', 'base', 'arbitrum']
export const DEFAULT_CHAIN: SupportedChain = 'solana'
const PREFERRED_CHAIN_KEY = 'preferred-default-chain'

/** Exported so pages outside the [network] route tree (e.g. marketing pages,
 * which NetworkProvider doesn't wrap) can still read the preference directly
 * without needing the full context. */
export function getPreferredChain(): SupportedChain {
  if (typeof window === 'undefined') return DEFAULT_CHAIN
  const saved = localStorage.getItem(PREFERRED_CHAIN_KEY)
  return saved && SUPPORTED_CHAINS.includes(saved as SupportedChain) ? (saved as SupportedChain) : DEFAULT_CHAIN
}

export function hasPreferredChain(): boolean {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem(PREFERRED_CHAIN_KEY)
  return Boolean(saved && SUPPORTED_CHAINS.includes(saved as SupportedChain))
}

export function savePreferredChain(chain: SupportedChain) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PREFERRED_CHAIN_KEY, chain)
  document.cookie = `${PREFERRED_CHAIN_KEY}=${chain}; path=/; max-age=31536000; samesite=lax`
}

interface NetworkContextType {
  selectedChain: SupportedChain
  setSelectedChain: (chain: SupportedChain) => void

  /** The network that opens by default when Paradapp is launched fresh (no
   *  network segment in the URL yet) — set via the Select Preferences UI. */
  preferredChain: SupportedChain
  setPreferredChain: (chain: SupportedChain) => void

  polkadotMainnet: boolean
  setPolkadotMainnet: (val: boolean) => void
  bitcoinMainnet: boolean
  setBitcoinMainnet: (val: boolean) => void
  hederaMainnet: boolean
  setHederaMainnet: (val: boolean) => void
  ethereumMainnet: boolean
  setEthereumMainnet: (val: boolean) => void
  solanaMainnet: boolean
  setSolanaMainnet: (val: boolean) => void
  tronMainnet: boolean
  setTronMainnet: (val: boolean) => void
  hyperliquidMainnet: boolean
  setHyperliquidMainnet: (val: boolean) => void
  robinhoodMainnet: boolean
  setRobinhoodMainnet: (val: boolean) => void
  baseMainnet: boolean
  setBaseMainnet: (val: boolean) => void
  arbitrumMainnet: boolean
  setArbitrumMainnet: (val: boolean) => void

  /** Generic accessor for code that looks up an arbitrary/dynamic chain (e.g. a switch
   *  over `network`), instead of hardcoding which of the named fields above to read. */
  isMainnet: (chain: SupportedChain) => boolean
  setMainnet: (chain: SupportedChain, val: boolean) => void
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined)

export function useNetwork() {
  const context = useContext(NetworkContext)
  if (!context) throw new Error("useNetwork must be used within a NetworkProvider")
  return context
}

export function NetworkProvider({ children, initialChain }: { children: ReactNode; initialChain?: SupportedChain }) {

  // `initialChain` (the URL's own network segment, via useParams — safe on both server
  // and client) takes priority over `getPreferredChain()` (localStorage-only, so it always
  // falls back to DEFAULT_CHAIN during SSR) — otherwise selectedChain would start wrong on
  // every server-rendered page and only self-correct after client hydration, flashing the
  // wrong network's color in the navbar until it does.
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(() => initialChain ?? getPreferredChain())
  const [preferredChain, setPreferredChainState] = useState<SupportedChain>(() => getPreferredChain())

  const setPreferredChain = (chain: SupportedChain) => {
    setPreferredChainState(chain)
    savePreferredChain(chain)
  }

  const [networkModes, setNetworkModes] = useState<Record<SupportedChain, boolean>>(() => {
    const defaults = {
      polkadot: true,
      bitcoin: true,
      hedera: true,
      ethereum: true,
      solana: true,
      tron: true,
      hyperliquid: true,
      robinhood: true,
      base: true,
      arbitrum: true,
    }

    if (typeof window === 'undefined') return defaults

    try {
      const saved = localStorage.getItem('network-modes-isolated')
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults
    } catch (e) {
      console.error("Failed to parse network modes", e)
      return defaults
    }
  })


  useEffect(() => {
    if (initialChain && initialChain !== selectedChain) {
      setSelectedChain(initialChain);
    }
  }, [initialChain]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected-chain-isolated', selectedChain)
    }
  }, [selectedChain])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('network-modes-isolated', JSON.stringify(networkModes))
    }
  }, [networkModes])


  const updateNetwork = (chain: SupportedChain, val: boolean) => {
    setNetworkModes((prev) => ({
      ...prev,
      [chain]: val,
    }))
  }

  
  const value = useMemo(() => ({
    selectedChain,
    setSelectedChain,

    preferredChain,
    setPreferredChain,

    polkadotMainnet: networkModes.polkadot,
    setPolkadotMainnet: (val: boolean) => updateNetwork('polkadot', val),

    bitcoinMainnet: networkModes.bitcoin,
    setBitcoinMainnet: (val: boolean) => updateNetwork('bitcoin', val),
    
    hederaMainnet: networkModes.hedera,
    setHederaMainnet: (val: boolean) => updateNetwork('hedera', val),
    
    ethereumMainnet: networkModes.ethereum,
    setEthereumMainnet: (val: boolean) => updateNetwork('ethereum', val),
    
    solanaMainnet: networkModes.solana,
    setSolanaMainnet: (val: boolean) => updateNetwork('solana', val),

    tronMainnet: networkModes.tron,
    setTronMainnet: (val: boolean) => updateNetwork('tron', val),

    hyperliquidMainnet: networkModes.hyperliquid,
    setHyperliquidMainnet: (val: boolean) => updateNetwork('hyperliquid', val),

    robinhoodMainnet: networkModes.robinhood,
    setRobinhoodMainnet: (val: boolean) => updateNetwork('robinhood', val),

    baseMainnet: networkModes.base,
    setBaseMainnet: (val: boolean) => updateNetwork('base', val),

    arbitrumMainnet: networkModes.arbitrum,
    setArbitrumMainnet: (val: boolean) => updateNetwork('arbitrum', val),

    isMainnet: (chain: SupportedChain) => networkModes[chain],
    setMainnet: updateNetwork,
  }), [selectedChain, preferredChain, networkModes])

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  )
}

export function DynamicConnectButton({ 
  isOpen, 
  setIsOpen 
}: { 
  isOpen?: boolean; 
  setIsOpen?: (b: boolean) => void 
}) {
  const { selectedChain } = useNetwork()

  switch (selectedChain) {
    case 'polkadot':
      return <PolkadotConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'bitcoin':
      return <BitcoinConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'ethereum':
      return <EthereumConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'solana':
      return <SolanaConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'hedera':
      return <HederaConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'tron':
      return <TronConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'hyperliquid':
      return <HyperliquidConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'robinhood':
      return <RobinhoodConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'base':
      return <BaseConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    case 'arbitrum':
      return <ArbitrumConnectButton isOpen={isOpen} setIsOpen={setIsOpen} />
    default:
      return null
  }
}