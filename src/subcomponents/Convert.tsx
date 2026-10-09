'use client';

import { useEffect, useState } from 'react';
import ConvertToken from './ConvertToken';


import ConvertHistory from './ConvertHistory';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Poster } from './ipow/Poster';
import poster from '@/assets/background-convert-token.jpg';
import { bitcoin } from '..';
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
  
     
      <div className="flex flex-col gap-6">

       
<Poster
  image={poster}
  title={t("convertHeroTitle")}
  text={t("convertHeroText")}
  corner={
    <span className="rounded-full bg-white/90 text-ink px-3 py-1.5 flex items-center gap-2 shadow-sm">
      <Image src={bitcoin} alt="" className="w-6 h-6 rounded-full object-contain" />
      <span className="flex flex-col leading-tight pr-1">
        <span className="text-[9px] uppercase tracking-wide">Interoperable Proof of Work</span>
        <span className="text-xs font-bold whitespace-nowrap">Powered by Bitcoin</span>
      </span>
    </span>
  }
/>
       

<div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
  {/* The tabs first on a phone, on the right on a wide screen. */}
  <div className="inset-well rounded-2xl bg-paper border border-ink/10 p-4 sm:p-5 flex flex-col gap-5 min-w-0 lg:order-2">
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

            <div>
        {activeComponent === 0 && <ConvertToken />}
        {activeComponent === 1 && <ConvertHistory />}
      </div>
  </div>
  <section className="min-w-0 lg:order-1 rounded-2xl bg-paper border border-ink/10 p-5 flex flex-col gap-4" aria-labelledby="converting-title">
    <div className="flex flex-col gap-1">
      <h2 id="converting-title" className="text-lg font-bold">{t("convertSideTitle")}</h2>
      <p className="text-xs opacity-70">{t("convertSideText")}</p>
    </div>
    <ConvertHistory inProgress />
  </section>
</div>
    </div>


      
  );
}

export default Convert;
