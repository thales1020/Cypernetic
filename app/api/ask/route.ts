import { errorMessage, hasCredentials, streamText } from "@/lib/claude";
import { sourcesToPrompt } from "@/lib/ingest";
import { rateLimit } from "@/lib/ratelimit";
import type { CaseAnalysis, SourceItem } from "@/lib/types";

export const maxDuration = 120;

interface AskBody {
  sources: SourceItem[];
  analysis: CaseAnalysis | null;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  if (!hasCredentials()) {
    return new Response("The server has no Anthropic API key configured.", { status: 503 });
  }
  if (!rateLimit(req, "ask", 30, 60 * 60 * 1000)) {
    return new Response("Limit reached: 30 questions per hour.", { status: 429 });
  }

  const { sources, analysis, messages } = (await req.json()) as AskBody;
  if (!Array.isArray(sources) || !sources.length || !Array.isArray(messages) || !messages.length) {
    return new Response("Missing case or question.", { status: 400 });
  }
  const record = sourcesToPrompt(sources.slice(0, 500));
  if (record.length > 400_000) return new Response("Case too large.", { status: 413 });

  const promises = analysis?.commitments
    .map((c) => `- ${c.by} -> ${c.to}: "${c.what}" (due ${c.dueAt ?? "n/a"}): ${c.status}`)
    .join("\n");

  const system = `You answer questions about one customer case, using only the record below. Every claim must cite the source IDs it comes from in square brackets, like [E4] or [T2][C7]. If the record doesn't contain the answer, say so plainly and suggest who could know. Be concise: short paragraphs or bullets, with dates. Answer in the language the question is asked in.

<record>
${record}
</record>
${promises ? `\n<extracted_commitments>\n${promises}\n</extracted_commitments>` : ""}`;

  try {
    const stream = streamText({
      system,
      messages: messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    return new Response(errorMessage(err), { status: 500 });
  }
}
