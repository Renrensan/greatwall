import { ReactNode } from "react";
import { AnimatedModal } from "./AnimatedModal";

interface AnimatedModalNavbarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidthClass?: string;
  maxHeightClass?: string;
}

/** Thin alias over the shared AnimatedModal, pinned to its navbar-dropdown ("corner") variant. */
export const AnimatedModalNavbar = (props: AnimatedModalNavbarProps) => (
  <AnimatedModal {...props} variant="corner" />
);
