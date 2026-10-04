'use client';

import { useEffect, useState } from 'react';
import ConvertToken from './ConvertToken';


import ConvertHistory from './ConvertHistory';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import HeadlineConvert from './HeadlineConvert';
import { useTranslations } from 'next-intl';



const VALID_SECTIONS = ["create", "history"] as const;
const DEFAULT_SECTION = "create";

const convertTabMap: Record<string, number> = {
  create: 0,
  history: 1,
};

const reverseConvertTabMap: Record<number, string> = {
  0: "create",
  1: "history",
};


function Convert() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const t = useTranslations("All");


    
    
     
  const { locale, network, section } = useParams<{
      locale: string;
      network: string;
      section: string;
    }>();

    

      const convertSectionFromPath = section ?? DEFAULT_SECTION;
    
      const [activeComponent, setActiveComponent] = useState(() => {
        return convertTabMap[convertSectionFromPath] ?? 0;
      });
    
    
      useEffect(() => {
        if (!section) return;
    
        if (!VALID_SECTIONS.includes(section as any)) {
          router.replace(`/${locale}/${network}/convert/${DEFAULT_SECTION}`);
          return;
        }
      }, [section, locale, network, router]);
    
    
      useEffect(() => {
        setActiveComponent(convertTabMap[convertSectionFromPath] ?? 0);
      }, [convertSectionFromPath]);
    
     const handleTabClick = (index: number) => {
    const sectionName = reverseConvertTabMap[index];
    // Preserve the current query string (notably `to=`) across the tab switch — it's
    // what ScopedDappProviders reads to decide which partner chain's wallet provider
    // to mount, so dropping it here silently unmounts that provider the moment you
    // open History, breaking any estimate/lookup that needs it.
    const qs = searchParams.toString();
    router.push(`/${locale}/${network}/convert/${sectionName}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
  
     
      <div className="flex flex-col gap-8">

       
<HeadlineConvert/>
       

{/* TABS */}
<div className="flex justify-between rounded-md bg-sand p-1 gap-1">
  {[
    { label: t("text25"), id: 0 },
    { label: t("text11"), id: 1 }
  ].map((tab) => {
    const isActive = activeComponent === tab.id;
    return (
      <button
        key={tab.id}
        type="button"
        aria-pressed={isActive}
        onClick={() => handleTabClick(tab.id)}
        className={`w-full px-3 py-2.5 text-center rounded text-xs sm:text-sm transition-colors ${
          isActive ? "font-semibold bg-ink text-snow" : "font-medium text-ink/75 hover:text-ink"
        }`}
      >
        {tab.label}
      </button>
    );
  })}
</div>

      {/* CONTENT */}
      <div>
        {activeComponent === 0 && <ConvertToken />}
        {activeComponent === 1 && <ConvertHistory />}
      </div>
    </div>


      
  );
}

export default Convert;
