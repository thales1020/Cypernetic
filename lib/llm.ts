import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { generateText, Output, streamText as aiStreamText, type ModelMessage } from "ai";
import type { z } from "zod";

// Gemini by default; Claude if only an Anthropic key is configured.
const useGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) || !process.env.ANTHROPIC_API_KEY;
// Tried in order: when a model is overloaded (503) or rate limited (429), fall through to the next one.
const MODELS = useGemini
  ? [process.env.GEMINI_MODEL ?? "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
  : [process.env.CLAUDE_MODEL ?? "claude-opus-5-5"];
export const MODEL = MODELS[0];

function model(id: string) {
  return useGemini ? google(id) : anthropic(id);
}

function isCapacityError(err: unknown): boolean {
  return /(429|503|500)|overloaded|high demand|UNAVAILABLE|RESOURCE_EXHAUSTED|quota/i.test(
    err instanceof Error ? `${err.message} ${JSON.stringify(err)}` : String(err),
  );
}

export function hasCredentials(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/** One structured-output call validated against a Zod schema. */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S> & { _model: string }> {
  let lastError: unknown;
  for (const id of MODELS) {
    try {
      const result = await generateText({
        model: model(id),
        instructions: opts.system,
        prompt: opts.prompt,
        output: Output.object({ schema: opts.schema }),
        maxOutputTokens: opts.maxTokens ?? 32000,
        maxRetries: 1,
      });
      if (result.finishReason === "length") throw new Error("Output was truncated. Try a smaller case.");
      return { ...(result.output as object), _model: id } as z.infer<S> & { _model: string };
    } catch (err) {
      lastError = err;
      if (!isCapacityError(err)) throw err;
      console.warn(`${id} unavailable, trying next model`);
    }
  }
  throw lastError;
}

/** Streams plain text for the Q&A panel. */
export function streamText(opts: { system: string; messages: ModelMessage[] }): Response {
  const result = aiStreamText({
    // Q&A uses the stable fast model; streams can't fall back mid-response.
    model: model(useGemini ? (process.env.GEMINI_ASK_MODEL ?? "gemini-2.5-flash") : MODELS[0]),
    instructions: opts.system,
    messages: opts.messages,
    maxOutputTokens: 4000,
    onError: ({ error }) => console.error("ask stream failed", error),
  });
  return result.toTextStreamResponse({ headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export function errorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/api key|401|403|permission/i.test(msg)) return "The AI provider rejected the API key.";
  if (/429|quota|rate/i.test(msg)) return "The AI provider is rate limiting us. Please retry in a minute.";
  return msg;
}
