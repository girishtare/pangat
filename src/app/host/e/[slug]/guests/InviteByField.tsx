"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "Send the invitation by": Card and WhatsApp tick boxes (owner, 14 Nov).
 * WhatsApp needs a mobile: with the form's Mobile box empty it can't be
 * ticked, and trying says why, in red beside it. Emptying the Mobile box
 * unticks it. (The server checks the same.)
 */
export default function InviteByField({ card = true, wa = false }: { card?: boolean; wa?: boolean }) {
  const box = useRef<HTMLFieldSetElement>(null);
  const [hasMobile, setHasMobile] = useState(true);
  const [waOn, setWaOn] = useState(wa);
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    const form = box.current?.closest("form");
    if (!form) return;
    const read = () => {
      const el = form.elements.namedItem("mobile");
      const value = el instanceof HTMLInputElement ? el.value.trim() : "";
      setHasMobile(value !== "");
      if (value === "") setWaOn(false);
      else setNudge(false);
    };
    read();
    const afterReset = () => setTimeout(read, 0);
    form.addEventListener("input", read);
    form.addEventListener("reset", afterReset);
    return () => {
      form.removeEventListener("input", read);
      form.removeEventListener("reset", afterReset);
    };
  }, []);

  return (
    <fieldset ref={box}>
      <legend className="label">Send the invitation by</legend>
      <div className="flex flex-wrap items-center gap-2">
        <label className="choice choice-check">
          <input type="checkbox" name="inviteBy" value="card" defaultChecked={card} /> Card
        </label>
        <label
          className={`choice choice-check ${hasMobile ? "" : "cursor-not-allowed opacity-50"}`}
          onClick={(e) => {
            if (!hasMobile) {
              e.preventDefault();
              setNudge(true);
            }
          }}
        >
          <input
            type="checkbox"
            name="inviteBy"
            value="whatsapp"
            checked={waOn}
            aria-disabled={!hasMobile}
            aria-describedby={nudge ? "wa-needs-mobile" : undefined}
            onChange={(e) => hasMobile && setWaOn(e.target.checked)}
          />{" "}
          WhatsApp
        </label>
        {nudge && !hasMobile && (
          <span id="wa-needs-mobile" role="alert" className="text-sm font-semibold text-kumkum">
            Enter phone number to enable the checkbox.
          </span>
        )}
      </div>
      <span className="hint mt-1 block">Tick one or both. The Guest list shows an icon for each, with a tick box for &quot;sent&quot;.</span>
    </fieldset>
  );
}
