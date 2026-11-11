import type { Side } from "./types";

// The family's to-do list: people (helpers who never sign in) and the tasks
// given to them. Pure rules here; storage in store/admin.ts and store/supabase.ts.

export type TaskStatus = "todo" | "doing" | "done";
export const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
export const STATUS_LABEL: Record<TaskStatus, string> = { todo: "To do", doing: "In progress", done: "Done" };

export interface Helper {
  id: string;
  fullName: string;
  phone: string | null;
  /** null = both sides (the event's owner). */
  side: Side | null;
  /** Set when this person is one of the event's hosts (owner or co-owner). */
  hostUserId: string | null;
}

export interface Task {
  id: string;
  helperId: string;
  side: Side | null;
  title: string;
  note: string | null;
  functionId: string | null;
  dueOn: string; // YYYY-MM-DD, India date
  status: TaskStatus;
  updatedAt: string;
}

export function isTaskStatus(v: unknown): v is TaskStatus {
  return v === "todo" || v === "doing" || v === "done";
}

/** Today's date in India, YYYY-MM-DD. */
export function todayIst(now = Date.now()): string {
  return new Date(now + 330 * 60_000).toISOString().slice(0, 10);
}

/** Past its deadline and not done. A task due today is not overdue yet. */
export function isOverdue(task: Pick<Task, "dueOn" | "status">, today: string): boolean {
  return task.status !== "done" && task.dueOn < today;
}

export function isValidDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Open tasks first by deadline, then done ones (most recent deadline first). */
export function sortTasks<T extends Pick<Task, "dueOn" | "status" | "title">>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const ad = a.status === "done" ? 1 : 0;
    const bd = b.status === "done" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (a.dueOn !== b.dueOn) return ad ? (a.dueOn < b.dueOn ? 1 : -1) : a.dueOn < b.dueOn ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** The WhatsApp message that tells a helper about their task. */
export function taskMessage(o: { helperName: string; eventName: string; title: string; due: string; functionName: string | null; note: string | null }): string {
  const lines = [
    `Namaskar ${o.helperName},`,
    `For ${o.eventName}${o.functionName ? ` (${o.functionName})` : ""}, could you please take care of this:`,
    `*${o.title}*`,
    `By ${o.due}.`,
  ];
  if (o.note) lines.push(o.note);
  lines.push("Please reply when it's done. Thank you!");
  return lines.join("\n");
}
