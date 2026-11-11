"use client";

import { useState, useTransition } from "react";
import { Check, ChevronLeft, CircleAlert, Lock } from "lucide-react";
import { formatDay, formatWhen, t } from "@/lib/i18n";
import { eventDays, splitLead } from "@/lib/text";
import { pick, type ArrivalSlot, type HouseholdView, type Lang } from "@/lib/types";
import { MAX_HEADS } from "@/lib/validate";
import Stepper from "../../ui/Stepper";
import { reportNotUs, submitReply } from "./actions";
import Logo from "../../ui/Logo";

type Step = "confirm" | "form" | "done" | "notus";

interface Answer {
  coming: boolean | null;
  heads: number;
  veg: number;
  arrivalSlot: ArrivalSlot;
}

const SLOTS: ArrivalSlot[] = ["early", "on_time", "late"];

/* Pieces shared by the screens. Headings: Playfair Display bold; Marathi falls through to Noto Sans Devanagari bold. */
const heading = "font-heading-e font-bold [font-synthesis-weight:none]";
const card = "rounded-[18px] border border-sand bg-card-e";
const infoBox = "rounded-[14px] border border-sky bg-[#dfe8ef] px-3.5 py-3 text-base text-ink-e";
const dashedRow = "border-t border-dashed border-sand";

function initialAnswers(view: HouseholdView): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const f of view.functions) {
    const r = view.responses.find((x) => x.functionId === f.id);
    out[f.id] = r
      ? { coming: r.status === "yes", heads: r.heads || 2, veg: r.status === "yes" ? r.veg : 2, arrivalSlot: r.arrivalSlot ?? "on_time" }
      : { coming: null, heads: 2, veg: 2, arrivalSlot: "on_time" };
  }
  return out;
}

