'use client';

import { useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';
import HeadlineDappHub from './HeadlineDappHub';
import Trending from './Trending';
import Favorite from './Favorite';
import DappStore from './DappStore';
import { useTranslations } from 'next-intl';



const VALID_SECTIONS = ["trending", "favorite", "dappstore"] as const;
const DEFAULT_SECTION = "trending";

const dapphubTabMap: Record<string, number> = {
  trending: 0,
  favorite: 1,
  dappstore: 2,
};

const reverseDappHubTabMap: Record<number, string> = {
  0: "trending",
  1: "favorite",
  2: "dappstore"
};


function DappHub() {
    const router = useRouter(); 

    const t = useTranslations("All");


    
     
  const { locale, network, section } = useParams<{
      locale: string;
      network: string;
      section: string;
    }>();

    

      const dappSectionFromPath = section ?? DEFAULT_SECTION;
    
      const [activeComponent, setActiveComponent] = useState(() => {
        return dapphubTabMap[dappSectionFromPath] ?? 0;
      });
    
    
      useEffect(() => {
        if (!section) return;
    
        if (!VALID_SECTIONS.includes(section as any)) {
          router.replace(`/${locale}/${network}/dapphub/${DEFAULT_SECTION}`);
          return;
        }
      }, [section, locale, network, router]);
    
    
      useEffect(() => {
        setActiveComponent(dapphubTabMap[dappSectionFromPath] ?? 0);
      }, [dappSectionFromPath]);
    
     const handleTabClick = (index: number) => {
    const sectionName = reverseDappHubTabMap[index];
    router.push(`/${locale}/${network}/dapphub/${sectionName}`, { scroll: false });
  };

  return (
  
     
      <div className="flex flex-col gap-8">
       
<HeadlineDappHub/>
       

{/* TABS */}
<div className="flex justify-between glass-card bgRound border-black/5 dark:border-white/10">
  {[
    { label: "Trending", id: 0 },
    { label: t("text212"), id: 1 },
      { label: "dApp Store", id: 2 },
  ].map((tab) => {
    const isActive = activeComponent === tab.id;
    
    const activeBgClass = (network === 'hedera' || network === 'polkadot')
      ? 'bg-black dark:bg-white'
      : network === 'base'
        ? 'bg-[#0052FF]'
        : `bg-${network}`;
      
    const activeTextClass = (network === 'hedera' || network === 'polkadot')
      ? 'text-white dark:text-black'
      : network === 'robinhood'
        ? 'text-black'
        : 'text-white';

    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => handleTabClick(tab.id)}
        className={`w-full p-3 text-center rounded-full text-xs sm:text-sm transition-all duration-200 ${
          isActive
            ? `font-bold ${activeBgClass} ${activeTextClass}`
            : network === 'base'
              ? 'font-medium hover:bg-[#0052FF]/10'
              : `font-medium  hover:bg-${network}/10`
        }`}
      >
        {tab.label}
      </button>
    );
  })}
</div>

     
      <div>
        {activeComponent === 0 && <Trending />}
        {activeComponent === 1 && <Favorite />}
             {activeComponent === 2 && <DappStore />}
      </div>
    </div>


      
  );
}

export default DappHub;
