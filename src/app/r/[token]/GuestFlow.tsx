"use client";

import { useState, useTransition } from "react";
import { formatDay, formatWhen, t } from "@/lib/i18n";
import { pick, type ArrivalSlot, type HouseholdView, type Lang } from "@/lib/types";
import { MAX_HEADS } from "@/lib/validate";
import { submitReply } from "./actions";

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
}: {
  token: string;
  view: HouseholdView;
  closed: boolean;
  source: "qr" | "link";
}) {
  const hasReplied = view.responses.length > 0;
  const [lang, setLang] = useState<Lang>(view.household.name.mr ? "mr" : "en");
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

  return (
    <main lang={lang} className="mx-auto max-w-md px-5 pb-16 pt-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setLang(lang === "mr" ? "en" : "mr")}
          className="rounded-full border border-kumkum/40 px-4 py-2 text-base text-kumkum"
        >
          {t(lang, "switchLang")}
        </button>
      </div>

      <header className="mt-4 text-center">
        <p className="text-sm uppercase tracking-wide text-kumkum">{t(lang, "invitedBy")}</p>
        <h1 className="mt-1 text-3xl font-bold text-kumkum">{pick(view.event.name, lang)}</h1>
        <p className="mt-3 text-xl font-semibold">{pick(view.household.name, lang)}</p>
      </header>

      {step === "confirm" && (
        <section className="mt-8 space-y-3 text-center">
          <p className="text-xl">{t(lang, "isThisYou")}</p>
          <BigButton onClick={() => setStep("form")}>{t(lang, "yesThatsUs")}</BigButton>
          <BigButton variant="quiet" onClick={() => setStep("notus")}>
            {t(lang, "notUs")}
          </BigButton>
        </section>
      )}

      {step === "notus" && <p className="mt-8 rounded-xl bg-white p-5 text-center text-lg">{t(lang, "notUsHelp")}</p>}

      {step === "form" && (
        <section className="mt-6 space-y-5">
          <p className="text-center text-lg">{t(lang, "intro")}</p>
          {view.functions.map((f) => {
            const a = answers[f.id];
            return (
              <fieldset key={f.id} className="rounded-xl border border-haldi/60 bg-white p-4">
                <legend className="px-1 text-xl font-semibold text-kumkum">{pick(f.name, lang)}</legend>
                <p className="text-base">
                  {formatWhen(f.startsAt, lang)}
                  {f.venue ? ` · ${f.venue}` : ""}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Choice selected={a.coming === true} onClick={() => update(f.id, { coming: true })}>
                    {t(lang, "coming")}
                  </Choice>
                  <Choice selected={a.coming === false} onClick={() => update(f.id, { coming: false })}>
                    {t(lang, "notComing")}
                  </Choice>
                </div>
                {a.coming && (
                  <div className="mt-4 space-y-4">
                    <Stepper label={t(lang, "howMany")} value={a.heads} min={1} max={MAX_HEADS} onChange={(heads) => update(f.id, { heads })} />
                    {f.catered && (
                      <>
                        <Stepper label={t(lang, "howManyVeg")} value={a.veg} min={0} max={a.heads} onChange={(veg) => update(f.id, { veg })} />
                        <p className="text-base">
                          {t(lang, "nonVeg")}: <strong>{a.heads - a.veg}</strong>
                        </p>
                      </>
                    )}
                    <div>
                      <p className="text-lg">{t(lang, "arrival")}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {SLOTS.map((slot) => (
                          <Choice key={slot} small selected={a.arrivalSlot === slot} onClick={() => update(f.id, { arrivalSlot: slot })}>
                            {t(lang, slot)}
                          </Choice>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </fieldset>
            );
          })}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-center text-lg text-red-800">
              {error}
            </p>
          )}
          <BigButton onClick={submit} disabled={pending}>
            {pending ? t(lang, "saving") : t(lang, "submit")}
          </BigButton>
        </section>
      )}

      {step === "done" && (
        <section className="mt-8 space-y-4">
          {hasReplied || !closed ? (
            <p className="text-center text-xl">{t(lang, anyComing ? "thanksYes" : "thanksNo")}</p>
          ) : null}
          <div className="rounded-xl border border-haldi/60 bg-white p-4">
            <h2 className="text-lg font-semibold text-kumkum">{t(lang, "yourReply")}</h2>
            <ul className="mt-2 space-y-3">
              {view.functions.map((f) => {
                const a = answers[f.id];
                return (
                  <li key={f.id} className="text-lg">
                    <div className="font-semibold">{pick(f.name, lang)}</div>
                    <div className="text-base">
                      {formatWhen(f.startsAt, lang)}
                      {f.venue ? ` · ${f.venue}` : ""}
                      {f.mapUrl ? (
                        <>
                          {" · "}
                          <a className="text-kumkum underline" href={f.mapUrl} target="_blank" rel="noreferrer">
                            {t(lang, "map")}
                          </a>
                        </>
                      ) : null}
                    </div>
                    <div>
                      {a.coming === null
                        ? "—"
                        : a.coming
                          ? `${t(lang, "coming")}: ${a.heads} ${t(lang, "people")}${f.catered ? ` (${a.veg} ${t(lang, "veg")})` : ""}`
                          : t(lang, "notComing")}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          {closed ? (
            <p className="text-center text-lg">{t(lang, "closed")}</p>
          ) : (
            <>
              <p className="text-center text-base">
                {t(lang, "changeUntil")} {formatDay(view.event.cutoffAt, lang)}
              </p>
              <BigButton variant="quiet" onClick={() => setStep("form")}>
                {t(lang, "change")}
              </BigButton>
            </>
          )}
        </section>
      )}
    </main>
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
  const look = variant === "primary" ? "bg-kumkum text-white" : "border border-kumkum/40 bg-white text-kumkum";
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`block w-full rounded-xl px-5 py-4 text-xl font-semibold disabled:opacity-60 ${look}`}>
      {children}
    </button>
  );
}

function Choice({ children, selected, onClick, small }: { children: React.ReactNode; selected: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-xl border-2 px-2 font-semibold ${small ? "py-3 text-base" : "py-4 text-lg"} ${
        selected ? "border-kumkum bg-kumkum text-white" : "border-kumkum/30 bg-white text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = "h-14 w-14 rounded-full border-2 border-kumkum text-3xl font-bold text-kumkum disabled:opacity-30";
  return (
    <div>
      <p className="text-lg">{label}</p>
      <div className="mt-2 flex items-center justify-center gap-6">
        <button type="button" aria-label="-" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="w-12 text-center text-3xl font-bold" aria-live="polite">
          {value}
        </span>
        <button type="button" aria-label="+" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