export default function GuestFlow({
  token,
  view,
  closed,
  source,
  initialLang,
}: {
  token: string;
  view: HouseholdView;
  closed: boolean;
  source: "qr" | "link";
  /** Language the guest chose last time on this phone (cookie), if any. */
  initialLang?: Lang;
}) {
  const hasReplied = view.responses.length > 0;
  const [lang, setLangState] = useState<Lang>(initialLang ?? (view.household.name.mr ? "mr" : "en"));
  const setLang = (next: Lang) => {
    setLangState(next);
    // Remember the choice on this phone, so the page opens in it next time.
    document.cookie = `pangat_lang=${next}; path=/; max-age=31536000; samesite=lax`;
  };
  const [step, setStep] = useState<Step>(hasReplied || closed ? "done" : "confirm");
  const [answers, setAnswers] = useState(() => initialAnswers(view));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (id: string, patch: Partial<Answer>) =>
    setAnswers((prev) => {
      const next = { ...prev[id], ...patch };
      next.heads = Math.min(Math.max(next.heads, 1), MAX_HEADS);
      // Keep "all vegetarian" as the default while the headcount changes.
      if (patch.heads !== undefined && prev[id].veg === prev[id].heads) next.veg = next.heads;
      next.veg = Math.min(Math.max(next.veg, 0), next.heads);
      return { ...prev, [id]: next };
    });

  const submit = () => {
    if (view.functions.some((f) => answers[f.id].coming === null)) {
      setError(t(lang, "answerAll"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitReply({
        token,
        source,
        answers: view.functions.map((f) => {
          const a = answers[f.id];
          return { functionId: f.id, coming: a.coming === true, heads: a.coming ? a.heads : 0, veg: a.coming ? a.veg : 0, arrivalSlot: a.coming ? a.arrivalSlot : null };
        }),
      });
      if (result.ok) setStep("done");
      else setError(t(lang, result.error === "closed" ? "closed" : result.error === "incomplete" ? "answerAll" : "error"));
    });
  };

  const anyComing = view.functions.some((f) => answers[f.id].coming);
  const less = lang === "mr" ? "एक कमी" : "one less";
  const more = lang === "mr" ? "एक जास्त" : "one more";
  const eventName = pick(view.event.name, lang);
  const householdName = pick(view.household.name, lang);
  const days = eventDays(
    view.functions.map((f) => f.startsAt),
    lang,
  );
  const langButton = <LangButton lang={lang} onSwitch={setLang} />;

  return (
    <main lang={lang} className="mx-auto flex min-h-screen max-w-xl flex-col">
      {step === "confirm" && (
        <>
          <TopBar
            left={
              <Logo lang={lang} className="h-9" />
            }
            right={langButton}
          />
          <div className="mx-4 mt-4 rounded-2xl bg-sand px-[18px] pb-[34px] pt-[30px] text-center shadow-[inset_0_0_0_6px_#e5d3af,inset_0_0_0_7px_#790d16,inset_0_0_0_10px_#e5d3af,inset_0_0_0_11px_#790d16]">
            <p className="text-[15px] font-bold text-maroon">{t(lang, "invitedBy")}</p>
            <p className={`${heading} wrap-names mt-1 text-[36px] leading-[1.35] text-maroon`}>{eventName}</p>
            {days && <p className="text-base text-ink-e-soft">{days}</p>}
          </div>
          <div className={`${card} mx-4 mt-[18px] rounded-2xl p-[18px] text-center`}>
            <p className={`${heading} wrap-names text-[26px] leading-[1.4] text-ink-e`}>{householdName}</p>
          </div>
          <h1 className="mx-4 mb-3.5 mt-[26px] text-center text-[22px] font-bold leading-[1.4]">{t(lang, "isThisYou")}</h1>
          <div className="grid gap-3 px-4">
            <BigButton onClick={() => setStep("form")}>{t(lang, "yesThatsUs")}</BigButton>
            <BigButton variant="outline" onClick={() => setStep("notus")}>
              {t(lang, "notUs")}
            </BigButton>
          </div>
          <p className="mx-4 mb-[22px] mt-auto pt-8 text-center text-sm text-ink-e-soft">{t(lang, "quickNoSignup")}</p>
        </>
      )}

      {step === "notus" && <NotUs token={token} lang={lang} langButton={langButton} onBack={() => setStep("confirm")} />}

      {step === "form" && (
        <>
          <div className="flex items-center justify-between gap-2.5 border-b border-sand px-4 pb-3 pt-3.5">
            <div className="min-w-0">
              <h1 className={`${heading} wrap-names text-[22px] leading-[1.3] text-maroon`}>{eventName}</h1>
              <p className="wrap-names text-sm text-ink-e-soft">{householdName}</p>
            </div>
            {langButton}
          </div>
          <p className="mx-4 mb-4 mt-[18px] text-lg leading-[1.6]">{t(lang, "intro")}</p>
          <div className="grid gap-3.5 px-3">
            {view.functions.map((f) => {
              const a = answers[f.id];
              return (
                <fieldset key={f.id} className={`${card} min-w-0 p-4`}>
                  <legend className="sr-only">{pick(f.name, lang)}</legend>
                  <p className={`${heading} wrap-names text-2xl leading-[1.35] text-maroon`} aria-hidden="true">
                    {pick(f.name, lang)}
                  </p>
                  <FunctionWhen f={f} lang={lang} />
                  <div className={`mt-3.5 grid grid-cols-2 gap-2 ${a.coming ? "mb-1.5" : ""}`}>
                    <Choice tone="yes" selected={a.coming === true} onClick={() => update(f.id, { coming: true })}>
                      {t(lang, "coming")}
                    </Choice>
                    <Choice tone="no" selected={a.coming === false} onClick={() => update(f.id, { coming: false })}>
                      {t(lang, "notComing")}
                    </Choice>
                  </div>
                  {a.coming && (
                    <>
                      <div className={`${dashedRow} flex items-center justify-between gap-2.5 py-3`}>
                        <span className="min-w-0 font-bold">{t(lang, "howMany")}</span>
                        <div className="shrink-0">
                          <Stepper
                            variant="guest"
                            label={t(lang, "howMany")}
                            value={a.heads}
                            min={1}
                            max={MAX_HEADS}
                            onChange={(heads) => update(f.id, { heads })}
                            lessLabel={less}
                            moreLabel={more}
                          />
                        </div>
                      </div>
                      {f.catered && (
                        <div className={`${dashedRow} flex items-center justify-between gap-2.5 py-3`}>
                          <span className="min-w-0">
                            <span className="block font-bold">{t(lang, "howManyVeg")}</span>
                            <span className="text-sm text-ink-e-soft">
                              {t(lang, "nonVeg")}: {a.heads - a.veg}
                            </span>
                          </span>
                          <div className="shrink-0">
                            <Stepper
                              variant="guest"
                              label={t(lang, "howManyVeg")}
                              value={a.veg}
                              min={0}
                              max={a.heads}
                              onChange={(veg) => update(f.id, { veg })}
                              lessLabel={less}
                              moreLabel={more}
                            />
                          </div>
                        </div>
                      )}
                      <div className={`${dashedRow} pt-3`}>
                        <p className="mb-2 font-bold">{t(lang, "arrival")}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              aria-pressed={a.arrivalSlot === slot}
                              onClick={() => update(f.id, { arrivalSlot: slot })}
                              className={`min-h-12 rounded-xl border-2 px-1 text-base font-bold leading-tight text-ink-e ${
                                a.arrivalSlot === slot ? "border-sky-ink bg-sky" : "border-sand bg-white hover:border-sky-ink"
                              }`}
                            >
                              {t(lang, slot)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </fieldset>
              );
            })}
          </div>
          <div className="px-4 pb-7 pt-5">
            {error && <ErrorLine className="mb-3">{error}</ErrorLine>}
            <BigButton onClick={submit} disabled={pending}>
              {pending ? t(lang, "saving") : t(lang, "submit")}
            </BigButton>
            <p className="mt-2.5 text-center text-sm text-ink-e-soft">{t(lang, "changeBy").replace("{date}", formatDay(view.event.cutoffAt, lang))}</p>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <TopBar right={langButton} />
          {hasReplied || !closed ? <Thanks text={t(lang, anyComing ? "thanksYes" : "thanksNo")} /> : null}
          <section aria-labelledby="your-reply" className={`${card} mx-4 mt-[22px] px-4 py-1.5`}>
            <h2 id="your-reply" className="wrap-names mb-0.5 mt-2.5 text-[15px] font-bold text-ink-e-soft">
              {t(lang, "yourReply")} · {householdName}
            </h2>
            <ul>
              {view.functions.map((f) => {
                const a = answers[f.id];
                return (
                  <li key={f.id} className="border-b border-dashed border-sand py-3 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-2.5">
                      <span className={`${heading} wrap-names min-w-0 text-xl text-maroon`}>{pick(f.name, lang)}</span>
                      <span className="text-right font-bold">
                        {a.coming === null ? (
                          "—"
                        ) : a.coming ? (
                          <>
                            {t(lang, "coming")} · {a.heads} {t(lang, "people")}
                            {f.catered && <span className="font-normal text-ink-e-soft">{` (${dietSplit(a.heads, a.veg, lang)})`}</span>}
                          </>
                        ) : (
                          <span className="text-ink-e-soft">{t(lang, "notComing")}</span>
                        )}
                      </span>
                    </div>
                    <FunctionWhen f={f} lang={lang} showMap small />
                  </li>
                );
              })}
            </ul>
          </section>
          {closed ? (
            <p className={`${infoBox} mx-4 mt-[18px] flex items-start gap-2`}>
              <Lock className="mt-1 h-4 w-4 shrink-0 text-sky-ink" aria-hidden="true" />
              {t(lang, "closed")}
            </p>
          ) : (
            <>
              <p className={`${infoBox} mx-4 mt-[18px]`}>
                {t(lang, "changeUntil")} <strong>{formatDay(view.event.cutoffAt, lang)}</strong>
              </p>
              <div className="px-4 pt-4">
                <BigButton variant="outline" size="md" onClick={() => setStep("form")}>
                  {t(lang, "change")}
                </BigButton>
              </div>
            </>
          )}
          <p className="wrap-names mx-4 mb-[22px] mt-auto pt-8 text-center text-sm text-ink-e-soft">
            {eventName}
            {days ? ` · ${days}` : ""}
          </p>
        </>
      )}
    </main>
  );
}

function TopBar({ left, right }: { left?: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 px-4 pt-3.5 ${left ? "justify-between" : "justify-end"}`}>
      {left}
      {right}
    </div>
  );
}

/** Shows the other language; the choice is remembered on this phone. */
function LangButton({ lang, onSwitch }: { lang: Lang; onSwitch: (l: Lang) => void }) {
  const other: Lang = lang === "mr" ? "en" : "mr";
  return (
    <button
      type="button"
      lang={other}
      onClick={() => onSwitch(other)}
      className="min-h-11 shrink-0 rounded-full border-2 border-sand bg-card-e px-4 text-base font-bold text-ink-e hover:border-maroon"
    >
      {t(lang, "switchLang")}
    </button>
  );
}

function Thanks({ text }: { text: string }) {
  const [lead, rest] = splitLead(text);
  return (
    <div className="px-5 pt-[18px] text-center">
      <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-sand">
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#790d16" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </div>
      <h1 className={`${heading} mb-1 mt-4 text-[32px] leading-[1.35] text-maroon`}>{lead}</h1>
      {rest && <p className="text-[19px]">{rest}</p>}
    </div>
  );
}

function FunctionWhen({ f, lang, showMap = true, small = false }: { f: HouseholdView["functions"][number]; lang: Lang; showMap?: boolean; small?: boolean }) {
  return (
    <p className={`wrap-names text-ink-e-soft ${small ? "mt-0.5 text-sm" : "text-[15px]"}`}>
      {formatWhen(f.startsAt, lang)}
      {f.venue && ` · ${f.venue}`}
      {showMap && f.mapUrl && (
        <>
          {" · "}
          <a className="font-bold text-maroon underline underline-offset-2 hover:text-maroon-dark" href={f.mapUrl} target="_blank" rel="noreferrer">
            {t(lang, "map")}
          </a>
        </>
      )}
    </p>
  );
}

function ErrorLine({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={`flex items-start gap-1.5 text-[15px] font-semibold text-maroon ${className}`}>
      <CircleAlert className="mt-[3px] h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

/** "This isn't us": take their mobile so a host can send them their own link. Reveals nothing about the guest list. */
function NotUs({ token, lang, langButton, onBack }: { token: string; lang: Lang; langButton: React.ReactNode; onBack: () => void }) {
  const [mobile, setMobile] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lead, rest] = splitLead(t(lang, "notUsAsk"));

  return (
    <>
      <TopBar
        left={
          sent ? undefined : (
            <button type="button" onClick={onBack} className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 font-bold text-maroon hover:text-maroon-dark">
              <ChevronLeft className="h-[22px] w-[22px]" aria-hidden="true" />
              {t(lang, "back")}
            </button>
          )
        }
        right={langButton}
      />
      <div className="px-5 pt-6">
        <h1 className={`${heading} text-[32px] leading-[1.25] text-maroon`}>{lead}</h1>
        {rest && <p className="mt-2.5 text-lg">{rest}</p>}
      </div>
      {sent ? (
        <p role="status" className={`${infoBox} mx-4 mt-6`}>
          {t(lang, "notUsThanks")}
        </p>
      ) : (
        <div className={`${card} mx-4 mt-6 p-[18px]`}>
          <label htmlFor="notus-mobile" className="mb-2 block font-bold">
            {t(lang, "mobileLabel")}
          </label>
          <div className="flex items-stretch overflow-hidden rounded-[14px] border-2 border-maroon bg-white focus-within:shadow-[0_0_0_4px_rgba(174,196,212,0.6)]">
            <span aria-hidden="true" className="flex items-center border-r border-sand bg-cream px-3 font-bold text-ink-e-soft">
              +91
            </span>
            <input
              id="notus-mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "notus-error" : undefined}
              className="min-h-14 min-w-0 flex-1 border-0 bg-white px-3.5 text-[22px] tracking-[0.04em] text-ink-e outline-none! placeholder:text-ink-e-soft/60"
              placeholder="98765 43210"
            />
          </div>
          {error && (
            <div id="notus-error">
              <ErrorLine className="mt-2">{error}</ErrorLine>
            </div>
          )}
          <BigButton
            size="md"
            className="mt-4"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const r = await reportNotUs(token, mobile);
                if (r.ok) setSent(true);
                else setError(t(lang, r.error === "bad_mobile" ? "badMobile" : "notUsHelp"));
              })
            }
          >
            {pending ? t(lang, "saving") : t(lang, "send")}
          </BigButton>
        </div>
      )}
    </>
  );
}

function BigButton({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "lg",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
  size?: "lg" | "md";
  className?: string;
}) {
  const look =
    variant === "primary"
      ? "border-maroon bg-maroon text-white hover:border-maroon-dark hover:bg-maroon-dark"
      : "border-maroon bg-card-e text-maroon hover:bg-sand/40";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center rounded-[14px] border-2 px-4 text-center font-bold leading-tight disabled:cursor-not-allowed disabled:opacity-60 ${
        size === "lg" ? "min-h-[60px] text-xl" : "min-h-14 text-[19px]"
      } ${look} ${className}`}
    >
      {children}
    </button>
  );
}

/** Coming / Can't come. Selected "coming" is maroon, selected "can't come" is muted brown; both get a tick. */
function Choice({ children, selected, onClick, tone }: { children: React.ReactNode; selected: boolean; onClick: () => void; tone: "yes" | "no" }) {
  const on = tone === "yes" ? "border-maroon bg-maroon text-white" : "border-ink-e-soft bg-ink-e-soft text-white";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-[54px] w-full items-center justify-center gap-1.5 rounded-[14px] border-2 px-2 text-center font-bold leading-tight ${
        selected ? on : "border-sand bg-white text-ink-e hover:border-maroon"
      }`}
    >
      {selected && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** "all veg", "all non-veg", or "2 veg, 1 non-veg", in the guest's language. */
function dietSplit(heads: number, veg: number, lang: Lang): string {
  if (veg >= heads) return t(lang, "allVeg");
  if (veg <= 0) return t(lang, "allNonVeg");
  return `${veg} ${t(lang, "veg")}, ${heads - veg} ${t(lang, "nonVegShort")}`;
}
