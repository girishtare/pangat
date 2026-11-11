import Link from "next/link";
import { ClipboardList, Pencil, Users } from "lucide-react";
import { hostGate } from "@/lib/host";
import { formatDay } from "@/lib/i18n";
import { displayPhone, whatsappLink } from "@/lib/outreach";
import { scopeLabel } from "@/lib/sides";
import { listHelpers, listTasks } from "@/lib/store/supabase";
import { isOverdue, sortTasks, taskMessage, todayIst, type Helper, type Task } from "@/lib/todo";
import type { Side as SideType } from "@/lib/types";
import { shortDay } from "@/lib/when";
import PopupButton from "../../../../ui/PopupButton";
import { EmptyState, PageHeader, SideBadge, WhatsAppIcon } from "../../../../ui/kit";
import { EventShell, GateMessage } from "../../../HostChrome";
import { DeleteButton, PersonForm, StatusSwitch, TaskForm } from "./TodoForms";

export const dynamic = "force-dynamic";

type Show = "open" | "done" | "all";

export default async function Todo({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string; side?: string; person?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const gate = await hostGate(slug);
  if (!gate.ok) return <GateMessage gate={gate} title="To-do" />;
  const { host } = gate;

  // Read as the host: a co-owner only gets their own side's people and tasks.
  const [helpers, allTasks] = await Promise.all([listHelpers(host.client, host.event.id), listTasks(host.client, host.event.id)]);
  const show: Show = sp.show === "done" || sp.show === "all" ? sp.show : "open";
  const side: SideType | null = host.side ?? (sp.side === "bride" || sp.side === "groom" ? sp.side : null);
  const person = helpers.find((h) => h.id === sp.person) ?? null;
  const today = todayIst();

  const helperById = new Map(helpers.map((h) => [h.id, h]));
  const fnName = new Map(host.functions.map((f) => [f.id, f.name.en]));
  // Tasks given to the owner (no side) show on every side's view.
  const inScope = allTasks.filter((t) => (!side || t.side === side || t.side === null) && (!person || t.helperId === person.id));
  const counts = {
    todo: inScope.filter((t) => t.status === "todo").length,
    doing: inScope.filter((t) => t.status === "doing").length,
    done: inScope.filter((t) => t.status === "done").length,
    overdue: inScope.filter((t) => isOverdue(t, today)).length,
  };
  const tasks = sortTasks(inScope.filter((t) => (show === "all" ? true : show === "done" ? t.status === "done" : t.status !== "done")));
  const openFor = (helperId: string) => allTasks.filter((t) => t.helperId === helperId && t.status !== "done").length;

  // Hosts first (owner, then co-owners), then everyone else, by name.
  const people = [...helpers].sort((a, b) => rank(a) - rank(b) || a.fullName.localeCompare(b.fullName));
  const allHelperOptions = people.map((h) => ({
    id: h.id,
    label: `${h.fullName}${h.hostUserId ? ` (${roleOf(h)})` : ""}${host.side ? "" : ` · ${h.side ? scopeLabel(h.side) : "Both sides"}`}`,
  }));
  const functionOptions = host.functions.map((f) => ({ id: f.id, name: f.name.en }));

  const base = `/host/e/${slug}/todo`;
  const href = (o: { show?: Show; side?: SideType | null; person?: string | null }) => {
    const q = new URLSearchParams();
    const s = o.show ?? show;
    if (s !== "open") q.set("show", s);
    const sd = o.side === undefined ? (host.side ? null : side) : o.side;
    if (sd) q.set("side", sd);
    const p = o.person === undefined ? person?.id : o.person;
    if (p) q.set("person", p);
    const qs = q.toString();
    return qs ? `${base}?${qs}` : base;
  };
  const pill = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border-2 px-4 font-bold ${active ? "border-ink bg-ink text-white" : "border-line bg-card text-ink hover:border-ink"}`;
  const dueLabel = (t: Task) => shortDay(`${t.dueOn}T12:00:00+05:30`);
  const sendHref = (t: Task) => {
    const h = helperById.get(t.helperId);
    if (!h) return null;
    return whatsappLink(
      h.phone,
      taskMessage({
        helperName: h.fullName,
        eventName: host.event.name.en,
        title: t.title,
        due: formatDay(`${t.dueOn}T12:00:00+05:30`, "en"),
        functionName: t.functionId ? (fnName.get(t.functionId) ?? null) : null,
        note: t.note,
      }),
    );
  };
  const taskValues = (t: Task) => ({ id: t.id, title: t.title, note: t.note, helperId: t.helperId, functionId: t.functionId, dueOn: t.dueOn, status: t.status });

  return (
    <EventShell host={host} current="todo">
      <PageHeader
        title="To-do"
        subtitle="Who is doing what, and by when. Give each task to one person, with a deadline."
        actions={
          <>
            <PopupButton label="+ Add a task" title="Add a task">
              <TaskForm slug={slug} helpers={allHelperOptions} functions={functionOptions} />
            </PopupButton>
            <PopupButton label="+ Add a person" title="Add a person" className="btn btn-secondary">
              <PersonForm slug={slug} hostSide={host.side} />
            </PopupButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count value={counts.todo} label="to do" />
        <Count value={counts.doing} label="in progress" />
        <Count value={counts.overdue} label="overdue" warn={counts.overdue > 0} />
        <Count value={counts.done} label="done" />
      </div>

      <section className="mt-8" aria-labelledby="tasks-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="tasks-title" className="font-display text-[1.625rem] text-kumkum">
            Tasks{person ? ` · ${person.fullName}` : ""}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link href={href({ show: "open" })} aria-current={show === "open" ? "true" : undefined} className={pill(show === "open")}>
              Open
            </Link>
            <Link href={href({ show: "done" })} aria-current={show === "done" ? "true" : undefined} className={pill(show === "done")}>
              Done
            </Link>
            <Link href={href({ show: "all" })} aria-current={show === "all" ? "true" : undefined} className={pill(show === "all")}>
              All
            </Link>
          </div>
        </div>
        {(!host.side || person) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {!host.side &&
              ([null, "bride", "groom"] as const).map((s) => (
                <Link
                  key={s ?? "both"}
                  href={href({ side: s, person: null })}
                  aria-current={side === s ? "true" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-3.5 font-semibold ${side === s ? "bg-kumkum text-white" : "bg-paper-deep text-ink hover:bg-sand"}`}
                >
                  {s ? scopeLabel(s) : "Both sides"}
                </Link>
              ))}
            {person && (
              <Link href={href({ person: null })} className="inline-flex min-h-10 items-center font-bold text-kumkum underline">
                Show everyone&apos;s tasks
              </Link>
            )}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={ClipboardList} title={allTasks.length === 0 ? "No tasks yet" : "Nothing here"}>
              {allTasks.length === 0
                ? helpers.length === 0
                  ? "Add the people who are helping, then give each of them tasks with a deadline."
                  : "Use + Add a task to give someone a job with a deadline."
                : show === "open"
                  ? "Every task here is done."
                  : "No tasks match."}
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="table-scroll mt-4 hidden rounded-[1.25rem] border border-line bg-card lg:block">
              <table className="table-p min-w-[900px]">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Who</th>
                    <th>Function</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => {
                    const h = helperById.get(t.helperId);
                    const late = isOverdue(t, today);
                    const send = sendHref(t);
                    return (
                      <tr key={t.id}>
                        <td className="max-w-[20rem]">
                          <p className={`wrap-names font-bold ${t.status === "done" ? "text-ink-soft line-through" : ""}`}>{t.title}</p>
                          {t.note && <p className="wrap-names text-sm text-ink-soft">{t.note}</p>}
                        </td>
                        <td>
                          {h ? (
                            <>
                              <Link href={href({ person: h.id })} className="font-semibold text-kumkum underline-offset-2 hover:underline">
                                {h.fullName}
                              </Link>
                              {!host.side && (
                                <div className="mt-0.5">
                                  <Side side={h.side} />
                                </div>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{t.functionId ? (fnName.get(t.functionId) ?? "—") : "—"}</td>
                        <td className="whitespace-nowrap">
                          <span className={late ? "font-bold text-kumkum" : ""}>{dueLabel(t)}</span>
                          {late && <div className="text-xs font-bold text-kumkum">Overdue</div>}
                        </td>
                        <td>
                          <StatusSwitch slug={slug} id={t.id} status={t.status} title={t.title} />
                        </td>
                        <td className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {send && (
                              <a href={send} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm px-2.5" aria-label={`Send "${t.title}" to ${h?.fullName} on WhatsApp`} title="Send on WhatsApp">
                                <WhatsAppIcon className="h-5 w-5" />
                              </a>
                            )}
                            <PopupButton label={<Pencil className="h-4 w-4" aria-label={`Edit ${t.title}`} />} title="Edit task" className="btn btn-quiet btn-sm">
                              <TaskForm slug={slug} helpers={allHelperOptions} functions={functionOptions} task={taskValues(t)} />
                            </PopupButton>
                            <DeleteButton slug={slug} id={t.id} kind="task" name={t.title} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-3 lg:hidden">
              {tasks.map((t) => {
                const h = helperById.get(t.helperId);
                const late = isOverdue(t, today);
                const send = sendHref(t);
                return (
                  <li key={t.id} className="card p-4">
                    <p className={`wrap-names font-bold ${t.status === "done" ? "text-ink-soft line-through" : ""}`}>{t.title}</p>
                    {t.note && <p className="wrap-names text-sm text-ink-soft">{t.note}</p>}
                    <p className="mt-1.5 text-sm">
                      {h ? (
                        <Link href={href({ person: h.id })} className="font-semibold text-kumkum underline">
                          {h.fullName}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {t.functionId && fnName.get(t.functionId) ? ` · ${fnName.get(t.functionId)}` : ""} ·{" "}
                      <span className={late ? "font-bold text-kumkum" : ""}>
                        by {dueLabel(t)}
                        {late ? " (overdue)" : ""}
                      </span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <StatusSwitch slug={slug} id={t.id} status={t.status} title={t.title} />
                      <span className="inline-flex items-center gap-1">
                        {send && (
                          <a href={send} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp btn-sm px-2.5" aria-label={`Send "${t.title}" on WhatsApp`}>
                            <WhatsAppIcon className="h-5 w-5" />
                          </a>
                        )}
                        <PopupButton label={<Pencil className="h-4 w-4" aria-label={`Edit ${t.title}`} />} title="Edit task" className="btn btn-quiet btn-sm">
                          <TaskForm slug={slug} helpers={allHelperOptions} functions={functionOptions} task={taskValues(t)} />
                        </PopupButton>
                        <DeleteButton slug={slug} id={t.id} kind="task" name={t.title} />
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="mt-10" aria-labelledby="people-title">
        <h2 id="people-title" className="font-display text-[1.625rem] text-kumkum">
          People helping
        </h2>
        <p className="text-ink-soft">
          The owner and co-owners are here by default; add relatives and friends who take on tasks. They don&apos;t sign in; the WhatsApp
          button sends them their task.
          {host.side ? ` You see the ${scopeLabel(host.side).toLowerCase()} only.` : ""}
        </p>
        {helpers.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Users} title="Nobody added yet">
              Use + Add a person: full name, mobile and side.
            </EmptyState>
          </div>
        ) : (
          <div className="relative mt-4 overflow-x-auto rounded-[1.25rem] border border-line bg-card">
            <table className="table-p min-w-[560px]">
              <thead>
                <tr>
                  <th>Full name</th>
                  <th>Side</th>
                  <th>Mobile</th>
                  <th>Open tasks</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {people.map((h) => (
                  <tr key={h.id}>
                    <td className="wrap-names font-semibold">
                      <Link href={href({ person: h.id, side: null })} className="text-kumkum underline-offset-2 hover:underline">
                        {h.fullName}
                      </Link>
                      {h.hostUserId && <span className="ml-2 badge badge-no">{roleOf(h)}</span>}
                    </td>
                    <td>
                      <Side side={h.side} />
                    </td>
                    <td className="whitespace-nowrap">{h.phone ? displayPhone(h.phone) : <span className="text-ink-soft">No mobile</span>}</td>
                    <td>{openFor(h.id)}</td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        {(!h.hostUserId || host.canManage || h.hostUserId === host.userId) && (
                          <PopupButton label={<Pencil className="h-4 w-4" aria-label={`Edit ${h.fullName}`} />} title="Edit person" className="btn btn-quiet btn-sm">
                            <PersonForm slug={slug} hostSide={host.side} person={h} />
                          </PopupButton>
                        )}
                        {!h.hostUserId && <DeleteButton slug={slug} id={h.id} kind="person" name={h.fullName} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </EventShell>
  );
}

function rank(h: Helper): number {
  return h.hostUserId ? (h.side === null ? 0 : 1) : 2;
}

function roleOf(h: Helper): string {
  return h.side === null ? "Owner" : "Co-owner";
}

/** Side badge; the owner (no side) shows as both sides. */
function Side({ side }: { side: SideType | null }) {
  return side ? <SideBadge side={side} /> : <span className="badge badge-no">Both sides</span>;
}

function Count({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className={`card px-[18px] py-4 ${warn ? "border-kumkum" : ""}`}>
      <p className={`font-display text-4xl leading-none ${warn ? "text-kumkum" : "text-ink"}`}>{value}</p>
      <p className="mt-1.5 font-bold">{label}</p>
    </div>
  );
}
