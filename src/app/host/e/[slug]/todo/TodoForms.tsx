"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Trash } from "lucide-react";
import { STATUS_LABEL, TASK_STATUSES, type TaskStatus } from "@/lib/todo";
import type { Side } from "@/lib/types";
import { Alert } from "../../../../ui/kit";
import { addPerson, addTodo, editPerson, editTodo, removePerson, removeTodo, setTodoStatus, type FormState } from "./actions";
import { useFormAction } from "../../../../ui/useFormAction";

function Message({ state }: { state: FormState }) {
  if (!state) return null;
  return <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>;
}

export interface HelperOption {
  id: string;
  label: string; // "Raju Kaka · Bride's side"
}

export interface FunctionOption {
  id: string;
  name: string;
}

export interface TaskValues {
  id: string;
  title: string;
  note: string | null;
  helperId: string;
  functionId: string | null;
  dueOn: string;
  status: TaskStatus;
}

/** Add a task (no `task`) or edit one. */
export function TaskForm({
  slug,
  helpers,
  functions,
  task,
}: {
  slug: string;
  helpers: HelperOption[];
  functions: FunctionOption[];
  task?: TaskValues;
}) {
  const [state, action, pending] = useFormAction(task ? editTodo.bind(null, slug, task.id) : addTodo.bind(null, slug));
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !task) form.current?.reset();
  }, [state, task]);
  if (helpers.length === 0) {
    return <p className="mt-4">Add a person first: every task is given to someone.</p>;
  }
  return (
    <form ref={form} onSubmit={action} className="mt-4 space-y-4">
      <label className="block">
        <span className="label">What needs doing</span>
        <input name="title" required maxLength={200} defaultValue={task?.title ?? ""} className="input" placeholder="Book the band for the wedding" />
      </label>
      <label className="block">
        <span className="label">Who will do it</span>
        <select name="helperId" required defaultValue={task?.helperId ?? ""} className="input">
          <option value="" disabled>
            Choose a person
          </option>
          {helpers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Deadline</span>
          <input name="dueOn" type="date" required defaultValue={task?.dueOn ?? ""} className="input" />
        </label>
        <label className="block">
          <span className="label">
            Function <span className="font-normal text-ink-soft">(optional)</span>
          </span>
          <select name="functionId" defaultValue={task?.functionId ?? ""} className="input">
            <option value="">Not tied to a function</option>
            {functions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="label">
          Note <span className="font-normal text-ink-soft">(optional)</span>
        </span>
        <textarea name="note" maxLength={1000} rows={3} defaultValue={task?.note ?? ""} className="input min-h-24" placeholder="Details, phone numbers, budget…" />
      </label>
      <fieldset>
        <legend className="label">Status</legend>
        <div className="grid grid-cols-3 gap-2">
          {TASK_STATUSES.map((s) => (
            <label key={s} className="choice relative min-h-11 px-2 text-[0.9375rem]">
              <input type="radio" name="status" value={s} defaultChecked={(task?.status ?? "todo") === s} />
              {STATUS_LABEL[s]}
            </label>
          ))}
        </div>
      </fieldset>
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-base">
        {pending ? "Saving…" : task ? "Save task" : "Add task"}
      </button>
    </form>
  );
}

/** Add a person (no `person`) or edit one. Co-owners add on their own side only. */
export function PersonForm({
  slug,
  hostSide,
  person,
}: {
  slug: string;
  hostSide: Side | null;
  person?: { id: string; fullName: string; phone: string | null; side: Side | null; hostUserId?: string | null };
}) {
  const [state, action, pending] = useFormAction(person ? editPerson.bind(null, slug, person.id) : addPerson.bind(null, slug));
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && !person) form.current?.reset();
  }, [state, person]);
  return (
    <form ref={form} onSubmit={action} className="mt-4 space-y-4">
      <label className="block">
        <span className="label">Full name</span>
        <input name="fullName" required maxLength={120} defaultValue={person?.fullName ?? ""} className="input" placeholder="Rajesh (Raju) Joshi" />
      </label>
      <label className="block">
        <span className="label">
          Mobile <span className="font-normal text-ink-soft">(for WhatsApp)</span>
        </span>
        <input name="phone" inputMode="tel" autoComplete="off" defaultValue={person?.phone ?? ""} className="input" placeholder="98765 43210" />
      </label>
      {person?.hostUserId ? (
        <div>
          <p className="label">Side</p>
          <p className="flex flex-wrap items-center gap-2">
            <span className={`badge ${person.side === "groom" ? "badge-groom" : person.side === "bride" ? "badge-bride" : "badge-no"}`}>
              {person.side === "groom" ? "Groom's side" : person.side === "bride" ? "Bride's side" : "Both sides"}
            </span>
            <span className="hint">An owner or co-owner: their side and their place on this list come from Event settings.</span>
          </p>
        </div>
      ) : hostSide ? (
        <input type="hidden" name="side" value={hostSide} />
      ) : (
        <fieldset>
          <legend className="label">Side</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="choice relative">
              <input type="radio" name="side" value="bride" required defaultChecked={person?.side === "bride"} /> Bride&apos;s side
            </label>
            <label className="choice relative">
              <input type="radio" name="side" value="groom" defaultChecked={person?.side === "groom"} /> Groom&apos;s side
            </label>
          </div>
        </fieldset>
      )}
      <Message state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary min-h-[52px] w-full text-base">
        {pending ? "Saving…" : person ? "Save" : "Add person"}
      </button>
    </form>
  );
}

