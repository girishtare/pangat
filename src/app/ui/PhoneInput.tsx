"use client";

import { useEffect, useRef } from "react";
import { COUNTRIES, joinPhone, splitPhone } from "@/lib/phone";

/**
 * A phone number with its country code picked from a list, India first
 * (owner, 14 Nov). Sends one value under `name` ("+919876543210"): the form's
 * data is put together when it is submitted (the "formdata" event), so it also
 * works after a form reset. Sits inside the caller's <label>, which names the
 * country list; the number box is named by `label`.
 */
export default function PhoneInput({
  name,
  defaultValue,
  label,
  required = false,
  placeholder = "98765 43210",
  className = "input",
  id,
}: {
  name: string;
  defaultValue?: string | null;
  label: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const start = splitPhone(defaultValue);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const onData = (e: FormDataEvent) => {
      const cc = String(e.formData.get(`${name}__country`) ?? "IN");
      e.formData.set(name, joinPhone(cc, String(e.formData.get(name) ?? "")));
      e.formData.delete(`${name}__country`);
    };
    form.addEventListener("formdata", onData);
    return () => form.removeEventListener("formdata", onData);
  }, [name]);
  return (
    <div ref={box} className="flex gap-2">
      <select name={`${name}__country`} defaultValue={start.iso} className={`${className} w-[8.5rem] shrink-0 px-2`} aria-label={`${label}: country code`}>
        {COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            +{c.code} {c.name}
          </option>
        ))}
      </select>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        required={required}
        defaultValue={start.local}
        aria-label={label}
        className={`${className} min-w-0 flex-1`}
        placeholder={placeholder}
      />
    </div>
  );
}
