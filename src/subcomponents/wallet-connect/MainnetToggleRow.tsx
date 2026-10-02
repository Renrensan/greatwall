"use client";

export function MainnetToggleRow({
  heading,
  isMainnet,
  onChange,
  testnetLabel,
}: {
  heading: string;
  isMainnet: boolean;
  onChange: (mainnet: boolean) => void;
  /** Omit for chains with no testnet (e.g. Bitcoin) — renders the Mainnet button alone. */
  testnetLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      <p className="text-[10px] uppercase font-bold opacity-50 px-1 tracking-wider">
        {heading}
      </p>
      <div className="flex gap-2">
        {testnetLabel && (
          <button
            onClick={() => onChange(false)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${!isMainnet ? "bg-orange-500/10 border-orange-500 text-orange-500" : "bg-secondary/5 border-transparent opacity-50 hover:opacity-100"}`}
          >
            {testnetLabel}
          </button>
        )}
        <button
          onClick={() => onChange(true)}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isMainnet ? "bg-green-500/10 border-green-500 text-green-500" : "bg-secondary/5 border-transparent opacity-50 hover:opacity-100"}`}
        >
          Mainnet
        </button>
      </div>
    </div>
  );
}
