'use client'

import { ReactNode, Suspense} from 'react'
import { Toaster } from 'react-hot-toast'
import { usePathname } from 'next/navigation'
import Navbar from '@/subcomponents/Navbar'
import Footer from '@/subcomponents/Footer'

import { BrandPulseLoader } from '@/components/ui/BrandPulseLoader'

export function UiLayout({ children }: { children: ReactNode }) {
  // The About page brings its own overlapping footer.
  const hasOwnFooter = usePathname()?.endsWith('/about') ?? false

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
          {children}
        </Suspense>
        <Toaster position="bottom-right" />
      </div>
      {!hasOwnFooter && <Footer />}
    </div>
  )
}
