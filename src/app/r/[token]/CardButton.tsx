"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, ExternalLink, FileText, Share2 } from "lucide-react";
import type { Lang } from "@/lib/types";
import { makeNamedCard } from "../../ui/namedCard";
import { guestCard } from "./actions";

const TEXT = {
  en: { making: "Preparing…", open: "Open", save: "Save", share: "Share" },
  mr: { making: "तयार होत आहे…", open: "उघडा", save: "जतन करा", share: "पाठवा" },
} satisfies Record<Lang, Record<string, string>>;

type Made = { href: string; fileName: string; file: File | null; plain: boolean };

/** Whether the tap that started this still lets the page open a tab (about five seconds in Chrome). */
function tapStillCounts(): boolean {
  const ua = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  return ua ? ua.isActive : true;
}

/** Opens the card in a new tab; false when the browser blocked it (the tap was too long ago). */
function openInTab(href: string): boolean {
  try {
    return window.open(href, "_blank") !== null;
  } catch {
    return false;
  }
}

/**
 * One invitation card button on the reply page (owner, 20 Nov: one page, fewer taps).
 * The card is made in the background once the page is idle (their name on it,
 * on their own phone, as on the card page), so the first tap opens it at once.
 * After that the button is a menu: Open, Save, Share (phones that can share files).
 * If the card can't be made with the name, the plain card is used.
 */
export default function CardButton({
  token,
  cardLang,
  uiLang,
  label,
  compact,
  family,
  fontClass,
}: {
  token: string;
  cardLang: Lang;
  uiLang: Lang;
  label: string;
  compact: boolean;
  family: string;
  fontClass: string;
}) {
  const t = TEXT[uiLang];
  const job = useRef<Promise<Made | null> | null>(null);
  const [made, setMade] = useState<Made | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [menu, setMenu] = useState(false);
  const [used, setUsed] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const make = () => {
    job.current ??= (async (): Promise<Made | null> => {
      const card = await guestCard(token, cardLang);
      if (!card) return null;
      const res = await fetch(card.url);
      if (!res.ok) return { href: card.url, fileName: card.fileName, file: null, plain: true };
      const raw = await res.arrayBuffer();
      let blob = new Blob([raw.slice(0)], { type: card.type });
      if (card.layout) {
        try {
          blob = await Promise.race([
            makeNamedCard(raw, card.type, card.lines, card.layout, family, cardLang),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("took longer than 25 seconds")), 25_000)),
          ]);
        } catch (e) {
          console.warn("named card failed; using the plain card", e);
        }
      }
      const file = new File([blob], card.fileName, { type: blob.type });
      let shareable = false;
      try {
        shareable = !!navigator.canShare?.({ files: [file] });
      } catch {
        // No sharing here: Open and Save still work.
      }
      return { href: URL.createObjectURL(blob), fileName: card.fileName, file: shareable ? file : null, plain: false };
    })().catch((e) => {
      console.error("card failed", e);
      return null;
    });
    return job.current;
  };

  // Start once the page has settled, so the tap finds the card ready.
  useEffect(() => {
    let done = false;
    const start = () => {
      if (done) return;
      done = true;
      void make().then((m) => (m ? setMade(m) : setFailed(true)));
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 2500 }) : window.setTimeout(start, 1200);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
    // Once per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the menu on a tap elsewhere or Escape.
  useEffect(() => {
    if (!menu) return;
    const away = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const fallback = `/r/${encodeURIComponent(token)}/card?l=${cardLang}`;

  const tap = async () => {
    if (used && made) {
      setMenu((m) => !m);
      return;
    }
    // Card page as before when the card couldn't be fetched here.
    if (failed) {
      window.location.href = fallback;
      return;
    }
    setWaiting(true);
    const m = made ?? (await make());
    setWaiting(false);
    if (!m) {
      window.location.href = fallback;
      return;
    }
    setMade(m);
    setUsed(true);
    // Straight to the card while the tap still counts; otherwise the menu, where Open is one tap.
    if (tapStillCounts() && openInTab(m.href)) setMenu(false);
    else setMenu(true);
  };

  const share = async () => {
    if (!made?.file) return;
    try {
      await navigator.share({ files: [made.file] });
    } catch {
      // Cancelled.
    }
    setMenu(false);
  };

  const size = compact ? "min-h-11 gap-1.5 px-2.5 text-[15px]" : "min-h-12 gap-2 px-4 text-base";
  const icon = compact ? "h-[18px] w-[18px] shrink-0" : "h-5 w-5 shrink-0";
  const item = "flex min-h-12 w-full items-center gap-2.5 px-4 text-left text-base font-bold text-ink-e no-underline hover:bg-cream";
  return (
    <div ref={box} className={`relative ${compact ? "" : "w-full"}`}>
      {/* Loads the card font, which the drawing waits for. */}
      <span aria-hidden="true" className={`${fontClass} invisible absolute`}>
        अ <i>a</i>
      </span>
      <button
        type="button"
        onClick={() => void tap()}
        aria-haspopup={used ? "menu" : undefined}
        aria-expanded={used ? menu : undefined}
        aria-busy={waiting || undefined}
        className={`inline-flex w-full items-center justify-center rounded-xl border-2 border-maroon bg-card-e font-bold text-maroon hover:bg-cream ${size}`}
      >
        {waiting ? (
          <span className={`${compact ? "h-4 w-4" : "h-5 w-5"} shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent`} aria-hidden="true" />
        ) : used ? (
          <ChevronDown className={icon} aria-hidden="true" />
        ) : (
          <FileText className={icon} aria-hidden="true" />
        )}
        {waiting && !compact ? t.making : label}
      </button>
      {menu && made && (
        <div role="menu" className="absolute left-1/2 z-20 mt-1.5 w-max min-w-[11rem] -translate-x-1/2 overflow-hidden rounded-xl border border-sand bg-white text-left shadow-[0_8px_24px_rgba(60,30,20,0.18)]">
          <a role="menuitem" href={made.href} target="_blank" rel="noopener" className={item} onClick={() => setMenu(false)}>
            <ExternalLink className="h-5 w-5 shrink-0 text-maroon" aria-hidden="true" />
            {t.open}
          </a>
          <a role="menuitem" href={made.href} download={made.fileName} className={`${item} border-t border-sand`} onClick={() => setMenu(false)}>
            <Download className="h-5 w-5 shrink-0 text-maroon" aria-hidden="true" />
            {t.save}
          </a>
          {made.file && (
            <button role="menuitem" type="button" onClick={() => void share()} className={`${item} border-t border-sand`}>
              <Share2 className="h-5 w-5 shrink-0 text-maroon" aria-hidden="true" />
              {t.share}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
