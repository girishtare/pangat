import { describe, expect, it } from "vitest";
import { isOverdue, isTaskStatus, isValidDay, sortTasks, taskMessage, todayIst } from "@/lib/todo";

describe("to-do rules", () => {
  it("knows the three statuses", () => {
    expect(isTaskStatus("todo")).toBe(true);
    expect(isTaskStatus("doing")).toBe(true);
    expect(isTaskStatus("done")).toBe(true);
    expect(isTaskStatus("finished")).toBe(false);
  });

  it("counts a task as overdue only after its day, and never once done", () => {
    expect(isOverdue({ dueOn: "2026-12-10", status: "todo" }, "2026-12-11")).toBe(true);
    expect(isOverdue({ dueOn: "2026-12-11", status: "doing" }, "2026-12-11")).toBe(false);
    expect(isOverdue({ dueOn: "2026-12-10", status: "done" }, "2026-12-11")).toBe(false);
  });

  it("uses the India date", () => {
    // 20:00 UTC on 10 Dec is already 11 Dec in India.
    expect(todayIst(Date.UTC(2026, 11, 10, 20, 0))).toBe("2026-12-11");
  });

  it("accepts real calendar days only", () => {
    expect(isValidDay("2026-12-24")).toBe(true);
    expect(isValidDay("2026-02-30")).toBe(false);
    expect(isValidDay("24/12/2026")).toBe(false);
  });

  it("puts open tasks first, soonest deadline first", () => {
    const sorted = sortTasks([
      { title: "c", dueOn: "2026-12-20", status: "done" as const },
      { title: "b", dueOn: "2026-12-15", status: "todo" as const },
      { title: "a", dueOn: "2026-12-01", status: "doing" as const },
    ]);
    expect(sorted.map((t) => t.title)).toEqual(["a", "b", "c"]);
  });

  it("writes a WhatsApp message with the task and deadline", () => {
    const m = taskMessage({ helperName: "Raju Kaka", eventName: "Manali and Anish Wedding", title: "Book the band", due: "20 December", functionName: "Wedding", note: null });
    expect(m).toContain("Namaskar Raju Kaka,");
    expect(m).toContain("(Wedding)");
    expect(m).toContain("*Book the band*");
    expect(m).toContain("By 20 December.");
  });
});
