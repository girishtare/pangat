import { describe, expect, it } from "vitest";
import { FUNCTION_ICONS, suggestIcon } from "@/lib/functionIcons";

describe("suggestIcon", () => {
  it("picks from the function's name", () => {
    expect(suggestIcon("Sangeet", [])).toBe("music");
    expect(suggestIcon("Mehendi", [])).toBe("hand");
    expect(suggestIcon("Lagna", [])).toBe("heart");
    expect(suggestIcon("Satyanarayan Puja", [])).toBe("flame");
    expect(suggestIcon("Varat", [])).toBe("car");
    expect(suggestIcon("Wedding cake cutting", [])).toBe("heart");
  });
  it("skips icons other functions use", () => {
    expect(suggestIcon("Manali's Haldi", ["sun"])).toBe("flower");
    expect(suggestIcon("Reception", ["party"])).toBe("sparkles");
  });
  it("returns null when no word matches", () => {
    expect(suggestIcon("Something else", [])).toBeNull();
  });
  it("only suggests icons on the list, each once", () => {
    const keys = FUNCTION_ICONS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
