"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ChatWithChatbot,
  GetChatHistory,
  SyncChatGreeting,
  AppendChatMessage,
} from "./server-action/chatbot.action";
import { getChatSessionId } from "./utils/para-ai-session";
import { BitcoinProvider, useBitcoinWallet } from "@/components/bitcoin/bitcoin-provider";
import { HederaProvider, useHederaWallet } from "@/components/hedera/hedera-provider";
import { EthereumProvider, useEthereumWallet } from "@/components/ethereum/ethereum-provider";
import { SolanaProvider, useSolanaWallet } from "@/components/solana/solana-provider";
import { PolkadotProvider, usePolkadotWallet } from "@/components/polkadot/polkadot-provider";
import { TronProvider, useTronWallet } from "@/components/tron/tron-provider";
import { HyperliquidProvider, useHyperliquidWallet } from "@/components/hyperliquid/hyperliquid-provider";
import { RobinhoodProvider, useRobinhoodWallet } from "@/components/robinhood/robinhood-provider";
import { BaseProvider, useBaseWallet } from "@/components/base/base-provider";
import { ArbitrumProvider, useArbitrumWallet } from "@/components/arbitrum/arbitrum-provider";
import { useNetwork } from "@/app/network-provider";
import { OnboardingProvider, useOnboarding } from "@/components/providers/onboarding-provider";
import { savePendingTransaction } from "@/lib/onboarding-storage";
import { useChatbotContext } from "./chatbot-context";
import {
  SOLANA_NATIVE_MINT,
  USDC_MINT,
  USDT_MINT,
  GLD_MINT,
} from "@/components/solana/config/constants";

const LEGACY_BANK_CODES: Record<string, string> = {
  "014": "ID_BCA",
  "009": "ID_BNI",
  "002": "ID_BRI",
  "008": "ID_MANDIRI",
  "013": "ID_PERMATA",
};

