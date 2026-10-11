// The poster that opens a page: one image, one fixed height on every page
// (the text never stretches it; text is never clipped, so keep titles short),
// a title and one line under it, and an
// optional mark in its corner.

import Image, { type StaticImageData } from "next/image";

export function Poster({ image, title, text, corner, wide = true }: { image: StaticImageData; title: string; text: string; corner?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="relative rounded-2xl overflow-hidden h-[240px] sm:h-[340px] flex items-end">
      <Image src={image} alt="" fill priority placeholder="blur" quality={90} sizes={wide ? "(min-width: 1024px) 1152px, 100vw" : "(min-width: 1024px) 680px, 100vw"} className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      {corner && <div className="absolute top-4 right-4">{corner}</div>}
      <div className="relative p-6 sm:p-8 max-w-xl text-white flex flex-col gap-3">
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.08] pb-[0.08em]" style={{ textWrap: "balance" }}>
          {title}
        </h1>
        <p className="text-sm sm:text-base leading-relaxed opacity-90">{text}</p>
      </div>
    </div>
  );
}
