'use client'

import { ReactNode, Suspense} from 'react'
import toast, { Toaster } from 'react-hot-toast'
import Navbar from '@/subcomponents/Navbar'
import Footer from '@/subcomponents/Footer'

import { OnboardingProvider } from '@/components/providers/onboarding-provider'
import { BrandPulseLoader } from '@/components/ui/BrandPulseLoader'

export function UiLayout({ children }: { children: ReactNode }) {

  return (
      <div className="min-h-screen flex flex-col">
      <div className="grow mx-4 z-10">
          <Navbar />
            {/* Room for the fixed navbar. */}
            <div className="h-24"></div>
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
      <Footer />
    </div>
  )
}
