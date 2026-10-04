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
  // Greatwall's primary button: ink on every network (`chain` is kept so
  // existing callers need no change).
  void chain;
  const chainClass = "text-snow bg-ink hover:bg-pitch";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      key={chain}
      className={`w-full py-3 font-bold ${chainClass} rounded-md text-xs sm:text-sm px-8 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {buttonText}
    </button>
  );
}

export default Button;

