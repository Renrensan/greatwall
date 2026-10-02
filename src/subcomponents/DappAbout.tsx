"use client";

import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

export interface AboutDappSection {
  id: string;
  title: string;
  title_idn?: string;
  description: string;
  description_idn?: string;
  icon: string;
  variant: "highlight" | "default";
}

export interface AboutDappFeature {
  title: string;
  title_idn?: string;
  description: string;
  description_idn?: string;
}

export interface AboutDappContent {
  name: string;
  name_idn?: string;
  website: string;
  sections: AboutDappSection[];
  features?: AboutDappFeature[];
}

interface DappAboutProps {
  content: AboutDappContent;
}

const DappAbout = ({ content }: DappAboutProps) => {
  const t = useTranslations("All");
  const { locale } = useParams<{ locale: string }>();

  const displayName =
    locale === "id" && content.name_idn ? content.name_idn : content.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-5 sm:p-6 rounded-2xl border border-current/5 relative overflow-hidden"
    >
      <div className="flex flex-col gap-1 mb-5">
        <span className="text-[10px] font-bold text-current/50 tracking-[0.15em] uppercase">
          {displayName}
        </span>
        <h3 className="text-lg font-bold text-current">{t("text204")}</h3>
      </div>

      <div className="space-y-7 text-[13px] leading-relaxed text-current/80">
        {content.sections.map((section) => {
          const sectionTitle =
            locale === "id" && section.title_idn
              ? section.title_idn
              : section.title;
          const sectionDesc =
            locale === "id" && section.description_idn
              ? section.description_idn
              : section.description;

          return (
            <div
              key={section.id}
              className={`relative pl-4 border-l-2 ${
                section.variant === "highlight"
                  ? "border-primary/30"
                  : "border-current/20"
              }`}
            >
              <h4 className="flex items-center gap-2 font-bold text-current text-[15px] mb-2">
                <Icon
                  icon={section.icon || "ph:info-bold"}
                  className="text-lg"
                />{" "}
                {sectionTitle}
              </h4>
              <p className="leading-relaxed">{sectionDesc}</p>
            </div>
          );
        })}

        {content.features && content.features.length > 0 && (
          <div className="rounded-xl bg-current/5 p-4 sm:p-5 border border-current/5">
            <p className="mb-4 font-bold text-current text-[14px]">
              {displayName} {t("text205")}:
            </p>
            <ol className="space-y-4">
              {content.features.map((feature, idx) => {
                const featureTitle =
                  locale === "id" && feature.title_idn
                    ? feature.title_idn
                    : feature.title;
                const featureDesc =
                  locale === "id" && feature.description_idn
                    ? feature.description_idn
                    : feature.description;

                return (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-current/10 text-[10px] font-bold text-current">
                      {idx + 1}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-current font-bold text-[13px]">
                        {featureTitle}
                      </span>
                      <span className="block text-current/60 leading-relaxed">
                        {featureDesc}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Website Link Footer */}
        <div className="flex items-center gap-3 pt-5 border-t border-current/10">
          <div className="w-8 h-8 rounded-full bg-current/5 flex items-center justify-center text-current/60">
            <Icon icon="ph:link-simple-bold" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-current/60 uppercase tracking-wide">
              Website
            </span>
            <a
              href={content.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors font-semibold text-[13px] break-all"
            >
              {content.website}
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DappAbout;
