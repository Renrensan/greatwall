import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";

export interface AccordionItemData {
  title: string;
  content?: React.ReactNode;
  description?: string;
  points?: (string | { label: string; text: string })[];
}

interface AccordionProps {
  items: AccordionItemData[];
  variant?: "glass" | "classic";
  initialExpanded?: number | null;
  className?: string;
  activeColor?: string;
  customIcon?: string;
  titleClassName?: string;
  contentClassName?: string;
}

const Accordion = ({
  items,
  variant = "glass",
  initialExpanded = 0,
  className = "",
  activeColor,
  customIcon,
  titleClassName = "",
  contentClassName = "",
}: AccordionProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(initialExpanded);

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;

        const cardClasses =
          variant === "glass"
            ? `bgBox glass-card p-4 rounded-2xl flex flex-col transition-all cursor-pointer border ${
                isExpanded ? "border-black/5" : "border-transparent"
              }`
            : `flex flex-col bg-white shadow-sm p-5 rounded-2xl cursor-pointer transition-all`;

        return (
          <div
            key={index}
            className={cardClasses}
            onClick={() => setExpandedIndex(isExpanded ? null : index)}
          >
            <div className="flex justify-between items-center group px-1">
              <span
                className={`transition-all ${
                  isExpanded && variant === "classic" ? "text-primary" : "text-black"
                } ${titleClassName || "font-bold text-sm"}`}
                style={{ color: isExpanded ? activeColor : undefined }}
              >
                {item.title}
              </span>
              <Icon
                icon={customIcon || "lucide:chevron-down"}
                className={`text-lg opacity-30 transition-transform duration-300 ${
                  isExpanded ? "rotate-180" : ""
                }`}
                style={{ color: isExpanded ? activeColor : undefined }}
              />
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className={`pt-4 leading-snug opacity-80 px-1 ${contentClassName || "text-[12px] font-medium"}`}>
                    {item.content ? (
                      item.content
                    ) : (
                      <div className="flex flex-col gap-4">
                        {item.description && <p className="leading-relaxed">{item.description}</p>}
                        
                        {item.points && (
                          <div className="flex flex-col gap-3">
                            {item.points.map((point, i) => (
                              <div key={i} className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 last:pb-0">
                                {typeof point === "string" ? (
                                  <div className="flex items-start gap-2 py-0.5">
                                    <div className="w-1 h-1 rounded-full bg-black/20 mt-1.5 shrink-0" />
                                    <span>{point}</span>
                                  </div>
                                ) : (
                                  <>
                                   
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-40 shrink-0">
                                      {point.label}
                                    </span>
                                    <span className="text-[11px] font-bold text-black text-right pl-4">
                                      {point.text}
                                    </span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;