"use client";

// Error boundaries must be Client Components

import "./globals.css";
import Image from "next/image";
import greatwallLogo from "@/assets/greatwall-logo.png";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="font-grotesk w-full min-h-screen flex flex-col justify-center items-center bg-white px-5">
          <div className="bgBox w-full max-w-md flex flex-col items-center gap-5 text-center border-black/5">
            <div className="flex items-center gap-1.5">
              <Image src={greatwallLogo} alt="Greatwall" className="w-auto h-6" />
              <p className="text-lg font-black">Greatwall</p>
            </div>

            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black/5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-7 h-7 text-black"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>

            <div className="flex flex-col gap-1.5">
              <h2 className="text-black text-xl sm:text-2xl font-bold">
                Something went wrong
              </h2>
              <p className="text-secondary text-xs sm:text-sm">
                An unexpected error occurred. You can try again, or reload
                the page if the problem continues.
              </p>
            {error?.message && <p className="text-xs break-words opacity-70 font-mono">{error.message}{error.digest ? ` (${error.digest})` : ""}</p>}
            </div>

            {error?.digest && (
              <code className="text-[10px] sm:text-xs text-secondary bg-black/5 rounded-full px-3 py-1">
                Error ID: {error.digest}
              </code>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => reset()}
                className="w-full py-3 font-bold text-buttonText bg-buttonBackground hover:opacity-90 rounded-lg text-xs sm:text-sm px-8"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 font-bold text-black bg-white border border-black/5 hover:bg-black/5 rounded-lg text-xs sm:text-sm px-8"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
