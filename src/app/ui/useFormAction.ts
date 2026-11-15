"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, type FormEvent } from "react";

/**
 * useActionState for forms people type into, without React's automatic reset.
 *
 * A form whose `action` is a function is reset by React when the action
 * finishes, even when it only returned a validation error, so everything the
 * person typed was wiped (found in the 11 Nov end-to-end test). Here the form
 * is submitted from `onSubmit` instead: on an error the fields stay as typed;
 * on success an "add" form is emptied (reset) for the next entry.
 *
 * An **edit** form passes `{ keep: true }`: after a save its fields stay as
 * they are, which is what was saved. Resetting an edit form put its fields
 * back to the values the page first loaded with: a drop-down (country code)
 * and state-held tick boxes (WhatsApp) don't follow new props, so a second
 * save quietly wrote the old values back (found in the 15 Nov end-to-end test:
 * a +44 number became +91 and WhatsApp was dropped).
 *
 *   const [state, onSubmit, pending] = useFormAction(add.bind(null, slug));          // add form
 *   const [state, onSubmit, pending] = useFormAction(save.bind(null, slug), { keep: true }); // edit form
 *   <form onSubmit={onSubmit}>…
 *
 * `isOk` says which states count as success; the default is `{ ok: true }`.
 */
export function useFormAction<S>(
  action: (prev: S, formData: FormData) => Promise<S>,
  opts: { keep?: boolean; isOk?: (state: S) => boolean } = {},
): [S | null, (e: FormEvent<HTMLFormElement>) => void, boolean] {
  const isOk = opts.isOk ?? ((s: S) => !!s && typeof s === "object" && (s as unknown as { ok?: unknown }).ok === true);
  const keep = !!opts.keep;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const [state, dispatch, pending] = useActionState<any, FormData>(action as any, null);
  const form = useRef<HTMLFormElement | null>(null);

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      form.current = e.currentTarget;
      const data = new FormData(e.currentTarget);
      // The button that was pressed carries a value too (e.g. "Back to the standard message").
      const submitter = (e.nativeEvent as SubmitEvent).submitter;
      if (submitter instanceof HTMLButtonElement && submitter.name) data.append(submitter.name, submitter.value);
      startTransition(() => dispatch(data));
    },
    [dispatch],
  );

  const ok = state != null && isOk(state as S);
  useEffect(() => {
    if (ok && !keep) form.current?.reset();
    // `state` is a new object after every submit, so this runs once per successful save.
  }, [ok, keep, state]);

  return [state as S | null, onSubmit, pending];
}
