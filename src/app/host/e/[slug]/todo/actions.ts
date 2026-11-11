"use server";

import { revalidatePath } from "next/cache";
import { normaliseMobile, parseSide } from "@/lib/guestlist";
import { hostGate, type HostContext } from "@/lib/host";
import { addHelper, addTask, deleteHelper, deleteTask, findHelper, findTask, updateHelper, updateTask, type TaskInput } from "@/lib/store/admin";
import { isTaskStatus, isValidDay } from "@/lib/todo";
import type { Side } from "@/lib/types";

export type FormState = { ok: boolean; message: string } | null;

const text = (v: FormDataEntryValue | null) => String(v ?? "").replace(/\s+/g, " ").trim();

/** Any host of the event may use the to-do list; a co-owner only on their own side. */
async function who(slug: string): Promise<{ host: HostContext } | { error: string }> {
  const gate = await hostGate(slug);
  if (!gate.ok) return { error: gate.reason === "not_host" ? "You are not a host of this event." : "Please sign in again." };
  return { host: gate.host };
}

const mayTouch = (host: HostContext, side: Side) => !host.side || host.side === side;

const done = (slug: string, message: string): FormState => {
  revalidatePath(`/host/e/${slug}/todo`);
  return { ok: true, message };
};

function readHelper(host: HostContext, fd: FormData): { ok: true; value: { fullName: string; phone: string | null; side: Side } } | { ok: false; message: string } {
  const fullName = text(fd.get("fullName"));
  if (!fullName) return { ok: false, message: "Enter their full name." };
  if (fullName.length > 120) return { ok: false, message: "That name is too long." };
  const phone = normaliseMobile(text(fd.get("phone")));
  if (!phone.ok) return { ok: false, message: "That mobile number doesn't look right. Use 10 digits, e.g. 98765 43210." };
  const side = host.side ?? parseSide(text(fd.get("side")));
  if (!side) return { ok: false, message: "Choose the bride's side or the groom's side." };
  return { ok: true, value: { fullName, phone: phone.value, side } };
}

export async function addPerson(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const h = readHelper(w.host, fd);
  if (!h.ok) return { ok: false, message: h.message };
  await addHelper(w.host.event.id, w.host.userId, h.value);
  return done(slug, `Added ${h.value.fullName}.`);
}

export async function editPerson(slug: string, id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const current = await findHelper(w.host.event.id, id);
  if (!current || !mayTouch(w.host, current.side)) return { ok: false, message: "That person isn't on your list." };
  const h = readHelper(w.host, fd);
  if (!h.ok) return { ok: false, message: h.message };
  await updateHelper(w.host.event.id, id, h.value);
  return done(slug, "Saved.");
}

export async function removePerson(slug: string, id: string): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const current = await findHelper(w.host.event.id, id);
  if (!current || !mayTouch(w.host, current.side)) return { ok: false, message: "That person isn't on your list." };
  const removed = await deleteHelper(w.host.event.id, id);
  if (!removed) return { ok: false, message: `${current.fullName} still has tasks. Give them to someone else or delete them first.` };
  return done(slug, `Removed ${current.fullName}.`);
}

async function readTask(host: HostContext, fd: FormData): Promise<{ ok: true; value: TaskInput } | { ok: false; message: string }> {
  const title = text(fd.get("title"));
  if (!title) return { ok: false, message: "Write what needs doing." };
  if (title.length > 200) return { ok: false, message: "Keep the task under 200 characters; put the rest in the note." };
  const note = String(fd.get("note") ?? "").trim() || null;
  if (note && note.length > 1000) return { ok: false, message: "The note is too long." };
  const helperId = text(fd.get("helperId"));
  const helper = helperId ? await findHelper(host.event.id, helperId) : null;
  if (!helper || !mayTouch(host, helper.side)) return { ok: false, message: "Choose who will do it." };
  const functionId = text(fd.get("functionId")) || null;
  if (functionId && !host.functions.some((f) => f.id === functionId)) return { ok: false, message: "Choose a function from the list." };
  const dueOn = text(fd.get("dueOn"));
  if (!isValidDay(dueOn)) return { ok: false, message: "Choose the deadline." };
  const status = text(fd.get("status")) || "todo";
  if (!isTaskStatus(status)) return { ok: false, message: "Choose a status." };
  return { ok: true, value: { helperId: helper.id, title, note, functionId, dueOn, status } };
}

export async function addTodo(slug: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const t = await readTask(w.host, fd);
  if (!t.ok) return { ok: false, message: t.message };
  await addTask(w.host.event.id, w.host.userId, t.value);
  return done(slug, "Task added.");
}

export async function editTodo(slug: string, id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const current = await findTask(w.host.event.id, id);
  if (!current || !mayTouch(w.host, current.side)) return { ok: false, message: "That task isn't on your list." };
  const t = await readTask(w.host, fd);
  if (!t.ok) return { ok: false, message: t.message };
  await updateTask(w.host.event.id, id, w.host.userId, t.value);
  return done(slug, "Task saved.");
}

export async function setTodoStatus(slug: string, id: string, status: string): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  if (!isTaskStatus(status)) return { ok: false, message: "Choose a status." };
  const current = await findTask(w.host.event.id, id);
  if (!current || !mayTouch(w.host, current.side)) return { ok: false, message: "That task isn't on your list." };
  await updateTask(w.host.event.id, id, w.host.userId, { status });
  return done(slug, "Updated.");
}

export async function removeTodo(slug: string, id: string): Promise<FormState> {
  const w = await who(slug);
  if ("error" in w) return { ok: false, message: w.error };
  const current = await findTask(w.host.event.id, id);
  if (!current || !mayTouch(w.host, current.side)) return { ok: false, message: "That task isn't on your list." };
  await deleteTask(w.host.event.id, id);
  return done(slug, `Deleted "${current.title}".`);
}
