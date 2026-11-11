/**
 * The Pangat logo from docs/brand: the word in maroon with the saffron dot and
 * smile over it, in English or Marathi (पंगत). Files in public/brand were made
 * from the originals: white made transparent, cropped, 160 px tall (sharp up
 * to 80 px on screen). Set the height with className (e.g. "h-10"); the width
 * follows.
 */
const FILES = {
  en: { src: "/brand/pangat-logo-en.png", width: 396, height: 160, alt: "Pangat" },
  mr: { src: "/brand/pangat-logo-mr.png", width: 334, height: 160, alt: "पंगत" },
} as const;

export default function Logo({
  lang = "en",
  className = "h-10",
  decorative = false,
}: {
  lang?: "en" | "mr";
  className?: string;
  /** True when a text label sits next to it (e.g. inside a link with aria-label). */
  decorative?: boolean;
}) {
  const f = FILES[lang];
  return (
    <img
      src={f.src}
      width={f.width}
      height={f.height}
      alt={decorative ? "" : f.alt}
      lang={decorative ? undefined : lang}
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
