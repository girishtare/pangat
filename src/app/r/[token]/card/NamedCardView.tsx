"use client";

import { useEffect, useState } from "react";
import type { CardLang, NameLayout } from "@/lib/cardName";
import Logo from "../../../ui/Logo";
import { makeNamedCard } from "../../../ui/namedCard";

const TEXT = {
  en: {
    title: "Your invitation card",
    making: "Preparing your card…",
    open: "Open the card",
    save: "Save the card",
    failed: "Your card couldn't be prepared here.",
    plain: "Open the card without your name",
    back: "Back to your reply",
  },
  mr: {
    title: "आपली निमंत्रण पत्रिका",
    making: "पत्रिका तयार होत आहे…",
    open: "पत्रिका उघडा",
    save: "पत्रिका जतन करा",
    failed: "पत्रिका इथे तयार होऊ शकली नाही.",
    plain: "नावाशिवाय पत्रिका उघडा",
    back: "उत्तराकडे परत",
  },
} satisfies Record<CardLang, Record<string, string>>;

/** Makes the guest's own card (their name and place on the envelope page) on their phone, then offers to open or save it. */
export default function NamedCardView({
  url,
  type,
  lines,
  layout,
  lang,
  family,
  fontClass,
  fileName,
  back,
}: {
  url: string;
  type: string;
  lines: string[];
  layout: NameLayout;
  lang: CardLang;
  family: string;
  fontClass: string;
  fileName: string;
  back: string;
}) {
  const t = TEXT[lang];
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // ?debug=1: on a failure, stay and say which step failed and why (owner, 19 Nov: it failed on a phone).
  const [debug, setDebug] = useState<string | null>(null);

  useEffect(() => {
    let made: string | null = null;
    let cancelled = false;
    let step = "downloading the card";
    const showDebug = new URLSearchParams(window.location.search).get("debug") === "1";
    const fail = (why: string) => {
      if (cancelled) return;
      console.error(`named card failed while ${step}: ${why}`);
      if (showDebug) {
        setDebug(`Failed while ${step}: ${why} · ${navigator.userAgent}`);
        setFailed(true);
      } else {
        // A guest gets the plain card at once rather than an error.
        window.location.replace(url);
      }
    };
    // A phone that takes too long gets the plain card too.
    const slow = setTimeout(() => fail("took longer than 25 seconds"), 25_000);
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`download answered ${res.status}`);
        const file = await res.arrayBuffer();
        const blob = await makeNamedCard(file, type, lines, layout, family, lang, undefined, (s) => (step = s));
        if (cancelled) return;
        clearTimeout(slow);
        made = URL.createObjectURL(blob);
        setBlobUrl(made);
      } catch (e) {
        clearTimeout(slow);
        fail(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(slow);
      if (made) URL.revokeObjectURL(made);
    };
    // Made once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPdf = type === "application/pdf";
  return (
    <div lang={lang} className="w-full max-w-xl text-center">
      {/* Loads the card font, which the drawing waits for. */}
      <span aria-hidden="true" className={`${fontClass} invisible absolute`}>
        अ <i>a</i>
      </span>
      <Logo lang={lang} className="mx-auto h-14" />
      <h1 className="mt-4 font-heading-e text-[26px] font-bold leading-tight text-maroon">{t.title}</h1>

      {!blobUrl && !failed && (
        <p className="mt-6 flex items-center justify-center gap-3" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-maroon border-t-transparent" aria-hidden="true" />
          {t.making}
        </p>
      )}

      {blobUrl && (
        <>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a href={blobUrl} target="_blank" rel="noopener" className="btn btn-primary min-h-[52px] text-base">
              {t.open}
            </a>
            <a href={blobUrl} download={fileName} className="btn btn-secondary min-h-[52px] text-base">
              {t.save}
            </a>
          </div>
          {isPdf ? (
            // Phones open the PDF in their own viewer (the buttons above); laptops also see it here.
            <iframe src={blobUrl} title={t.title} className="mt-6 hidden h-[80vh] w-full rounded-[14px] border border-sand bg-card-e md:block" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={t.title} className="mt-6 w-full rounded-[14px] border border-sand" />
          )}
        </>
      )}

      {failed && (
        <div className="mt-6 rounded-[14px] border border-sand bg-card-e p-4">
          <p>{t.failed}</p>
          {debug && <p className="mt-2 break-words text-left font-mono text-xs text-ink-e-soft">{debug}</p>}
          <a href={url} className="btn btn-secondary mt-3 min-h-[52px] text-base">
            {t.plain}
          </a>
        </div>
      )}

      <p className="mt-8">
        <a href={back} className="font-semibold text-maroon underline">
          {t.back}
        </a>
      </p>
    </div>
  );
}
