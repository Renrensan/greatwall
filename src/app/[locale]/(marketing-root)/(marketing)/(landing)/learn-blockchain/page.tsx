"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { bannerParahubDekstop, bannerParahubMobile } from "@/index";
import VideoBg from "@/subcomponents/BgComponent";
import DecryptedText from "@/marketing-components/DecryptedText";


const PAGE_CONTENT: any = {
  id: {
    badge: "Materi Gratis",
    title: "Memahami Blockchain dari Dasar Bersama ParaHub",
    subtitle: "Dengan Materi Paradapp",
    description:
      "Melalui materi onboarding dari ParaHub, Anda akan mempelajari blockchain dari dasar dengan bahasa yang sederhana dan mudah dipahami, bahkan jika Anda belum pernah mengenalnya sebelumnya.",
    button: "Dapatkan Materi",
    modalTitle: "Kirim Materi",
    modalSubtitle:
      "Masukkan nomor WhatsApp Anda dan kami akan mengirimkan materi onboarding blockchain langsung ke chat Anda.",
    placeholder: "Nomor WhatsApp (misal: +628123456789)",
    submit: "Kirim Sekarang",
    cancel: "Batal",
    success:
      "Materi onboarding blockchain akan segera dikirim ke WhatsApp Anda. Mohon tunggu beberapa saat.",
    invalidNumber: "Silakan masukkan nomor WhatsApp yang valid.",
  },
  en: {
    badge: "Free Resource",
    title: "Understanding Blockchain from the Ground Up with ParaHub",

    description:
      "Through onboarding materials from ParaHub, you will learn blockchain from the basics in simple, easy-to-understand language, even if you have never encountered it before.",
    button: "Get Materials",
    modalTitle: "Send Materials",
    modalSubtitle:
      "Enter your WhatsApp number and we will send you blockchain onboarding materials directly to your chat.",
    placeholder: "WhatsApp Number (e.g. +628123456789)",
    submit: "Send Now",
    cancel: "Cancel",
    success: "We will send your materials directly on WhatsApp. Please wait!",
    invalidNumber: "Please enter a valid WhatsApp number.",
  },
};

export default function LandingParahubPage() {
  const { locale } = useParams<{ locale: string }>();
  const t = PAGE_CONTENT[locale] || PAGE_CONTENT.en;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setIsSuccess(false);
    setWhatsappNumber("");
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic cleaning and validation
    const cleanNumber = whatsappNumber.trim().replace(/[\s\-()]/g, "");
    const isValid =
      /^\+?[1-9]\d{7,14}$/.test(cleanNumber) ||
      /^08\d{8,11}$/.test(cleanNumber);

    if (!isValid) {
      toast.error(t.invalidNumber);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/marketing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ whatsapp: cleanNumber }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast.success(t.success, { duration: 5000 });
        // Auto close modal after showing success state for 4 seconds
        setTimeout(() => {
          setIsModalOpen(false);
        }, 4000);
      } else {
        toast.error(data.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative min-h-[90vh] flex items-center overflow-hidden pt-28 md:pt-36 pb-20">
        <VideoBg />

        <div className="container mx-auto px-4 z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 flex flex-col items-start text-left space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20">
                <Icon icon="ph:sparkle-fill" /> {t.badge}
              </span>

              <h1 className="text-4xl md:text-6xl font-black tracking-tight text-current leading-none">
                <DecryptedText
                  animateOn="view"
                  sequential={true}
                  revealDirection="start"
                  speed={40}
                  maxIterations={10}
                  text={t.title}
                />
              </h1>

              <p className="text-neutral-600 dark:text-neutral-300 text-lg md:text-xl font-medium max-w-xl leading-relaxed">
                {t.description}
              </p>

              <div className="pt-4">
                <button
                  onClick={handleOpenModal}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-buttonBackground text-buttonText rounded-2xl font-bold text-lg cursor-pointer hover:scale-102 transition-all duration-300 shadow-xl shadow-neutral-950/10 border border-current/10 overflow-hidden"
                >
                  <Icon
                    icon="ic:baseline-whatsapp"
                    className="text-2xl text-current"
                  />
                  <span>{t.button}</span>
                  <Icon
                    icon="ph:arrow-right-bold"
                    className="text-base group-hover:translate-x-1 transition-transform"
                  />
                </button>
              </div>
            </div>

            {/* Right Image Column */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 5,
                  ease: "easeInOut",
                }}
                className="relative w-full max-w-md md:max-w-[540px]"
              >
                {/* Desktop Banner */}
                <Image
                  src={bannerParahubDekstop}
                  alt="ParaHub Banner Desktop"
                  className="hidden md:block w-full h-auto object-contain"
                  priority
                />
                {/* Mobile Banner */}
                <Image
                  src={bannerParahubMobile}
                  alt="ParaHub Banner Mobile"
                  className="block md:hidden w-full h-auto object-contain"
                  priority
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Decorative elements similar to about page */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-white dark:from-[#121212] to-transparent pointer-events-none -z-10" />
      </div>

      {/* WhatsApp Modal Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#151515] text-current shadow-2xl z-10"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-current transition-colors cursor-pointer"
              >
                <Icon icon="ph:x-bold" className="text-xl" />
              </button>

              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-500/10 text-current flex items-center justify-center text-2xl">
                        <Icon icon="ph:book-open-text-duotone" />
                      </div>
                      <h2 className="text-2xl font-black tracking-tight">
                        {t.modalTitle}
                      </h2>
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed font-medium">
                        {t.modalSubtitle}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-neutral-400">
                          <Icon
                            icon="ic:baseline-whatsapp"
                            className="text-xl"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          placeholder={t.placeholder}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-current placeholder-neutral-400 font-medium"
                          disabled={isSubmitting}
                          autoFocus
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="flex-1 py-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl font-bold cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                          disabled={isSubmitting}
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-4 bg-buttonBackground text-buttonText rounded-2xl font-bold cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Icon
                              icon="line-md:loading-loop"
                              className="text-xl"
                            />
                          ) : (
                            <>
                              <span>{t.submit}</span>
                              <Icon icon="ph:paper-plane-tilt-bold" />
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 flex flex-col items-center text-center space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-neutral-500/10 text-current flex items-center justify-center text-4xl">
                      <Icon
                        icon="ph:check-circle-fill"
                        className="animate-bounce"
                      />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">
                      Success!
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-300 font-bold leading-relaxed max-w-xs">
                      {t.success}
                    </p>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "linear" }}
                        className="h-full bg-current"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}