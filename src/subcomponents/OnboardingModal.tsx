"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { AnimatedModal } from "@/subcomponents/AnimatedModal";
import Button from "@/subcomponents/Button";
import toast from "react-hot-toast";


interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  network?: string;
  initialEmail?: string;
  isReauth?: boolean;
}

type OnboardingStep = "form" | "submitting" | "check-email";

export default function OnboardingModal({
  isOpen,
  onClose,
  walletAddress,
  network,
  initialEmail,
  isReauth,
}: OnboardingModalProps) {
  const t = useTranslations("All");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<OnboardingStep>("form");

  useEffect(() => {
    if (isOpen && initialEmail) {
      setEmail(initialEmail);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("text325"));
      return;
    }

    setStep("submitting");
    try {
      const targetNetwork = (network || "SOLANA").toUpperCase();
      const res = await fetch("/api/auth/onboarding/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          walletAddress: walletAddress.trim(),
          network: targetNetwork,
          ...(isReauth ? { isReauth: true } : {}),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep("check-email");
        toast.success(t("text326"));
      } else {
        toast.error(data.error || t("text327"));
        setStep("form");
      }
    } catch (error) {
      console.error(error);
      toast.error(t("text328"));
      setStep("form");
    }
  };

  const handleClose = () => {
    // Reset state on close
    setEmail("");
    setStep("form");
    onClose();
  };

  return (
    <AnimatedModal isOpen={isOpen} onClose={handleClose} maxWidthClass="lg:w-120">
      <div className="p-6 sm:p-8 flex flex-col gap-6 text-black">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-linear-to-r from-neutral-900 to-neutral-500 bg-clip-text text-transparent">
            {isReauth ? t("text330") : t("text314")}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1.5">
            {isReauth ? t("text331") : t("text315")}
          </p>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-600">
                {t("text316")}
              </label>
              <div className="px-4 py-3 rounded-xl border border-black/10 bg-neutral-50 text-xs text-neutral-500 truncate">
                {walletAddress}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-neutral-600">
                {t("text317")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("text318")}
                required
                className="w-full px-4 py-3 rounded-xl border border-black/10 bg-transparent text-sm focus:outline-hidden focus:ring-2 focus:ring-black/10"
              />
            </div>

            <Button
              type="submit"
              buttonText={t("text319")}
              className="w-full py-3 mt-2 font-bold"
            />
          </form>
        )}

        {step === "submitting" && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <span className="loading loading-spinner loading-md text-neutral-500"></span>
            <p className="text-sm font-medium text-neutral-500">
              {t("text320")}
            </p>
          </div>
        )}

        {step === "check-email" && (
          <div className="flex flex-col gap-4 py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold">{t("text321")}</h3>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2 px-4">
                {t("text322")} <span className="font-semibold text-black">{email}</span>{t("text323")}
              </p>
            </div>

            <Button
              buttonText={t("text324")}
              onClick={handleClose}
              className="mt-4 font-semibold"
            />
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}
