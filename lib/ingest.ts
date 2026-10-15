import type { Channel, SourceItem } from "./types";

export type RawSource = Omit<SourceItem, "id"> & { id?: string };

const PREFIX: Record<Channel, string> = { ticket: "T", email: "E", chat: "C" };

/** Sort by time and give every item a stable, citable id: T1, E1, C1... */
export function normalizeSources(raw: RawSource[]): SourceItem[] {
  const counters: Record<Channel, number> = { ticket: 0, email: 0, chat: 0 };
  return raw
    .filter((s) => s.body?.trim())
    .map((s) => ({ ...s, timestamp: toIso(s.timestamp) }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((s) => {
      const channel: Channel = ["ticket", "email", "chat"].includes(s.channel) ? s.channel : "chat";
      counters[channel] += 1;
      return { ...s, channel, id: `${PREFIX[channel]}${counters[channel]}` };
    });
}

function toIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

/** Render sources as compact text for the model, one block per message. */
export function sourcesToPrompt(sources: SourceItem[]): string {
  return sources
    .map((s) => {
      const head = [
        `[${s.id}]`,
        s.timestamp.replace("T", " ").slice(0, 16) + " UTC",
        s.channel.toUpperCase(),
        s.thread ? `(${s.thread})` : "",
        `from: ${s.author}`,
        s.to ? `to: ${s.to}` : "",
        s.subject ? `subject: ${s.subject}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
      return `${head}\n${s.body}`;
    })
    .join("\n\n");
}

// ---------- File parsers for uploads (deterministic; unstructured text goes to the LLM) ----------

export interface UploadedFile {
  name: string;
  content: string;
}

/** Returns parsed sources, plus any text that has no recognizable structure. */
export function parseUploads(files: UploadedFile[]): { sources: RawSource[]; unstructured: string[] } {
  const sources: RawSource[] = [];
  const unstructured: string[] = [];
  for (const f of files) {
    const lower = f.name.toLowerCase();
    try {
      if (lower.endsWith(".eml")) {
        sources.push(parseEml(f.content));
      } else if (lower.endsWith(".json")) {
        const parsed = parseJson(f.content, f.name);
        if (parsed.length) sources.push(...parsed);
        else unstructured.push(`--- ${f.name} ---\n${f.content}`);
      } else if (lower.endsWith(".csv")) {
        const parsed = parseCsv(f.content, f.name);
        if (parsed.length) sources.push(...parsed);
        else unstructured.push(`--- ${f.name} ---\n${f.content}`);
      } else {
        unstructured.push(`--- ${f.name} ---\n${f.content}`);
      }
    } catch {
      unstructured.push(`--- ${f.name} ---\n${f.content}`);
    }
  }
  return { sources, unstructured };
}

function parseEml(text: string): RawSource {
  const [headerPart, ...rest] = text.replace(/\r\n/g, "\n").split(/\n\n/);
  const headers: Record<string, string> = {};
  let last = "";
  for (const line of headerPart.split("\n")) {
    if (/^\s/.test(line) && last) headers[last] += " " + line.trim();
    else {
      const m = line.match(/^([\w-]+):\s*(.*)$/);
      if (m) {
        last = m[1].toLowerCase();
        headers[last] = m[2];
      }
    }
  }
  return {
    channel: "email",
    author: headers.from ?? "unknown",
    to: headers.to,
    subject: headers.subject,
    thread: headers.subject?.replace(/^(re|fwd?):\s*/gi, ""),
    timestamp: headers.date ?? new Date(0).toISOString(),
    body: rest.join("\n\n").trim(),
  };
}

/** Accepts our own format, a Slack export (array of {user|user_name, ts, text}), or ticket comments. */
function parseJson(text: string, fileName: string): RawSource[] {
  const data = JSON.parse(text);
  const items: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.sources) ? data.sources : [];
  const out: RawSource[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const body = str(o.body ?? o.text ?? o.message ?? o.comment ?? o.content);
    if (!body) continue;
    const ts = o.timestamp ?? o.date ?? o.created_at ?? o.created ?? o.time ?? o.ts;
    const timestamp =
      typeof ts === "string" && /^\d+(\.\d+)?$/.test(ts) ? new Date(parseFloat(ts) * 1000).toISOString() : str(ts);
    const isSlack = "ts" in o && ("user" in o || "user_name" in o || "user_profile" in o);
    out.push({
      channel: (str(o.channel) as Channel) || (isSlack ? "chat" : "ticket"),
      author: str(o.author ?? o.user_name ?? o.from ?? o.user ?? o.author_name) || "unknown",
      timestamp: timestamp || new Date(0).toISOString(),
      body,
      subject: str(o.subject ?? o.title) || undefined,
      thread: str(o.thread ?? o.ticket ?? o.key) || fileName.replace(/\.json$/i, ""),
      to: str(o.to) || undefined,
    });
  }
  return out;
}

function parseCsv(text: string, fileName: string): RawSource[] {
  const rows = csvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iBody = col("body", "comment", "text", "message", "description", "content");
  const iTime = col("timestamp", "date", "created", "created_at", "time");
  if (iBody < 0 || iTime < 0) return [];
  const iAuthor = col("author", "from", "user", "reporter", "commenter");
  const iSubject = col("subject", "title", "summary");
  const iThread = col("thread", "ticket", "key", "issue", "id");
  const iChannel = col("channel", "source", "type");
  return rows.slice(1).flatMap((r) =>
    r[iBody]?.trim()
      ? [
          {
            channel: (["ticket", "email", "chat"].includes(r[iChannel]) ? r[iChannel] : "ticket") as Channel,
            author: (iAuthor >= 0 && r[iAuthor]) || "unknown",
            timestamp: r[iTime],
            body: r[iBody],
            subject: iSubject >= 0 ? r[iSubject] : undefined,
            thread: (iThread >= 0 && r[iThread]) || fileName.replace(/\.csv$/i, ""),
          },
        ]
      : [],
  );
}

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
}
