import { motion } from "framer-motion";
import { Icon } from "@iconify/react";
import Image from "next/image";

interface ProfileCardProps {
  name: string;
  role: string;
  bio?: string;
  image?: any;
  socials?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
  };
  index?: number;
}

export default function ProfileCard({
  name,
  role,
  bio,
  image,
  socials,
  index = 0,
}: ProfileCardProps) {
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    whileInView: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: index * 0.1,
      },
    },
  };

  const hoverVariants = {
    initial: { y: 0 },
    whileHover: {
      y: -5,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <motion.div
      variants={{ ...cardVariants, ...hoverVariants }}
      initial="initial"
      whileInView="whileInView"
      whileHover="whileHover"
      viewport={{ once: true }}
      className="w-full"
    >
      <div className="relative group rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-6 backdrop-blur-sm hover:border-black/10 dark:hover:border-white/20 shadow-buttonNav dark:shadow-none transition-all duration-300">
        {/* Gradient background on hover */}
        <div className="absolute inset-0 bg-linear-to-br from-black/2 dark:from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative z-10 flex flex-col items-center text-center gap-4">
          {/* Profile Image */}
          {image ? (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-black/5 dark:border-white/20 group-hover:border-black/10 dark:group-hover:border-white/40 transition-colors duration-300">
              <Image
                src={image}
                alt={name}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/5 dark:bg-white/10 border-2 border-black/5 dark:border-white/20 group-hover:border-black/10 dark:group-hover:border-white/40 transition-colors duration-300 flex items-center justify-center">
              <Icon
                icon="ph:user-bold"
                width={48}
                height={48}
                className="text-black/40 dark:text-white/60"
              />
            </div>
          )}

          {/* Name */}
          <div>
            <h3 className="text-lg md:text-xl font-bold text-black dark:text-white">
              {name}
            </h3>
            <p className="text-sm md:text-base text-secondary dark:text-white/60 font-medium mt-1">
              {role}
            </p>
          </div>

          {/* Social Links */}
          {socials && Object.keys(socials).length > 0 && (
            <div className="flex gap-3 mt-4 justify-center">
              {socials.github && (
                <a
                  href={socials.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-300 flex items-center justify-center text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white"
                >
                  <Icon icon="mdi:github" width={20} height={20} />
                </a>
              )}
              {socials.twitter && (
                <a
                  href={socials.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-300 flex items-center justify-center text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white"
                >
                  <Icon icon="mdi:twitter" width={20} height={20} />
                </a>
              )}
              {socials.linkedin && (
                <a
                  href={socials.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-300 flex items-center justify-center text-black/60 dark:text-white/70 hover:text-black dark:hover:text-white"
                >
                  <Icon icon="mdi:linkedin" width={20} height={20} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
