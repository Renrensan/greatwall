import React from "react";

interface ButtonMiniProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const ButtonMini = ({
  children,
  onClick,
  className = "",
}: ButtonMiniProps) => {
  return (
    <button
      className={`px-6 py-2 glass-card cursor-pointer text-current rounded-full font-semibold text-sm border border-black/10 ${className || ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default ButtonMini;