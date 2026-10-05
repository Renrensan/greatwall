import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import Image from "next/image";
import Button from "./Button";
import { useTranslations } from "next-intl";

interface InformationPopUpProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  image: any;
  description: string;
}

const InformationPopUp = ({
  isOpen,
  onClose,
  title,
  image,
  description,
}: InformationPopUpProps) => {
  const t = useTranslations("All");
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-60"
          />

          <div className="fixed inset-0 z-70 flex items-end lg:items-center justify-center pointer-events-none p-0 lg:p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="w-full lg:w-130 bg-white rounded-t-2xl lg:rounded-2xl z-70 flex flex-col max-h-[90vh] lg:max-h-[85vh] overflow-hidden text-black pointer-events-auto shadow-buttonNav border-t lg:border border-black/5"
              onClick={(e) => e.stopPropagation()}
            >
          
              <div className="flex lg:hidden justify-center w-full pt-4 pb-2">
                <hr className="w-10 border-2 border-black/10 rounded-full" />
              </div>

              <div className="px-5 py-4 flex flex-col gap-5 flex-1 overflow-y-auto">
               
                <div className="flex justify-between items-start pt-2 lg:pt-0">
                  <h2 className="font-bold text-xl sm:text-2xl leading-tight">{title}</h2>
                  <button 
                    onClick={onClose}
                    className="p-1.5 hover:bg-black/5 rounded-full transition-colors hidden lg:block"
                  >
                    <Icon icon="lucide:x" className="text-xl opacity-40" />
                  </button>
                </div>

              
                {image && (
                  <div className="w-full h-48 sm:h-64 relative rounded-xl overflow-hidden shadow-sm border border-black/5 bg-black/5">
                    <Image
                      src={image}
                      alt={title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

               
                <div className="flex flex-col gap-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40">{t("text238")}</span>
                    <p className="text-[13px] sm:text-sm opacity-80 leading-relaxed font-medium">
                      {description}
                    </p>
                </div>
              </div>

            
              <div className="px-5 py-5 border-t border-black/5 bg-white">
                <Button onClick={onClose} buttonText={t("text239")} chain="ethereum"/>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default InformationPopUp;