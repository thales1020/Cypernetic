import { analyzeCase, segmentText } from "@/lib/analyze";
import { errorMessage, hasCredentials } from "@/lib/llm";
import { normalizeSources, parseUploads, type UploadedFile } from "@/lib/ingest";
import { rateLimit } from "@/lib/ratelimit";
import type { CaseFile } from "@/lib/types";

export const maxDuration = 300;

const MAX_CHARS = 300_000;

interface AnalyzeBody {
  title?: string;
  client?: string;
  text?: string;
  files?: UploadedFile[];
}

export async function POST(req: Request) {
  if (!hasCredentials()) {
    return Response.json({ error: "The server has no AI API key configured." }, { status: 503 });
  }
  if (!rateLimit(req, "analyze", 5, 60 * 60 * 1000)) {
    return Response.json({ error: "Limit reached: 5 analyses per hour. Try a sample case meanwhile." }, { status: 429 });
  }

  const body = (await req.json()) as AnalyzeBody;
  const files = (body.files ?? []).filter((f) => f?.content);
  const totalChars = (body.text?.length ?? 0) + files.reduce((n, f) => n + f.content.length, 0);
  if (totalChars === 0) return Response.json({ error: "Paste some text or upload files." }, { status: 400 });
  if (totalChars > MAX_CHARS) {
    return Response.json({ error: `Too much input (${totalChars.toLocaleString()} chars, max ${MAX_CHARS.toLocaleString()}).` }, { status: 413 });
  }

  try {
    const { sources: parsed, unstructured } = parseUploads(files);
    if (body.text?.trim()) unstructured.push(body.text);
    const segmented = unstructured.length ? await segmentText(unstructured.join("\n\n")) : [];
    const sources = normalizeSources([...parsed, ...segmented]);
    if (sources.length < 2) {
      return Response.json({ error: "Couldn't find at least two messages in the input." }, { status: 422 });
    }
    const analysis = await analyzeCase(sources);
    const caseFile: CaseFile = {
      meta: {
        id: `local-${Date.now().toString(36)}`,
        title: body.title?.trim() || analysis.headline.slice(0, 80),
        client: body.client?.trim() || "Unknown client",
        summary: analysis.headline,
        createdAt: new Date().toISOString(),
      },
      sources,
      analysis,
    };
    return Response.json(caseFile);
  } catch (err) {
    console.error("analyze failed", err);
    return Response.json({ error: errorMessage(err) }, { status: 500 });
  }
}
