export interface NetworkConfig {
  /** Real supported chains use SupportedChain; extra networks for simulation/future use are plain strings. */
  key: string;
  name: string;
  ticker: string;
  /** Iconify icon name. Leave unset and use `image` instead for a chain with no Iconify entry. */
  icon?: string;
  /** Local asset, used instead of `icon` when no Iconify icon exists for this chain. */
  image?: any;
  accentBg: string;
  glowColor: string;
  colorClass: string;
  hooks: {
    en: {
      subline: string;
    };
    id: {
      subline: string;
    };
  };
}

import { hyperliquid } from "@/index";

export const NETWORK_CONFIGS: NetworkConfig[] = [
  {
    key: "solana",
    name: "Solana",
    ticker: "SOL",
    icon: "token-branded:solana",
    accentBg: "from-purple-500/20 via-emerald-500/10 to-transparent",
    glowColor: "#14f195",
    colorClass: "text-solana",
    hooks: {
      en: {
        subline: "Solana is a fast, scalable blockchain for modern apps.",
      },
      id: {
        subline: "Solana adalah blockchain cepat dan skalabel untuk aplikasi modern.",
      },
    },
  },
  {
    key: "bitcoin",
    name: "Bitcoin",
    ticker: "BTC",
    icon: "token-branded:bitcoin",
    accentBg: "from-amber-500/20 via-orange-500/10 to-transparent",
    glowColor: "#f7931a",
    colorClass: "text-bitcoin",
    hooks: {
      en: {
        subline: "Bitcoin runs on the world's most secure Proof-of-Work network.",
      },
      id: {
        subline: "Bitcoin berjalan di jaringan Proof-of-Work paling aman di dunia.",
      },
    },
  },
  {
    key: "ethereum",
    name: "Ethereum",
    ticker: "ETH",
    icon: "token:ethereum",
    accentBg: "from-indigo-500/20 via-blue-500/10 to-transparent",
    glowColor: "#627eea",
    colorClass: "text-ethereum",
    hooks: {
      en: {
        subline: "Ethereum is the foundation for smart contracts and dApps.",
      },
      id: {
        subline: "Ethereum adalah fondasi kontrak pintar dan aplikasi terdesentralisasi.",
      },
    },
  },
  {
    key: "polkadot",
    name: "Polkadot",
    ticker: "DOT",
    icon: "token:polkadot",
    accentBg: "from-pink-500/20 via-rose-500/10 to-transparent",
    glowColor: "#e6007a",
    colorClass: "text-current",
    hooks: {
      en: {
        subline: "Polkadot connects specialized chains that share security as one.",
      },
      id: {
        subline: "Polkadot menghubungkan rantai khusus yang berbagi keamanan bersama.",
      },
    },
  },
  {
    key: "hedera",
    name: "Hedera",
    ticker: "HBAR",
    icon: "token:hedera-hashgraph",
    accentBg: "from-slate-400/20 via-zinc-500/10 to-transparent",
    glowColor: "#a7b2c1",
    colorClass: "text-current",
    hooks: {
      en: {
        subline: "Hedera is a public network built for real-world apps.",
      },
      id: {
        subline: "Hedera adalah jaringan publik yang dibangun untuk aplikasi nyata.",
      },
    },
  },
  {
    key: "tron",
    name: "Tron",
    ticker: "TRX",
    icon: "token-branded:tron",
    accentBg: "from-red-500/20 via-rose-500/10 to-transparent",
    glowColor: "#FF0013",
    colorClass: "text-tron",
    hooks: {
      en: {
        subline: "Tron is the leading network for everyday USDT transfers.",
      },
      id: {
        subline: "Tron adalah jaringan utama untuk transfer USDT sehari-hari.",
      },
    },
  },
  {
    key: "hyperliquid",
    name: "Hyperliquid",
    ticker: "HYPE",
    // No Iconify icon exists for Hyperliquid — NetworkHero/NetworkIndicators render `image`
    // via next/image instead when `icon` is unset.
    image: hyperliquid,
    accentBg: "from-emerald-400/20 via-teal-400/10 to-transparent",
    glowColor: "#0F3933",
    colorClass: "text-hyperliquid",
    hooks: {
      en: {
        subline: "Hyperliquid is a high-performance L1 with Ethereum-compatible smart contracts.",
      },
      id: {
        subline: "Hyperliquid adalah L1 berperforma tinggi dengan smart contract setara Ethereum.",
      },
    },
  },
  {
    key: "robinhood",
    name: "Robinhood",
    ticker: "ETH",
    icon: "token-branded:robinhood",
    accentBg: "from-green-500/20 via-lime-500/10 to-transparent",
    glowColor: "#CCFF00",
    colorClass: "text-robinhood",
    hooks: {
      en: {
        subline: "Robinhood Chain is an Arbitrum L2 for tokenized stocks and real-world assets.",
      },
      id: {
        subline: "Robinhood Chain adalah L2 Arbitrum untuk saham dan aset dunia nyata yang di-tokenisasi.",
      },
    },
  },
  {
    key: "base",
    name: "Base",
    ticker: "ETH",
    icon: "token-branded:base",
    accentBg: "from-blue-500/20 via-indigo-500/10 to-transparent",
    glowColor: "#0052FF",
    // "base" literally collides with Tailwind's own text-base (font-size) utility, so this
    // uses an arbitrary-value class instead of the usual text-${key} pattern — see globals.css.
    colorClass: "text-[#0052FF]",
    hooks: {
      en: {
        subline: "Base is Coinbase's secure, low-cost Ethereum L2 for everyday onchain apps.",
      },
      id: {
        subline: "Base adalah L2 Ethereum milik Coinbase yang aman dan berbiaya rendah untuk aplikasi onchain sehari-hari.",
      },
    },
  },
  {
    key: "arbitrum",
    name: "Arbitrum",
    ticker: "ETH",
    icon: "token-branded:arbitrum",
    accentBg: "from-sky-500/20 via-blue-400/10 to-transparent",
    glowColor: "#28A0F0",
    colorClass: "text-arbitrum",
    hooks: {
      en: {
        subline: "Arbitrum is a leading Ethereum L2, built on Optimistic Rollup technology.",
      },
      id: {
        subline: "Arbitrum adalah salah satu L2 Ethereum terdepan, dibangun dengan teknologi Optimistic Rollup.",
      },
    },
  },
];

export const PAGE_STRINGS = {
  en: {
    welcome: "Start with Para",
    subtitle: "Select your first network to begin your Web3 journey.",
    cta: "Get started with",
    subCta: "Self-custody · Direct to your wallet",
    swipeHint: "Swipe to explore",
    bubble: "Select Network to Start!",
  },
  id: {
    welcome: "Mulai dengan Para",
    subtitle: "Pilih jaringan pertama Anda untuk memulai Web3.",
    cta: "Mulai dengan",
    subCta: "Self-custody · Langsung ke wallet Anda",
    swipeHint: "Geser untuk jelajahi",
    bubble: "Pilih Jaringan untuk Mulai!",
  },
};
