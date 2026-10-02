interface ButtonContrastProps {
  buttonText: string;
  onClick?: () => void;
  disabled?: boolean;
}

export default function ButtonContrast({
  buttonText,
  onClick,
  disabled
}: ButtonContrastProps) {
  return (
    <button
    disabled={disabled}
      onClick={onClick}
      className="w-full py-3 font-bold text-white bg-[#515151] hover:bg-[#464646] rounded-lg text-xs sm:text-sm px-8"
    >
      {buttonText}
    </button>
  );
}
