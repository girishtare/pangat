import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { cleanSuggestion, geminiReplyText, suggestPrompt, SUGGEST_SYSTEM, type SuggestKind } from "./marathi";

/**
 * Asks an AI model for the Marathi of an English name or title ("Suggest Marathi").
 *
 * Provider, by environment variable (secret):
 *   GEMINI_API_KEY      Google Gemini (used first when set). Model gemini-3.8-flash,
 *                       low thinking. On Google's free tier, Google may use what is
 *                       sent (household names) to improve its products; a project with
 *                       billing on (paid tier) doesn't.
 *   ANTHROPIC_API_KEY   Claude Opus 5.5 at low effort, server-side fallback on.
 * With neither, nothing is sent and the button says suggestions aren't set up.
 */
export type SuggestResult = { ok: true; text: string } | { ok: false; reason: "not_set_up" | "failed" | "unusable" };

type Provider = "gemini" | "claude";

function provider(): Provider | null {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  return null;
}

export function suggestConfigured(): boolean {
  return provider() !== null;
}

export async function suggestMarathi(kind: SuggestKind, english: string): Promise<SuggestResult> {
  const p = provider();
  if (!p) return { ok: false, reason: "not_set_up" };
  try {
    const raw = p === "gemini" ? await askGemini(suggestPrompt(kind, english)) : await askClaude(suggestPrompt(kind, english));
    if (raw === null) return { ok: false, reason: "unusable" };
    const text = cleanSuggestion(raw, kind);
    return text ? { ok: true, text } : { ok: false, reason: "unusable" };
  } catch (e) {
    console.error(`suggest failed (${p})`, e instanceof Error ? e.message : e);
    return { ok: false, reason: "failed" };
  }
}

// Stable, Google's strongest Flash model. 3.5 Flash-Lite with minimal thinking changed
// or dropped names in a live test (11 Nov). Its lowest thinking level is LOW (MINIMAL
// returns an error); temperature is ignored on 3.6+ models, so it isn't sent.
const GEMINI_MODEL = "gemini-3.8-flash";

/** Gemini generateContent (REST, v1beta). The key goes in a header, never in the URL. */
async function askGemini(prompt: string): Promise<string | null> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SUGGEST_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // maxOutputTokens counts thinking too, so leave room for it.
      generationConfig: { maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "LOW" } },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }
  return geminiReplyText(await res.json());
}

const CLAUDE_MODEL = "claude-opus-5-5";

async function askClaude(prompt: string): Promise<string | null> {
  const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: SUGGEST_SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return text || null;
}
