import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.CLAUDE_EFFORT ?? "medium") as "low" | "medium" | "high";

// Server-side refusal fallback: if the model declines, the API retries on its default fallback model.
const FALLBACK = {
  betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[],
  fallbacks: "default" as const,
};

let client: Anthropic | null = null;
export function claude(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

/** One structured-output call; throws if the model refuses or output doesn't parse. */
export async function structured<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const response = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    ...FALLBACK,
    output_config: { effort: EFFORT, format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (response.stop_reason === "refusal") {
    throw new Error(`Model declined: ${response.stop_details?.explanation ?? "refusal"}`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Output was truncated (max_tokens). Try a smaller case.");
  }
  if (!response.parsed_output) throw new Error("Model returned no parseable output");
  return response.parsed_output as z.infer<S>;
}

/** Streams plain text deltas for the Q&A panel. */
export function streamText(opts: {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
}): ReadableStream<Uint8Array> {
  const stream = claude().beta.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    ...FALLBACK,
    output_config: { effort: "low" },
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: opts.messages,
  });
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_(The model declined to answer this question.)_"));
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n_(Error: ${errorMessage(err)})_`));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
}

export function errorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Invalid or missing Anthropic API key.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Claude API. Please retry in a minute.";
  if (err instanceof Anthropic.BadRequestError) return `Bad request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