/** To do / In progress / Done, one tap. */
export function StatusSwitch({ slug, id, status, title }: { slug: string; id: string; status: TaskStatus; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The tapped status shows at once; the saved one takes over after the refresh (Codex test, 12 Nov: a save took seconds).
  const [tapped, setTapped] = useState<TaskStatus | null>(null);
  const current = pending && tapped ? tapped : status;
  return (
    <div>
      <div
        role="group"
        aria-label={`Status of ${title}`}
        aria-busy={pending}
        className={`inline-flex gap-1 rounded-xl bg-paper-deep p-1 transition-opacity ${pending ? "opacity-70" : ""}`}
      >
        {TASK_STATUSES.map((s) => {
          const on = s === current;
          const tone = !on ? "text-ink hover:bg-card/70" : s === "done" ? "bg-leaf text-white" : s === "doing" ? "bg-haldi text-ink" : "bg-card text-kumkum shadow-sm";
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() =>
                !on &&
                (setTapped(s),
                start(async () => {
                  const r = await setTodoStatus(slug, id, s);
                  setError(r && !r.ok ? r.message : null);
                  router.refresh();
                }))
              }
              className={`min-h-10 whitespace-nowrap rounded-lg px-2.5 text-sm font-bold ${tone}`}
            >
              {STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-sm text-kumkum">{error}</p>}
    </div>
  );
}

/** Delete a task or a person, after a confirmation. */
export function DeleteButton({ slug, id, kind, name }: { slug: string; id: string; kind: "task" | "person"; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-center">
      <button
        type="button"
        disabled={pending}
        aria-label={`Delete ${name}`}
        title="Delete"
        onClick={() => {
          if (!confirm(kind === "task" ? `Delete the task "${name}"?` : `Remove ${name} from the to-do list?`)) return;
          start(async () => {
            const r = kind === "task" ? await removeTodo(slug, id) : await removePerson(slug, id);
            setError(r && !r.ok ? r.message : null);
            router.refresh();
          });
        }}
        className="btn btn-quiet btn-sm"
      >
        <Trash className="h-4 w-4" aria-hidden="true" />
      </button>
      {error && <span className="max-w-[14rem] text-left text-xs text-kumkum">{error}</span>}
    </span>
  );
}
