import React from "react";

interface ButtonIconProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}
const ButtonIcon = ({
  children,
  onClick,
  className = "",
}: ButtonIconProps) => {
  return (
    <button
      className={`aspect-square flex items-center justify-center glass-card cursor-pointer text-current rounded-full border border-black/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${className || ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default ButtonIcon;