import { describe, expect, it } from "vitest";
import { parseSort, sortGuests, type SortableGuest } from "@/lib/guestSort";

const g = (nameEn: string, o: Partial<SortableGuest> = {}): SortableGuest => ({
  nameEn,
  side: "bride",
  mobile: null,
  shortCode: "AAAAAA",
  functionIds: ["f1", "f2"],
  replied: [],
  softCap: null,
  ...o,
});

const names = (rows: SortableGuest[]) => rows.map((r) => r.nameEn);

describe("sortGuests", () => {
  const rows = [
    g("Patil", { side: "groom", mobile: "+919800000003", softCap: 6, replied: ["f1", "f2"] }),
    g("Joshi", { mobile: "+919800000001", softCap: 2, replied: ["f1"] }),
    g("Deshpande", { side: "groom" }),
    g("ajmera", { mobile: "+919800000002", softCap: 4 }),
  ];

  it("keeps the given order with no sort", () => {
    expect(names(sortGuests(rows, null, "asc"))).toEqual(["Patil", "Joshi", "Deshpande", "ajmera"]);
  });

  it("sorts by name either way, ignoring case", () => {
    expect(names(sortGuests(rows, "name", "asc"))).toEqual(["ajmera", "Deshpande", "Joshi", "Patil"]);
    expect(names(sortGuests(rows, "name", "desc"))).toEqual(["Patil", "Joshi", "Deshpande", "ajmera"]);
  });

  it("puts blanks last whichever way (mobile, cap)", () => {
    expect(names(sortGuests(rows, "mobile", "asc"))).toEqual(["Joshi", "ajmera", "Patil", "Deshpande"]);
    expect(names(sortGuests(rows, "mobile", "desc"))).toEqual(["Patil", "ajmera", "Joshi", "Deshpande"]);
    expect(names(sortGuests(rows, "cap", "desc"))).toEqual(["Patil", "ajmera", "Joshi", "Deshpande"]);
  });

  it("sorts by share of invitations sent", () => {
    const m = (card: boolean, wa: boolean, cardSent: boolean, waSent: boolean) => ({ card, wa, cardSent, waSent });
    const sent = [g("Kale", { invite: m(true, true, true, true) }), g("Bhide", { invite: m(true, false, false, false) }), g("Apte", { invite: m(true, true, true, false) })];
    expect(names(sortGuests(sent, "sent", "asc"))).toEqual(["Bhide", "Apte", "Kale"]);
    expect(names(sortGuests(sent, "sent", "desc"))).toEqual(["Kale", "Apte", "Bhide"]);
  });

  it("sorts by side and by share replied, names breaking ties", () => {
    expect(names(sortGuests(rows, "side", "asc"))).toEqual(["ajmera", "Joshi", "Deshpande", "Patil"]);
    expect(names(sortGuests(rows, "replied", "desc"))).toEqual(["Patil", "Joshi", "ajmera", "Deshpande"]);
  });

  it("does not change the array it is given", () => {
    const copy = [...rows];
    sortGuests(rows, "name", "asc");
    expect(rows).toEqual(copy);
  });
});

describe("parseSort", () => {
  it("accepts known columns only", () => {
    expect(parseSort("cap", "desc")).toEqual({ sort: "cap", dir: "desc" });
    expect(parseSort("drop table", "sideways")).toEqual({ sort: null, dir: "asc" });
  });
});

describe("sort by location", () => {
  it("sorts places A to Z with blanks last, either way", () => {
    const rows = [g("A", { location: "Thane" }), g("B", { location: null }), g("C", { location: "borivali" })];
    expect(sortGuests(rows, "location", "asc").map((r) => r.nameEn)).toEqual(["C", "A", "B"]);
    expect(sortGuests(rows, "location", "desc").map((r) => r.nameEn)).toEqual(["A", "C", "B"]);
  });
});