const formatMessageText = (
  text: string,
  currentLocale: string = "en",
  onNavigate?: (href: string) => void,
) => {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const boldItalicRegex = /(\*\*\*.*?\*\*\*)/g;
  const boldRegex = /(\*\*.*?\*\*)/g;
  const italicRegex = /(\*.*?\*)/g;

  let parts: (string | React.ReactNode)[] = [text];

  // Parse Markdown links [Label](href)
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const elements: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const regex = new RegExp(markdownLinkRegex);
    while ((match = regex.exec(part)) !== null) {
      if (match.index > lastIndex) {
        elements.push(part.slice(lastIndex, match.index));
      }
      const label = match[1];
      let href = match[2];

      const isInternal = href.startsWith("/");
      if (isInternal) {
        href = href.replace(/\/\//g, "/");
        const segments = href.split("/").filter(Boolean);
        if (segments[0] !== currentLocale && segments[0] !== "en" && segments[0] !== "id") {
          href = `/${currentLocale}${href}`;
        }
      }

      elements.push(
        <a
          key={`md-link-${match.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 dark:text-blue-400 font-medium underline break-all hover:text-blue-600 cursor-pointer"
        >
          {label}
        </a>
      );
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < part.length) {
      elements.push(part.slice(lastIndex));
    }
    return elements;
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    return part.split(urlRegex).map((seg, i) =>
      urlRegex.test(seg) ? (
        <a
          key={`link-${i}`}
          href={seg}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 dark:text-blue-400 underline break-all"
        >
          {seg}
        </a>
      ) : (
        seg
      ),
    );
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    return part.split(boldItalicRegex).map((seg, i) => {
      if (seg.startsWith("***") && seg.endsWith("***")) {
        return (
          <strong key={`bi-${i}`}>
            <em>{seg.slice(3, -3)}</em>
          </strong>
        );
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    return part.split(boldRegex).map((seg, i) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        return <strong key={`b-${i}`}>{seg.slice(2, -2)}</strong>;
      }
      return seg;
    });
  });

  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    return part.split(italicRegex).map((seg, i) => {
      if (seg.startsWith("*") && seg.endsWith("*")) {
        return <em key={`i-${i}`}>{seg.slice(1, -1)}</em>;
      }
      return seg;
    });
  });

  return parts;
};

interface Message {
  sender: "user" | "bot" | "operator";
  text: string;
  likes?: number;
  intention?: any | null;
  execution_blueprint?: any | null;
  isConfirmation?: boolean;
  isResolved?: boolean;
  resolutionStatus?: "executed" | "cancelled";
}

const ChatbotInner = ({
  isExpanded,
  setIsExpanded,
}: {
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const t = useTranslations("All");
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastReportedRef = useRef<string | null>(null);
  const pendingConnectionRef = useRef<boolean>(false);
  const pendingModeChangeRef = useRef<boolean>(false);
  const pendingConnectAfterSwitch = useRef<{
    network: string;
    walletType: string;
  } | null>(null);
  const intentionRef = useRef<any>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  const chatbotRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSentStateRef = useRef<string>("");

  const locale = useLocale();
  const btcState = useBitcoinWallet();
  const hederaState = useHederaWallet();
  const ethState = useEthereumWallet();
  const solanaState = useSolanaWallet();
  const polkadotState = usePolkadotWallet();
  const tronState = useTronWallet();
  const hyperliquidState = useHyperliquidWallet();
  const robinhoodState = useRobinhoodWallet();
  const baseState = useBaseWallet();
  const arbitrumState = useArbitrumWallet();
  const networkState = useNetwork();
  const { startOnboarding } = useOnboarding();

  const [bankMethods, setBankMethods] = useState<any[]>([]);

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const res = await fetch("/api/transaction/method");
        const json = await res.json();
        if (json.statusCode === 200 && Array.isArray(json.data)) {
          setBankMethods(json.data);
        }
      } catch (err) {
        console.warn("Failed to pre-fetch bank methods for AI context:", err);
      }
    };
    fetchMethods();
  }, []);

  const hasInitialized = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const loadHistory = async () => {
      if (hasInitialized.current || !isExpanded) return;

      const sessionId = getChatSessionId();
      if (!sessionId) return;

      setHistoryLoading(true);

      try {
        let history = await GetChatHistory(sessionId);

        if (isCancelled) return;

        if (history && history.length > 0) {
          setMessages((prev) => (prev.length > 0 ? prev : history));
          hasInitialized.current = true;
          return;
        }

        const wallet = getAggregatedWalletState();
        const isAnyConnected =
          wallet.bitcoin.connected ||
          wallet.hedera.connected ||
          wallet.ethereum.connected ||
          wallet.solana.connected ||
          wallet.polkadot.connected;

        await SyncChatGreeting(sessionId, !isAnyConnected);
        if (isCancelled) return;

        const syncedHistory = await GetChatHistory(sessionId);
        if (isCancelled) return;

        setMessages((prev) => (prev.length > 0 ? prev : syncedHistory));
        hasInitialized.current = true;
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        if (!isCancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [
    isExpanded,
    btcState?.connected,
    ethState?.connected,
    hederaState?.connected,
    solanaState?.connected,
    polkadotState?.connected,
  ]);

  const checkModeMatch = (net: string, isMainnet: boolean) => {
    switch (net.toLowerCase()) {
      case "bitcoin":
        return true;
      case "hedera":
        return networkState.hederaMainnet === isMainnet;
      case "ethereum":
        return networkState.ethereumMainnet === isMainnet;
      case "solana":
        return networkState.solanaMainnet === isMainnet;
      case "polkadot":
        return networkState.polkadotMainnet === isMainnet;
      case "tron":
        return networkState.tronMainnet === isMainnet;
      case "hyperliquid":
        return networkState.hyperliquidMainnet === isMainnet;
      case "robinhood":
        return networkState.robinhoodMainnet === isMainnet;
      default:
        return false;
    }
  };

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const performConnectWallet = async (network: string, walletType: string) => {
    pendingConnectionRef.current = true;
    try {
      const net = (network || "").toLowerCase();
      const type = (walletType || "").toLowerCase();
      if (net === "bitcoin") {
        await btcState.connect(type === "xverse" ? "xverse" : "phantom");
      } else if (net === "hedera") {
        await hederaState.connect(type === "walletconnect" ? "walletconnect" : "metamask");
      } else if (net === "ethereum") {
        await ethState.connect(type === "metamask" ? "metamask" : "phantom");
      } else if (net === "solana") {
        if (type === "walletconnect") {
          await solanaState.connect("walletconnect");
        } else {
          const walletObj =
            solanaState.availableWallets?.find((w: any) =>
              w.name.toLowerCase().includes(type),
            ) || solanaState.availableWallets?.[0];
          if (!walletObj) {
            const walletName = type ? type.charAt(0).toUpperCase() + type.slice(1) : "Solana";
            const downloadUrl = type.includes("phantom")
              ? "https://phantom.app/download"
              : "https://solana.com/ecosystem/wallets";
            throw new Error(
              `No ${walletName} wallet extension detected in your browser. Please install the wallet extension to proceed: [Install ${walletName} Wallet](${downloadUrl})`,
            );
          }
          await solanaState.connect(walletObj);
        }
      } else if (net === "polkadot") {
        await polkadotState.connect(type === "talisman" ? "talisman" : "subwallet-js");
      } else if (net === "tron") {
        await tronState.connect("tronlink");
      } else if (net === "hyperliquid") {
        await hyperliquidState.connect("metamask");
      } else if (net === "robinhood") {
        await robinhoodState.connect("metamask");
      }
    } catch (err: any) {
      pendingConnectionRef.current = false;
      console.error("Wallet connection failed:", err);
      throw err;
    }
  };

  // --- THE NEW ACTION REGISTRY AND DISPATCHER ---
  const resolveSolanaMint = (mintOrSymbol: string): string => {
    if (!mintOrSymbol) return SOLANA_NATIVE_MINT;
    const input = String(mintOrSymbol).trim();
    if (input.length >= 32) return input;

    const sym = input.toLowerCase();

    const verifiedMatch = solanaState.verifiedTokensData?.find(
      (t: any) => t.symbol?.toLowerCase() === sym || t.name?.toLowerCase() === sym,
    );
    if (verifiedMatch?.mint) return verifiedMatch.mint;

    const balanceMatch = solanaState.balance?.tokens?.find(
      (t: any) => t.symbol?.toLowerCase() === sym || t.name?.toLowerCase() === sym,
    );
    if (balanceMatch?.mint) return balanceMatch.mint;

    if (sym === "sol" || sym === "solana" || sym === "native") return SOLANA_NATIVE_MINT;
    if (sym === "usdc") return USDC_MINT;
    if (sym === "usdt") return USDT_MINT;
    if (sym === "gld") return GLD_MINT;
    return input;
  };

  const resolveSolanaDecimals = (mintOrSymbol: string, providedDecimals?: number): number => {
    if (typeof providedDecimals === "number" && providedDecimals > 0) return providedDecimals;
    const input = String(mintOrSymbol || "").trim();
    const sym = input.toLowerCase();

    const verifiedMatch = solanaState.verifiedTokensData?.find(
      (t: any) => t.mint === input || t.symbol?.toLowerCase() === sym,
    );
    if (typeof verifiedMatch?.decimals === "number") return verifiedMatch.decimals;

    const balanceMatch = solanaState.balance?.tokens?.find(
      (t: any) => t.mint === input || t.symbol?.toLowerCase() === sym,
    );
    if (typeof balanceMatch?.decimals === "number") return balanceMatch.decimals;

    if (sym === "usdc" || sym === "usdt" || input === USDC_MINT || input === USDT_MINT) return 6;
    return 9;
  };

  // 1. Static registry mapping identifiers to hook instances
  const clientStateRegistry: Record<string, any> = {
    solanaState: {
      ...solanaState,
      fetchSwapQuote: (
        inputMint: string,
        outputMint: string,
        amountInSmallestUnit: number,
        inputAmountUi?: number,
        swapMode: "ExactIn" | "ExactOut" = "ExactIn",
        inputDecimals?: number,
        signal?: AbortSignal,
      ) => {
        const resolvedInputMint = resolveSolanaMint(inputMint);
        const resolvedOutputMint = resolveSolanaMint(outputMint);
        const decimals = resolveSolanaDecimals(inputMint, inputDecimals);
        const amountNum =
          typeof inputAmountUi === "number"
            ? inputAmountUi
            : parseFloat(String(inputAmountUi || 0));
        const resolvedSmallestUnit =
          amountInSmallestUnit > 0
            ? amountInSmallestUnit
            : Math.floor(amountNum * Math.pow(10, decimals));
        const uiAmount =
          amountNum > 0
            ? amountNum
            : resolvedSmallestUnit / Math.pow(10, decimals);
        return solanaState.fetchSwapQuote(
          resolvedInputMint,
          resolvedOutputMint,
          resolvedSmallestUnit,
          uiAmount,
          swapMode,
          decimals,
          signal,
        );
      },
      executeSwap: (
        quoteResponse: any,
        inputMint: string,
        inputAmountUi: number,
        isUltraFast: boolean = true,
      ) => {
        const resolvedInputMint = resolveSolanaMint(inputMint);
        return solanaState.executeSwap(
          quoteResponse,
          resolvedInputMint,
          isUltraFast,
        );
      },
    },
    hederaState,
    networkState,
    bitcoinState: btcState,
    ethereumState: ethState,
    polkadotState,
    tronState,
    hyperliquidState,
    robinhoodState,
    performConnectWallet,
  };

  // 2. Generic string formatter for operator success/fail logs
  const formatTemplate = (template: string, result: any, intention: any): string => {
    return template.replace(/\{(\w+)(.*?)\}/g, (match, base, path) => {
      try {
        let source = base === "response" ? result : base === "intent" ? intention : null;
        const keys = path.split(".").filter(Boolean);
        let value = source;
        if (value) {
          for (const key of keys) {
            value = value?.[key];
          }
        }
        // Fallback for missing network in success templates: read exact transaction network from response.tx.network, response.network, intention, or networkState
        if ((value === undefined || value === "") && keys.includes("network")) {
          value =
            result?.tx?.network ||
            result?.network ||
            intention?.network ||
            (networkState as any)?.selectedChain ||
            "solana";
        }
        // Lowercase network strings for URL paths
        if (typeof value === "string" && keys.includes("network")) {
          value = value.toLowerCase();
        }
        return value !== undefined ? String(value) : "";
      } catch {
        return "";
      }
    });
  };

  // 3. Client argument evaluator (directly forwards intention/steps parameters)
  const resolveArg = (arg: any, intention: any, resolvedSteps: Record<string, any>): any => {
    if (typeof arg === "string") {
      if (arg.startsWith("intention.")) {
        const path = arg.replace("intention.", "");
        const keys = path.split(".");
        let val = intention;
        for (const key of keys) {
          val = val?.[key];
        }
        return val;
      }

      if (arg.startsWith("$steps.")) {
        const path = arg.replace("$steps.", "");
        const keys = path.split(".");
        let val = resolvedSteps;
        for (const key of keys) {
          val = val?.[key];
        }
        return val;
      }

      return arg;
    }

    if (arg && typeof arg === "object" && !Array.isArray(arg)) {
      const resObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(arg)) {
        resObj[k] = resolveArg(v, intention, resolvedSteps);
      }
      return resObj;
    }

    if (Array.isArray(arg)) {
      return arg.map((item) => resolveArg(item, intention, resolvedSteps));
    }

    return arg;
  };

  // Helper to send execution outcomes to backend AI for human-friendly diagnosis
  const sendExecutionOutcome = async (executionResult: any) => {
    setLoading(true);
    try {
      const walletState = getAggregatedWalletState();
      const sessionId = getChatSessionId();
      const res = await ChatWithChatbot(
        `[EXECUTION_RESULT_${executionResult.status}]`,
        walletState,
        sessionId,
        "user",
        executionResult,
      );

      if (res?.response) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: res.response,
            intention: res?.intention,
            execution_blueprint: res?.execution_blueprint,
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to propagate execution result:", err);
      // Clean, human-friendly fallback - no raw stack traces or developer jargon
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "An error occurred while attempting this transaction. Please make sure your wallet is connected and unlocked, and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 4. Client Reflection Executor loop
  const executeBlueprint = async (blueprint: any, originalIntention: any) => {
    if (!blueprint) return;
    const { type, hook, method, args, url, method: httpMethod, body, messages, steps } = blueprint;
    const resolvedSteps: Record<string, any> = { ...(blueprint.resolvedSteps || {}) };

    try {
      let result: any = null;

      if (type === "MULTI_STEP" && Array.isArray(steps)) {
        for (const step of steps) {
          const stepResult = await executeStep(step, originalIntention, resolvedSteps, blueprint);
          if (stepResult === "HALT_FOR_CONFIRMATION") {
            return; // Stops loop to await user manual confirm click
          }
          if (
            stepResult === null ||
            stepResult === false ||
            (typeof stepResult === "object" && stepResult?.success === false)
          ) {
            throw new Error(
              stepResult?.error ||
                stepResult?.message ||
                "Transaction was cancelled or failed to execute on-chain.",
            );
          }
          if (step.output_key) {
            resolvedSteps[step.output_key] = stepResult;
          }
          result = stepResult;
        }
      } else {
        result = await executeStep(blueprint, originalIntention, resolvedSteps, blueprint);
        if (
          result === null ||
          result === false ||
          (typeof result === "object" && result?.success === false)
        ) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Transaction was cancelled or failed to execute on-chain.",
          );
        }
      }

      if (messages?.success) {
        const successMessage = formatTemplate(messages.success, result, originalIntention);
        if (!successMessage.startsWith("OPERATOR:")) {
          setMessages((prev) => [
            ...prev,
            {
              sender: "bot",
              text: successMessage,
            },
          ]);
          const sessionId = getChatSessionId();
          if (sessionId) {
            AppendChatMessage(sessionId, successMessage, "bot");
          }
        }
      }

      // Automatically propagate execution success outcome to backend AI if not already displayed as user-facing template
      const intentType = originalIntention?.type;
      if (intentType !== "DEPOSIT" && intentType !== "WITHDRAWAL") {
        const txId = result?.tx?.id || result?.id || result?.txId;
        const network = (originalIntention?.network || "solana").toLowerCase();
        const txUrl = txId ? `/${network}/vault/transaction/${txId}` : undefined;

        await sendExecutionOutcome({
          intent_type: intentType || "UNKNOWN",
          status: "SUCCESS",
          raw_message: messages?.success
            ? formatTemplate(messages.success, result, originalIntention)
            : "Action completed successfully",
          timestamp: new Date().toISOString(),
          tx_hash: result?.txId || result?.signature || result?.hash || undefined,
          tx_id: txId || undefined,
          tx_url: txUrl || undefined,
        });
      }
    } catch (error: any) {
      console.error("Failed to execute blueprint:", error);
      const rawMsg = error?.message || String(error);
      const lowerMsg = rawMsg.toLowerCase();

      // Strictly classify error category without making assumptions
      let category: "USER_REJECTION" | "INSUFFICIENT_FUNDS" | "NETWORK_MISMATCH" | "UNKNOWN" = "UNKNOWN";
      if (
        lowerMsg.includes("reject") ||
        lowerMsg.includes("cancel") ||
        lowerMsg.includes("denied") ||
        lowerMsg.includes("declined") ||
        lowerMsg.includes("user cancelled")
      ) {
        category = "USER_REJECTION";
      } else if (
        lowerMsg.includes("insufficient") ||
        lowerMsg.includes("not enough balance") ||
        lowerMsg.includes("exceeds balance")
      ) {
        category = "INSUFFICIENT_FUNDS";
      } else if (
        lowerMsg.includes("network") ||
        lowerMsg.includes("chain mismatch") ||
        lowerMsg.includes("wrong network")
      ) {
        category = "NETWORK_MISMATCH";
      }

      // Report execution error outcome to backend AI for human-friendly diagnosis
      await sendExecutionOutcome({
        intent_type: originalIntention?.type || "UNKNOWN",
        status: "ERROR",
        error_category: category,
        raw_message: rawMsg,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Helper handling single step executions
  const executeStep = async (step: any, intention: any, resolvedSteps: Record<string, any>, parentBlueprint: any): Promise<any> => {
    const rawType = (step.type || step.step_type || step.action || "").toUpperCase();
    const { hook, method, args, url, method: httpMethod, body, prompt_template, network, wallet_type, walletType } = step;

    // WALLET_CONNECT / CONNECT_WALLET
    if (
      rawType === "WALLET_CONNECT" ||
      rawType === "CONNECT_WALLET" ||
      rawType === "WALLET_CONNECTION" ||
      rawType === "CONNECT" ||
      step.action === "CONNECT_WALLET" ||
      step.action === "WALLET_CONNECT"
    ) {
      const net = resolveArg(network || step.chain || intention?.network || "solana", intention, resolvedSteps);
      const wType = resolveArg(wallet_type || walletType || intention?.walletType || "phantom", intention, resolvedSteps);
      return await performConnectWallet(net, wType);
    }

    // CLIENT_HOOK_CALL / STATE_QUERY / STATE_ACTION / CLIENT_ACTION / HOOK_CALL
    if (
      rawType === "CLIENT_HOOK_CALL" ||
      rawType === "CLIENT_ACTION" ||
      rawType === "HOOK_CALL" ||
      rawType === "CALL_HOOK" ||
      rawType === "FUNCTION_CALL" ||
      rawType === "STATE_QUERY" ||
      rawType === "STATE_ACTION" ||
      hook ||
      step.hook_name
    ) {
      const targetHookName = hook || step.hook_name || step.target || step.action;
      const stateHook = clientStateRegistry[targetHookName];

      if (!stateHook) {
        if (targetHookName === "performConnectWallet" || rawType.includes("CONNECT") || targetHookName?.includes("connect")) {
          const net = resolveArg(network || step.chain || intention?.network || "solana", intention, resolvedSteps);
          const wType = resolveArg(wallet_type || walletType || intention?.walletType || "phantom", intention, resolvedSteps);
          return await performConnectWallet(net, wType);
        }
        throw new Error(`State hook '${targetHookName || rawType}' not registered on client`);
      }

      const resolvedArgs = (args || []).map((arg: any) => resolveArg(arg, intention, resolvedSteps));

      if (typeof stateHook === "function") {
        return await stateHook(...resolvedArgs);
      } else if (method && typeof stateHook[method] === "function") {
        return await stateHook[method](...resolvedArgs);
      } else {
        throw new Error(`Method '${method}' not found on hook '${targetHookName}'`);
      }

    // REST_API_CALL
    } else if (rawType === "REST_API_CALL" || rawType === "HTTP_REQUEST" || rawType === "API_CALL") {
      const targetUrl = url || step.endpoint?.url || step.url;
      const targetBodySource = body || step.endpoint?.body || {};
      const targetHttpMethod = httpMethod || step.endpoint?.method || step.method || "POST";

      if (!targetUrl) {
        throw new Error("REST API execution failed: missing target URL");
      }

      const resolvedBody: Record<string, any> = {};
      if (targetBodySource) {
        for (const [key, val] of Object.entries(targetBodySource)) {
          resolvedBody[key] = resolveArg(val, intention, resolvedSteps);
        }
      }

      // Fail-safe network, walletAddress, networkEnv & paymentDetails resolution for /api/transaction calls
      if (targetUrl === "/api/transaction" || resolvedBody.type === "DEPOSIT" || resolvedBody.type === "WITHDRAWAL") {
        const walletState = getAggregatedWalletState();
        const targetNet = (resolvedBody.network || intention?.network || "solana").toLowerCase();
        const netObj = (walletState as any)[targetNet];

        if (!resolvedBody.network || resolvedBody.network === "undefined") {
          resolvedBody.network = targetNet.toUpperCase();
        }

        if (!resolvedBody.walletAddress || resolvedBody.walletAddress === "undefined") {
          resolvedBody.walletAddress = netObj?.address || "";
        }

        if (!resolvedBody.networkEnv || resolvedBody.networkEnv === "undefined") {
          const isMainnet =
            typeof (networkState as any)?.isMainnet === "function"
              ? (networkState as any).isMainnet(targetNet)
              : netObj?.isMainnet ?? (networkState as any)?.[`${targetNet}Mainnet`] ?? true;
          resolvedBody.networkEnv = isMainnet ? "MAINNET" : "TESTNET";
        }

        if (!resolvedBody.method || resolvedBody.method === "undefined") {
          resolvedBody.method = resolvedBody.paymentDetails?.method || "IDRX";
        }

        if (resolvedBody.type === "WITHDRAWAL") {
          const pickFirstValid = (...candidates: any[]): string => {
            for (const c of candidates) {
              if (typeof c === "string" && c && !c.startsWith("intention.")) {
                return c;
              }
            }
            return "";
          };

          const rawMethod = pickFirstValid(
            resolvedBody.paymentDetails?.method,
            intention?.paymentDetails?.method,
            intention?.method,
            intention?.bankCode
          ).toLowerCase().trim();

          const rawAccountNum = pickFirstValid(
            resolvedBody.paymentDetails?.accountNumber,
            resolvedBody.paymentDetails?.bankAccount,
            intention?.paymentDetails?.accountNumber,
            intention?.paymentDetails?.bankAccount,
            intention?.accountNumber,
            intention?.bankAccount
          );
          const sanitizedAccountNum = rawAccountNum.replace(/\D/g, "");

          const rawHolderName = pickFirstValid(
            resolvedBody.paymentDetails?.accountHolderName,
            resolvedBody.paymentDetails?.bankAccountName,
            intention?.paymentDetails?.accountHolderName,
            intention?.accountHolderName,
            intention?.bankAccountName
          );

          const matchedBank = bankMethods.find(
            (b) =>
              b.bankCode?.toLowerCase() === rawMethod ||
              b.bankName?.toLowerCase().includes(rawMethod) ||
              rawMethod.includes(b.bankName?.toLowerCase())
          );

          const bankCode = matchedBank ? matchedBank.bankCode : rawMethod;
          const bankName = matchedBank ? matchedBank.bankName : rawMethod;
          const legacyMethod = LEGACY_BANK_CODES[bankCode] || bankCode;

          resolvedBody.paymentDetails = {
            method: legacyMethod,
            accountNumber: sanitizedAccountNum,
            accountHolderName: rawHolderName,
            bankCode: bankCode,
            bankName: bankName,
            bankAccountName: rawHolderName,
            bankAccount: sanitizedAccountNum,
          };
        }
      }

      const res = await fetch(targetUrl, {
        method: targetHttpMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolvedBody)
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`REST API returned unexpected non-JSON response (${res.status})`);
      }

      const result = await res.json();

      if (
        result?.errorCode === "ERR_IDRX_REKYC_REQUIRED" ||
        result?.error_code === "ERR_IDRX_REKYC_REQUIRED"
      ) {
        const targetAddress = resolvedBody.walletAddress || intention?.walletAddress;
        const targetNet = resolvedBody.network || intention?.network || "SOLANA";
        savePendingTransaction({
          type: (resolvedBody.type || "WITHDRAWAL") as "DEPOSIT" | "WITHDRAWAL",
          walletAddress: targetAddress,
          tokenType: resolvedBody.tokenType || intention?.tokenType || "USDC",
          network: targetNet.toString(),
          networkEnv: resolvedBody.networkEnv || "TESTNET",
          tokenAmount: resolvedBody.tokenAmount ? Number(resolvedBody.tokenAmount) : undefined,
          idrAmount: resolvedBody.idrAmount ? Number(resolvedBody.idrAmount) : undefined,
          paymentDetails: resolvedBody.paymentDetails || {},
        });
        startOnboarding(
          targetAddress,
          targetNet.toUpperCase(),
          result?.lastEmail || result?.last_email,
          true,
        );
        throw new Error("Your account requires re-verification. Redirecting to verification...");
      }

      if (
        res.status === 400 &&
        (() => {
          const msg = result?.error?.toLowerCase() || "";
          return msg.includes("not onboarded") && msg.includes("idrx");
        })()
      ) {
        const targetAddress = resolvedBody.walletAddress || intention?.walletAddress;
        const targetNet = resolvedBody.network || intention?.network || "SOLANA";
        savePendingTransaction({
          type: (resolvedBody.type || "WITHDRAWAL") as "DEPOSIT" | "WITHDRAWAL",
          walletAddress: targetAddress,
          tokenType: resolvedBody.tokenType || intention?.tokenType || "USDC",
          network: targetNet.toString(),
          networkEnv: resolvedBody.networkEnv || "TESTNET",
          tokenAmount: resolvedBody.tokenAmount ? Number(resolvedBody.tokenAmount) : undefined,
          idrAmount: resolvedBody.idrAmount ? Number(resolvedBody.idrAmount) : undefined,
          paymentDetails: resolvedBody.paymentDetails || {},
        });
        startOnboarding(targetAddress, targetNet.toUpperCase());
        throw new Error("You are not onboarded to IDRX. Redirecting to KYC verification...");
      }

      if (!res.ok || (result && result.success === false)) {
        throw new Error(result?.error || result?.message || "REST API Invocation failed");
      }

      return result;

    // UI_CONFIRMATION
    } else if (rawType === "UI_CONFIRMATION" || step.step_type === "UI_CONFIRMATION") {
      const promptText = formatTemplate(prompt_template, {}, intention);
      
      // Calculate remaining steps in execution stack and preserve step outputs
      const currentStepIndex = parentBlueprint?.steps?.indexOf(step) ?? 0;
      const remainingSteps = parentBlueprint?.steps?.slice(currentStepIndex + 1) || [];
      const remainingBlueprint = {
        type: "MULTI_STEP",
        steps: remainingSteps,
        messages: parentBlueprint?.messages,
        resolvedSteps: { ...(parentBlueprint?.resolvedSteps || {}), ...resolvedSteps },
      };

      // Push confirmation dialog message containing remaining steps blueprint
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: promptText,
          intention: intention,
          execution_blueprint: remainingBlueprint,
          isConfirmation: true,
        },
      ]);
      return "HALT_FOR_CONFIRMATION";

    // REDIRECT
    } else if (rawType === "REDIRECT") {
      const resolvedUrl = formatTemplate(url, {}, intention);
      window.location.href = resolvedUrl;
      return null;
    }

    throw new Error(`Unsupported execution type: ${rawType || step.type || step.step_type || step.action}`);
  };

  const handleTransactionModal = async (intention: any, executionBlueprint?: any) => {
    if (!intention && !executionBlueprint) return;
    intentionRef.current = intention;

    const resolvedNetwork = ((intention?.network || executionBlueprint?.network) || "solana").toLowerCase();
    if (intention?.isMainnet !== undefined && !checkModeMatch(resolvedNetwork, intention.isMainnet)) {
      // Dynamic network mode switch method without hardcoded if-else chain
      const capitalizedNet = resolvedNetwork.charAt(0).toUpperCase() + resolvedNetwork.slice(1);
      const switchMethod = `set${capitalizedNet}Mainnet`;

      if (intention?.type === "CONNECT_WALLET" || intention?.action === "CONNECT_WALLET") {
        pendingConnectAfterSwitch.current = {
          network: resolvedNetwork,
          walletType: intention?.walletType || intention?.wallet_type || "phantom",
        };
      }

      await executeBlueprint({
        type: "CLIENT_HOOK_CALL",
        hook: "networkState",
        method: switchMethod,
        args: [intention.isMainnet]
      }, intention);
      return;
    }

    if (executionBlueprint) {
      await executeBlueprint(executionBlueprint, intention);
    } else if (intention?.type === "CONNECT_WALLET" || intention?.action === "CONNECT_WALLET") {
      await performConnectWallet(resolvedNetwork, intention?.walletType || intention?.wallet_type || "phantom");
    }
  };
  // --- END OF NEW ARCHITECTURE ---

  useEffect(() => {
    const wallets = [
      {
        name: "bitcoin",
        addr: btcState.address,
        connected: btcState.connected,
        mode: networkState.bitcoinMainnet ? "mainnet" : "testnet",
      },
      {
        name: "ethereum",
        addr: ethState.address,
        connected: ethState.connected,
        mode: networkState.ethereumMainnet ? "mainnet" : "testnet",
      },
      {
        name: "hedera",
        addr: hederaState.address,
        connected: hederaState.connected,
        mode: networkState.hederaMainnet ? "mainnet" : "testnet",
      },
      {
        name: "solana",
        addr: solanaState.address,
        connected: solanaState.connected,
        mode: networkState.solanaMainnet ? "mainnet" : "testnet",
      },
      {
        name: "polkadot",
        addr: polkadotState.address,
        connected: polkadotState.connected,
        mode: networkState.polkadotMainnet ? "mainnet" : "testnet",
      },
      {
        name: "tron",
        addr: tronState.address,
        connected: tronState.connected,
        mode: networkState.tronMainnet ? "mainnet" : "testnet",
      },
      {
        name: "hyperliquid",
        addr: hyperliquidState.address,
        connected: hyperliquidState.connected,
        mode: networkState.hyperliquidMainnet ? "mainnet" : "testnet",
      },
      {
        name: "robinhood",
        addr: robinhoodState.address,
        connected: robinhoodState.connected,
        mode: networkState.robinhoodMainnet ? "mainnet" : "testnet",
      },
    ];

    if (pendingConnectAfterSwitch.current) {
      const { network, walletType } = pendingConnectAfterSwitch.current;
      if (checkModeMatch(network, !!intentionRef.current?.isMainnet)) {
        pendingConnectAfterSwitch.current = null;
        pendingConnectionRef.current = true;
        performConnectWallet(network, walletType);
        return;
      }
    }

    if (pendingConnectionRef.current || pendingModeChangeRef.current) {
      const targetNetName = (intentionRef.current?.network || "").toLowerCase();
      const targetWallet =
        wallets.find((w) => w.name.toLowerCase() === targetNetName) ||
        wallets.find((w) => w.connected && !!w.addr);
      if (targetWallet?.addr && targetWallet?.connected) {
        const reportKey = `${targetWallet.name}-${targetWallet.mode}-${targetWallet.addr}`;
        if (lastReportedRef.current !== reportKey) {
          lastReportedRef.current = reportKey;
          pendingConnectionRef.current = false;
          pendingModeChangeRef.current = false;
        }
      }
    }
  }, [
    btcState.address,
    btcState.connected,
    ethState.address,
    ethState.connected,
    hederaState.address,
    hederaState.connected,
    solanaState.address,
    solanaState.connected,
    polkadotState.address,
    polkadotState.connected,
    tronState.address,
    tronState.connected,
    hyperliquidState.address,
    hyperliquidState.connected,
    robinhoodState.address,
    robinhoodState.connected,
    networkState.bitcoinMainnet,
    networkState.hederaMainnet,
    networkState.ethereumMainnet,
    networkState.solanaMainnet,
    networkState.polkadotMainnet,
    networkState.tronMainnet,
    networkState.hyperliquidMainnet,
    networkState.robinhoodMainnet,
  ]);

  const getAggregatedWalletState = () => ({
    bitcoin: {
      address: btcState?.address || null,
      connected: !!btcState?.connected,
      balance: btcState?.balance || 0,
      isMainnet: !!networkState?.bitcoinMainnet,
      convertLimit: { mode: btcState?.ipowConvert },
      selfCustodyLimit: btcState?.selfCustodyParameter,
    },
    hedera: {
      address: hederaState?.address || null,
      walletType: hederaState?.walletType || null,
      connected: !!hederaState?.connected,
      balance: hederaState?.balance || 0,
      isMainnet: !!networkState?.hederaMainnet,
      convertLimit: { mode: hederaState?.ipowConvert },
      selfCustodyLimit: hederaState?.selfCustodyParameter,
      hederaNodes: null,
      stakedNodeId: null as number | null,
      stakePeriodStart: null as string | null,
      pendingReward: null as number | null,
      fetchError: false as boolean,
    },
    ethereum: {
      address: ethState?.address || null,
      walletType: ethState?.walletType || null,
      connected: !!ethState?.connected,
      balance: ethState?.balance || 0,
      isMainnet: !!networkState?.ethereumMainnet,
      convertLimit: { mode: ethState?.ipowConvert },
      selfCustodyLimit: ethState?.selfCustodyParameter,
    },
    solana: {
      address: solanaState?.address || null,
      connected: !!solanaState?.connected,
      balance: solanaState?.balance || 0,
      isMainnet: !!networkState?.solanaMainnet,
      convertLimit: { mode: solanaState?.ipowConvert },
      selfCustodyLimit: solanaState?.selfCustodyParameter,
      staking: {
        isUltraFast: solanaState?.isUltraFast,
      },
      marinade: null as { sol: any; usdc: any; fetchError?: boolean } | null,
    },
    polkadot: {
      address: polkadotState?.address || null,
      connected: !!polkadotState?.connected,
      balance: polkadotState?.balance || { confirmed: 0, unconfirmed: 0, sendable: 0, fetched: false },
      isMainnet: !!networkState?.polkadotMainnet,
      selfCustodyLimit: polkadotState?.selfCustodyParameter,
    },
    tron: {
      address: tronState?.address || null,
      connected: !!tronState?.connected,
      balance: tronState?.balance || 0,
      isMainnet: !!networkState?.tronMainnet,
      convertLimit: { mode: tronState?.ipowConvert },
      selfCustodyLimit: tronState?.selfCustodyParameter,
    },
    hyperliquid: {
      address: hyperliquidState?.address || null,
      connected: !!hyperliquidState?.connected,
      balance: hyperliquidState?.balance || 0,
      isMainnet: !!networkState?.hyperliquidMainnet,
      convertLimit: { mode: hyperliquidState?.ipowConvert },
      selfCustodyLimit: hyperliquidState?.selfCustodyParameter,
    },
    robinhood: {
      address: robinhoodState?.address || null,
      connected: !!robinhoodState?.connected,
      balance: robinhoodState?.balance || 0,
      isMainnet: !!networkState?.robinhoodMainnet,
      convertLimit: { mode: robinhoodState?.ipowConvert },
      selfCustodyLimit: robinhoodState?.selfCustodyParameter,
    },
    base: {
      address: baseState?.address || null,
      connected: !!baseState?.connected,
      balance: baseState?.balance || 0,
      isMainnet: !!networkState?.baseMainnet,
      convertLimit: { mode: baseState?.ipowConvert },
      selfCustodyLimit: baseState?.selfCustodyParameter,
    },
    arbitrum: {
      address: arbitrumState?.address || null,
      connected: !!arbitrumState?.connected,
      balance: arbitrumState?.balance || 0,
      isMainnet: !!networkState?.arbitrumMainnet,
      convertLimit: { mode: arbitrumState?.ipowConvert },
      selfCustodyLimit: arbitrumState?.selfCustodyParameter,
    },
  });

  const handleSend = async (
    event?: React.FormEvent<HTMLFormElement>,
    overrideMessage?: string,
    sender: "user" | "operator" = "user",
  ) => {
    if (event) event.preventDefault();
    const messageToSubmit = overrideMessage || input;
    if (!messageToSubmit.trim() || loading) return;

    setMessages((prev) => [...prev, { sender, text: messageToSubmit }]);
    if (!overrideMessage) setInput("");
    setLoading(true);

    try {
      let walletState = getAggregatedWalletState();

      if (hederaState.address && hederaState.connected) {
        try {
          const stakingData = await hederaState.getCurrentStake();
          const hederaNodes = await hederaState.getHederaNodes();
          walletState.hedera.hederaNodes = hederaNodes;
          walletState.hedera.fetchError = false;
          if (stakingData) {
            walletState.hedera.stakedNodeId = stakingData.stakedNodeId;
            walletState.hedera.stakePeriodStart = stakingData.stakePeriodStart;
            walletState.hedera.pendingReward = stakingData.pendingReward;
          }
        } catch (e) {
          console.warn("Failed to fetch Hedera staking data for AI context", e);
          walletState.hedera.fetchError = true;
        }
      }

      if (solanaState.address && solanaState.connected) {
        try {
          const [solData, usdcData] = await Promise.all([
            solanaState.getMarinadeSOLData(),
            solanaState.getMarinadeUSDCData(),
          ]);
          walletState.solana.marinade = {
            sol: solData,
            usdc: usdcData,
            fetchError: false,
          };
        } catch (e) {
          console.warn(
            "Failed to fetch Solana marinade data for AI context",
            e,
          );
          walletState.solana.marinade = {
            sol: null,
            usdc: null,
            fetchError: true,
          };
        }
      }

      if (bankMethods && bankMethods.length > 0) {
        (walletState as any).fiatPaymentMethods = bankMethods.map((b) => ({
          code: b.bankCode,
          name: b.bankName,
          maxLimitIdr: b.maxAmountTransfer,
        }));
      }

      const stateString = JSON.stringify(walletState);
      let stateToSend = null;
      if (stateString !== lastSentStateRef.current) {
        stateToSend = walletState;
      }

      const res = await ChatWithChatbot(
        messageToSubmit,
        stateToSend,
        getChatSessionId(),
        sender,
      );

      lastSentStateRef.current = stateString;

      const hasBlueprint = !!res?.execution_blueprint;
      const requireConfirmation = res?.execution_blueprint?.require_confirmation ?? false;

      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res?.response ?? t("text286"),
          intention: res?.intention,
          execution_blueprint: res?.execution_blueprint,
          isConfirmation: hasBlueprint && requireConfirmation,
        },
      ]);

      if (hasBlueprint && !requireConfirmation) {
        await handleTransactionModal(res.intention, res.execution_blueprint);
      }
    } catch (err) {
      console.error("ParaAI Error:", err);
      setMessages((prev) => [...prev, { sender: "bot", text: t("text287") }]);
    } finally {
      setLoading(false);
    }
  };

  const resolveMessage = (index: number, status: "executed" | "cancelled" = "executed") => {
    setMessages((prev) =>
      prev.map((msg, i) => (i === index ? { ...msg, isResolved: true, resolutionStatus: status } : msg)),
    );
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (chatbotRef.current && !chatbotRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isExpanded]);

  useEffect(() => {
    if (isExpanded && messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }
  }, [messages, isExpanded]);

  return (
    <>
      {isExpanded && (() => {
        const modalContent = (
          <div
            ref={chatbotRef}
            className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-[#0a0a0a] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/10">
              <div className="flex flex-col gap-0.5">
                <h3 className="font-bold text-black dark:text-white text-xl">
                  ParaAI
                </h3>
                <p className="text-xs text-black/60 dark:text-white/60">
                  {t("text266")}
                </p>
              </div>
              <button
                onClick={handleToggle}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close Para AI"
              >
                <svg
                  className="w-6 h-6 text-black/50 dark:text-white/50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="w-full space-y-6">
                {messages.map((msg, originalIndex) => {
                  if (msg.sender === "operator") return null;

                  return (
                    <div
                      key={originalIndex}
                      className={`flex ${
                        msg.sender === "bot" ? "justify-start" : "justify-end"
                      } w-full`}
                    >
                      <div
                        className={`py-3 px-5 rounded-2xl text-base max-w-[90%] md:max-w-[85%] ${
                          msg.sender === "bot"
                            ? "bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-bl-none border border-black/5"
                            : "bg-black dark:bg-white text-white dark:text-black rounded-br-none font-medium"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {formatMessageText(msg.text, locale, (href) => {
                            router.push(href);
                            setIsExpanded(false);
                          })}
                        </div>

                        {msg.sender === "bot" && msg.isConfirmation && (
                          <div className="mt-4 flex gap-2 border-t border-black/10 dark:border-white/10 pt-4">
                            {msg.isResolved ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 text-xs font-bold">
                                {msg.resolutionStatus === "cancelled" ? (
                                  <span className="text-red-500 dark:text-red-400 flex items-center gap-1">
                                    <span>✕</span> Action Cancelled
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <span>✓</span> Confirmed & Executed
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    resolveMessage(originalIndex, "executed");
                                    handleTransactionModal(msg.intention, msg.execution_blueprint);
                                  }}
                                  className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer"
                                >
                                  {t("text268")}
                                </button>
                                <button
                                  onClick={() => {
                                    resolveMessage(originalIndex, "cancelled");
                                    sendExecutionOutcome({
                                      intent_type: msg.intention?.type || "UNKNOWN",
                                      status: "ERROR",
                                      error_category: "USER_REJECTION",
                                      raw_message: "User cancelled the transaction confirmation dialog in UI.",
                                      timestamp: new Date().toISOString(),
                                    });
                                  }}
                                  className="px-4 py-2 bg-transparent border border-black/10 dark:border-white/10 text-black dark:text-white rounded-xl text-xs font-bold hover:bg-black/5 transition-colors cursor-pointer"
                                >
                                  {t("text269")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="text-black/40 dark:text-white/40 text-sm font-bold italic animate-pulse">
                    {t("text270")}
                  </div>
                )}
                {historyLoading && (
                  <div className="text-black/40 dark:text-white/40 text-sm font-bold italic animate-pulse">
                    {t("text332")}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <p className="py-2 text-center text-[11px] text-black/40 dark:text-white/40 font-medium tracking-tight">
              Para AI can make mistakes. Verify important info.
            </p>

            <div className="flex flex-col w-full p-6 pb-10 border-t border-black/5 dark:border-white/10 bg-white dark:bg-[#0a0a0a] transition-all duration-300 ease-in-out">
              <form
                onSubmit={handleSend}
                className="relative w-full flex items-center gap-3 z-10"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("text271")}
                    className="w-full p-4 pr-12 rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/10 text-base transition-all"
                    disabled={loading || historyLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim() || historyLoading}
                  className="h-[56px] px-8 rounded-2xl font-black text-sm bg-black dark:bg-white text-white dark:text-black disabled:opacity-20 transition-all active:scale-95 shadow-lg uppercase tracking-wider cursor-pointer"
                >
                  {t("text272")}
                </button>
              </form>
            </div>
          </div>
        );

        return mounted ? createPortal(modalContent, document.body) : modalContent;
      })()}
    </>
  );
};

const Chatbot = () => {
  const t = useTranslations("All");
  const shared = useChatbotContext();
  const [localIsExpanded, setLocalIsExpanded] = useState(false);
  // Defers to a ChatbotProvider ancestor when one is present (pages with App.tsx's bottom
  // nav, which gets its own "Ask AI" tab wired to the same state) — otherwise behaves exactly
  // as before, with its own private open/closed state and the floating pill as the only trigger.
  const isExpanded = shared ? shared.isOpen : localIsExpanded;
  const setIsExpanded = shared ? shared.setIsOpen : setLocalIsExpanded;

  const handleToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {!isExpanded && !shared?.hideFloatingTrigger ? (
        <button
          onClick={handleToggle}
          className="cursor-pointer fixed bottom-32 lg:bottom-4 right-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/10 dark:border-white/10 shadow-xl bg-[#0a0a0a] dark:bg-white text-white dark:text-black font-bold hover:scale-105 active:scale-95 transition-all z-50"
        >
          <span className="text-sm font-bold">{t("text267")}</span>
        </button>
      ) : isExpanded ? (
        <BitcoinProvider>
          <EthereumProvider>
            <SolanaProvider>
              <HederaProvider>
                <PolkadotProvider>
                  <TronProvider>
                    <HyperliquidProvider>
                      <RobinhoodProvider>
                        <BaseProvider>
                          <ArbitrumProvider>
                            <OnboardingProvider>
                              <ChatbotInner
                                isExpanded={isExpanded}
                                setIsExpanded={setIsExpanded}
                              />
                            </OnboardingProvider>
                          </ArbitrumProvider>
                        </BaseProvider>
                      </RobinhoodProvider>
                    </HyperliquidProvider>
                  </TronProvider>
                </PolkadotProvider>
              </HederaProvider>
            </SolanaProvider>
          </EthereumProvider>
        </BitcoinProvider>
      ) : null}
    </>
  );
};

export default Chatbot;
