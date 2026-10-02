import { AnimatePresence, motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  disableBackdropClick?: boolean;
  maxWidthClass?: string;
  /** Overrides the default max-h-[92vh] — opt-in per instance so only call sites that ask
   * for it are affected (e.g. a long, compact dropdown list) rather than every sheet. */
  maxHeightClass?: string;
  hideDragHandle?: boolean;
  /**
   * "center": centered on desktop, slides up from the bottom on mobile (the default,
   * general-purpose modal shell).
   * "corner": anchored to the top-right on desktop with a scale+fade entrance, bottom
   * sheet on mobile — used for the navbar's dropdowns (wallet/settings/network sheets).
   */
  variant?: "center" | "corner";
  overflowVisible?: boolean;
}

export const AnimatedModal = ({
  isOpen,
  onClose,
  children,
  disableBackdropClick = false,
  maxWidthClass,
  maxHeightClass,
  hideDragHandle = false,
  variant = "center",
  overflowVisible = false,
}: AnimatedModalProps) => {
  const isCorner = variant === "corner";
  const resolvedMaxWidthClass = maxWidthClass ?? (isCorner ? "lg:w-72" : "lg:w-150");
  const resolvedMaxHeightClass = maxHeightClass ?? "max-h-[92vh]";

  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isCorner) return;
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, [isCorner]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !disableBackdropClick && onClose()}
            className={
              isCorner
                ? "fixed inset-0 bg-black/30 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none z-50"
                : "fixed inset-0 bg-black/20 backdrop-blur-sm z-50 lg:backdrop-blur-md"
            }
          />

          <div
            className={
              isCorner
                ? "fixed inset-0 z-50 flex items-end lg:items-start lg:justify-end pointer-events-none lg:pt-20 lg:pr-10"
                : "fixed inset-0 z-50 flex items-end lg:items-center justify-center pointer-events-none"
            }
          >
            <motion.div
              key="animated-modal"
              initial={
                isCorner
                  ? isDesktop
                    ? { opacity: 0, y: -15, scale: 0.95 }
                    : { opacity: 0, y: "100%" }
                  : { y: "100%" }
              }
              animate={
                isCorner
                  ? isDesktop
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 1, y: 0 }
                  : { y: 0 }
              }
              exit={
                isCorner
                  ? isDesktop
                    ? { opacity: 0, y: -15, scale: 0.95 }
                    : { opacity: 0, y: "100%" }
                  : { y: "100%" }
              }
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`w-full max-w-full ${resolvedMaxWidthClass} bg-white dark:bg-[#121212] rounded-t-[32px] lg:rounded-2xl z-50 flex flex-col ${resolvedMaxHeightClass} ${overflowVisible ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"} text-black dark:text-white pointer-events-auto shadow-2xl ${isCorner ? "lg:shadow-xl" : ""} border border-black/5 dark:border-white/10 relative`}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {!hideDragHandle && (
                <div className="flex lg:hidden justify-center w-full pt-4 pb-2 shrink-0">
                  <hr className="w-10 border-2 border-black/20 dark:border-white/20 rounded-full" />
                </div>
              )}

              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
