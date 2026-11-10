"use client";

import { useState, useTransition } from "react";
import { ArrowRight, CalendarDays, Check, CircleCheck, Lock, MapPin, Pencil, Users } from "lucide-react";
import { formatDay, formatWhen, t } from "@/lib/i18n";
import { pick, type ArrivalSlot, type HouseholdView, type Lang } from "@/lib/types";
import { MAX_HEADS } from "@/lib/validate";
import { Divider, Marigold } from "../../ui/kit";
import Stepper from "../../ui/Stepper";
import { reportNotUs, submitReply } from "./actions";

type Step = "confirm" | "form" | "done" | "notus";

interface Answer {
  coming: boolean | null;
  heads: number;
  veg: number;
  arrivalSlot: ArrivalSlot;
}

const SLOTS: ArrivalSlot[] = ["early", "on_time", "late"];

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

  return (
    <main lang={lang} className="mx-auto min-h-screen max-w-xl px-4 pb-16 pt-4 text-[1.0625rem] sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 font-display text-lg font-bold text-kumkum">
          <Marigold className="h-5 w-5" />
          Pangat
        </span>
        <div role="group" aria-label="Language / भाषा" className="flex rounded-full border border-kumkum/40 bg-card p-0.5 text-sm font-semibold">
          {(["mr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={`min-h-10 rounded-full px-4 ${lang === l ? "bg-kumkum text-white" : "text-kumkum"}`}
            >
              {l === "mr" ? "मराठी" : "English"}
            </button>
          ))}
        </div>
      </div>

      <header className="mt-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-haldi-deep">{t(lang, "invitedBy")}</p>
        <Divider className="mx-auto mt-2 max-w-xs" />
        <h1 className="wrap-names mt-3 font-display text-3xl font-bold leading-tight text-kumkum sm:text-4xl">{pick(view.event.name, lang)}</h1>
        <div className="mx-auto mt-5 flex max-w-md items-center justify-center gap-3 rounded-2xl border border-haldi/50 bg-haldi-soft/70 px-4 py-3">
          <Users className="h-6 w-6 shrink-0 text-haldi-deep" aria-hidden="true" />
          <p className="wrap-names font-display text-xl font-bold text-ink">{pick(view.household.name, lang)}</p>
        </div>
      </header>

      {step === "confirm" && (
        <section className="mt-8 space-y-3 text-center">
          <p className="text-xl font-semibold">{t(lang, "isThisYou")}</p>
          <BigButton onClick={() => setStep("form")}>
            <Check className="h-6 w-6" aria-hidden="true" />
            {t(lang, "yesThatsUs")}
          </BigButton>
          <BigButton variant="quiet" onClick={() => setStep("notus")}>
            {t(lang, "notUs")}
          </BigButton>
        </section>
      )}

      {step === "notus" && <NotUs token={token} lang={lang} onBack={() => setStep("confirm")} />}

      {step === "form" && (
        <section className="mt-6 space-y-5">
          <p className="text-center text-lg">{t(lang, "intro")}</p>
          {view.functions.map((f) => {
            const a = answers[f.id];
            return (
              <fieldset key={f.id} className="card overflow-hidden">
                <legend className="sr-only">{pick(f.name, lang)}</legend>
                <div className="border-b border-line bg-paper-deep/70 px-4 py-3">
                  <p className="flex items-center gap-2 font-display text-xl font-bold text-kumkum" aria-hidden="true">
                    <Marigold className="h-5 w-5" />
                    {pick(f.name, lang)}
                  </p>
                  <FunctionWhen f={f} lang={lang} />
                </div>
                <div className="space-y-5 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Choice selected={a.coming === true} onClick={() => update(f.id, { coming: true })}>
                      {a.coming === true && <Check className="h-5 w-5" aria-hidden="true" />}
                      {t(lang, "coming")}
                    </Choice>
                    <Choice selected={a.coming === false} onClick={() => update(f.id, { coming: false })}>
                      {t(lang, "notComing")}
                    </Choice>
                  </div>
                  {a.coming && (
                    <>
                      <div>
                        <p className="mb-2 font-semibold">{t(lang, "howMany")}</p>
                        <div className="flex justify-center">
                          <Stepper
                            size="lg"
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
                        <div>
                          <p className="mb-2 font-semibold">{t(lang, "howManyVeg")}</p>
                          <div className="flex justify-center">
                            <Stepper
                              size="lg"
                              label={t(lang, "howManyVeg")}
                              value={a.veg}
                              min={0}
                              max={a.heads}
                              onChange={(veg) => update(f.id, { veg })}
                              lessLabel={less}
                              moreLabel={more}
                            />
                          </div>
                          <p className="mt-2 text-center">
                            {t(lang, "nonVeg")}: <strong>{a.heads - a.veg}</strong>
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="mb-2 font-semibold">{t(lang, "arrival")}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {SLOTS.map((slot) => (
                            <Choice key={slot} small selected={a.arrivalSlot === slot} onClick={() => update(f.id, { arrivalSlot: slot })}>
                              {t(lang, slot)}
                            </Choice>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </fieldset>
            );
          })}
          {error && (
            <p role="alert" className="alert alert-error justify-center text-center text-lg">
              {error}
            </p>
          )}
          <BigButton onClick={submit} disabled={pending}>
            {pending ? t(lang, "saving") : t(lang, "submit")}
            {!pending && <ArrowRight className="h-6 w-6" aria-hidden="true" />}
          </BigButton>
        </section>
      )}

      {step === "done" && (
        <section className="mt-8 space-y-4">
          {hasReplied || !closed ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <CircleCheck className="h-12 w-12 text-leaf" aria-hidden="true" />
              <p className="font-display text-2xl font-bold text-ink">{t(lang, anyComing ? "thanksYes" : "thanksNo")}</p>
            </div>
          ) : null}
          <div className="card p-4">
            <h2 className="font-display text-lg font-bold text-kumkum">{t(lang, "yourReply")}</h2>
            <ul className="mt-2 divide-y divide-line">
              {view.functions.map((f) => {
                const a = answers[f.id];
                return (
                  <li key={f.id} className="py-3">
                    <div className="font-semibold">{pick(f.name, lang)}</div>
                    <FunctionWhen f={f} lang={lang} showMap />
                    <div className="mt-1 text-lg">
                      {a.coming === null ? (
                        "—"
                      ) : a.coming ? (
                        <span className="font-semibold text-leaf">
                          {`${t(lang, "coming")}: ${a.heads} ${t(lang, "people")}${f.catered ? ` (${a.veg} ${t(lang, "veg")})` : ""}`}
                        </span>
                      ) : (
                        <span className="text-ink-soft">{t(lang, "notComing")}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {closed ? (
            <p className="alert alert-info justify-center text-center text-lg">
              <Lock className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
              {t(lang, "closed")}
            </p>
          ) : (
            <>
              <p className="text-center">
                {t(lang, "changeUntil")} <b>{formatDay(view.event.cutoffAt, lang)}</b>
              </p>
              <BigButton variant="quiet" onClick={() => setStep("form")}>
                <Pencil className="h-5 w-5" aria-hidden="true" />
                {t(lang, "change")}
              </BigButton>
            </>
          )}
        </section>
      )}

      <Divider className="mx-auto mt-12 max-w-xs" />
    </main>
  );
}

function FunctionWhen({ f, lang, showMap = false }: { f: HouseholdView["functions"][number]; lang: Lang; showMap?: boolean }) {
  return (
    <div className="mt-1 space-y-0.5 text-[0.9375rem] text-ink-soft">
      <p className="flex items-center gap-1.5">
        <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
        {formatWhen(f.startsAt, lang)}
      </p>
      {f.venue && (
        <p className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="wrap-names">{f.venue}</span>
          {showMap && f.mapUrl && (
            <a className="ml-1 font-semibold text-kumkum underline" href={f.mapUrl} target="_blank" rel="noreferrer">
              {t(lang, "map")}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

/** "This isn't us": take their mobile so a host can send them their own link. Reveals nothing about the guest list. */
function NotUs({ token, lang, onBack }: { token: string; lang: Lang; onBack: () => void }) {
  const [mobile, setMobile] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <div className="card mt-8 flex flex-col items-center gap-2 p-6 text-center">
        <CircleCheck className="h-10 w-10 text-leaf" aria-hidden="true" />
        <p className="text-lg">{t(lang, "notUsThanks")}</p>
      </div>
    );
  }

  return (
    <section className="card mt-8 space-y-4 p-5">
      <p className="text-center text-lg">{t(lang, "notUsAsk")}</p>
      <label className="block">
        <span className="label text-base">{t(lang, "mobileLabel")}</span>
        <input
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          className="input text-xl"
          placeholder="98765 43210"
        />
      </label>
      {error && (
        <p role="alert" className="alert alert-error">
          {error}
        </p>
      )}
      <BigButton
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
      <BigButton variant="quiet" onClick={onBack}>
        {t(lang, "back")}
      </BigButton>
    </section>
  );
}

function BigButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "quiet";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn w-full min-h-14 text-xl ${variant === "primary" ? "btn-primary" : "btn-secondary"}`}
    >
      {children}
    </button>
  );
}

function Choice({ children, selected, onClick, small }: { children: React.ReactNode; selected: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`choice w-full ${small ? "min-h-12 px-1 text-[0.9375rem]" : "text-lg"}`}>
      {children}
    </button>
  );
}
