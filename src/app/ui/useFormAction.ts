"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, type FormEvent } from "react";

/**
 * useActionState for forms people type into, without React's automatic reset.
 *
 * A form whose `action` is a function is reset by React when the action
 * finishes, even when it only returned a validation error, so everything the
 * person typed was wiped (found in the 11 Nov end-to-end test). Here the form
 * is submitted from `onSubmit` instead: on an error the fields stay as typed;
 * on success the form is reset, which puts it back to the saved values the
 * server just sent (or empties an "add" form).
 *
 *   const [state, onSubmit, pending] = useFormAction(save.bind(null, slug));
 *   <form onSubmit={onSubmit}>…
 *
 * `isOk` says which states count as success; the default is `{ ok: true }`.
 */
export function useFormAction<S>(
  action: (prev: S, formData: FormData) => Promise<S>,
  isOk: (state: S) => boolean = (s) => !!s && typeof s === "object" && (s as unknown as { ok?: unknown }).ok === true,
): [S | null, (e: FormEvent<HTMLFormElement>) => void, boolean] {
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
    if (ok) form.current?.reset();
    // `state` is a new object after every submit, so this runs once per successful save.
  }, [ok, state]);

  return [state as S | null, onSubmit, pending];
}
