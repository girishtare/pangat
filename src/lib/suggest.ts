import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { cleanSuggestion, suggestPrompt, SUGGEST_SYSTEM, type SuggestKind } from "./marathi";

/**
 * Asks Claude for the Marathi of an English name or title ("Suggest Marathi").
 *
 * Environment variable: ANTHROPIC_API_KEY (secret). Without it nothing is sent
 * and the button says suggestions aren't set up.
 *
 * Model: Claude Opus 5.5 at low effort (short replies, quick). Server-side
 * fallback is on: if the model declines, the API retries on its fallback
 * model inside the same call.
 */
export type SuggestResult = { ok: true; text: string } | { ok: false; reason: "not_set_up" | "failed" | "unusable" };

export function suggestConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

const MODEL = "claude-opus-5-5";

export async function suggestMarathi(kind: SuggestKind, english: string): Promise<SuggestResult> {
  if (!suggestConfigured()) return { ok: false, reason: "not_set_up" };
  const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SUGGEST_SYSTEM,
      messages: [{ role: "user", content: suggestPrompt(kind, english) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, reason: "unusable" };
    const raw = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const text = cleanSuggestion(raw, kind);
    return text ? { ok: true, text } : { ok: false, reason: "unusable" };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("suggest failed", e.status, e.message);
    else console.error("suggest failed", e instanceof Error ? e.message : e);
    return { ok: false, reason: "failed" };
  }
}
