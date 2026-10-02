'use client'

import { ReactNode, Suspense} from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Navbar from '@/subcomponents/Navbar'

import { OnboardingProvider } from '@/components/providers/onboarding-provider'
import { BrandPulseLoader } from '@/components/ui/BrandPulseLoader'

export function UiLayout({ children }: { children: ReactNode }) {

  return (
      <div className="h-full flex flex-col">
      <div className="grow mx-4 z-10">
          <Navbar />
            <div className="h-35"></div>
        <Suspense
          fallback={
            <BrandPulseLoader />
          }
        >  
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
        </Suspense>
        <Toaster position="bottom-right" />
      </div>
    </div>
  )
}
