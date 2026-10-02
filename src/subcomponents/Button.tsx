import { SupportedChain } from "@/app/network-provider";

interface ButtonProps {
  buttonText: string;
  onClick?: () => void;
  disabled?: boolean;
  chain?: SupportedChain;
  type?: "button" | "submit" | "reset";
  className?: string;
}

function Button({
  buttonText,
  onClick,
  disabled = false,
  chain,
  type = "button",
  className = ""
}: ButtonProps) {
  // Default to a dark/light style if chain is not specified
  const chainClass = chain
    ? (chain === "hedera" || chain === "polkadot"
        ? "dark:hover:bg-white/90 dark:bg-white dark:text-black text-white hover:bg-black/90 bg-black"
        : chain === "robinhood"
          ? `text-black hover:bg-${chain}/90 bg-${chain}`
          : chain === "base"
            ? "text-white hover:bg-[#0052FF]/90 bg-[#0052FF]"
            : `text-white hover:bg-${chain}/90 bg-${chain}`)
    : "dark:hover:bg-white/90 dark:bg-white dark:text-black text-white hover:bg-black/90 bg-black";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      key={chain}
      className={`w-full py-3 font-bold ${chainClass} rounded-lg text-xs sm:text-sm px-8 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {buttonText}
    </button>
  );
}

export default Button;

