"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { saveLocalCase } from "@/lib/local";
import type { CaseFile } from "@/lib/types";

const STEPS = [
  "Splitting messages and normalizing timestamps…",
  "Reading every ticket, email and chat line…",
  "Extracting who did what, and every promise made…",
  "Checking each promise against what happened next…",
  "Finding root causes and contradictions…",
  "Drafting the client reply…",
];

const EXAMPLE = `From: Maria Gomez <maria@contoso.com>
To: support@yourco.com
Date: Mon, 5 Oct 2026 09:12:00 +0000
Subject: Invoices missing tax line

Hi, since Friday all our invoices are generated without the VAT line. Our accountant needs this fixed before month-end close.

---
[Ticket SUP-901] Oct 5 2026 10:03, Alex (Support): Reproduced. Assigning to billing team. We'll have an update for you by tomorrow EOD.

[#billing-eng] Oct 5 2026 11:20, Sam: VAT line disappeared after the tax provider migration. Need finance to confirm rates before we redeploy.
[#billing-eng] Oct 7 2026 16:45, Sam: still waiting on finance.

From: Maria Gomez <maria@contoso.com>
Date: Thu, 8 Oct 2026 08:00:00 +0000
Subject: Re: Invoices missing tax line

No update since Monday. Month-end close is in 3 days. Please escalate.`;

export default function NewCase() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<{ name: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 12000);
    return () => clearInterval(t);
  }, [busy]);

  async function onFiles(list: FileList | null) {
    if (!list) return;
    const read = await Promise.all([...list].map(async (f) => ({ name: f.name, content: await f.text() })));
    setFiles((prev) => [...prev, ...read]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStep(0);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, client, text, files }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      const c = data as CaseFile;
      saveLocalCase(c);
      router.push(`/case/${c.meta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setBusy(false);
    }
  }

  const empty = !text.trim() && files.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="label mb-2">New investigation</div>
      <h1 className="text-3xl font-semibold tracking-tight">Open a case file</h1>
      <p className="text-muted mt-2">
        Paste the raw history in any format: email threads, ticket comments, Slack messages. Or upload exports
        (.eml, Slack .json, ticket .csv, .txt). Claude reconstructs the timeline and every commitment.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Case title (optional)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Invoices missing VAT" className={inputCls} />
          </Field>
          <Field label="Client (optional)">
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Contoso" className={inputCls} />
          </Field>
        </div>

        <Field
          label="Paste history"
          right={
            <button type="button" onClick={() => setText(EXAMPLE)} className="font-mono text-[11px] text-accent hover:underline">
              use example
            </button>
          }
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            placeholder="Paste emails, ticket comments, chat logs…"
            className={`${inputCls} font-mono text-[13px] leading-relaxed`}
          />
        </Field>

        <Field label="Or upload files">
          <label className="block border border-dashed border-line hover:border-muted p-5 text-center cursor-pointer text-sm text-muted">
            <input
              type="file"
              multiple
              accept=".eml,.json,.csv,.txt,.md,.log"
              className="hidden"
              onChange={(e) => onFiles(e.target.files)}
            />
            Click to choose .eml, .json, .csv or .txt files
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between font-mono text-xs bg-panel border border-line px-3 py-1.5">
                  <span>
                    {f.name} <span className="text-faint">· {(f.content.length / 1000).toFixed(1)}k chars</span>
                  </span>
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-faint hover:text-red">
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {error && <p className="text-sm text-red border border-red/40 bg-red/10 px-3 py-2">{error}</p>}

        <button
          disabled={busy || empty}
          className="w-full font-mono text-sm uppercase tracking-wider bg-accent text-bg py-3 disabled:opacity-40 hover:opacity-90"
        >
          {busy ? "Investigating…" : "Investigate"}
        </button>
        {busy && (
          <div className="font-mono text-xs text-muted space-y-1">
            {STEPS.slice(0, step + 1).map((s, i) => (
              <div key={i} className={i === step ? "text-ink animate-pulse" : "text-faint"}>
                {i < step ? "✓" : "›"} {s}
              </div>
            ))}
            <div className="text-faint pt-1">This usually takes 1–2 minutes.</div>
          </div>
        )}
      </form>
    </div>
  );
}

const inputCls =
  "w-full bg-panel border border-line px-3 py-2 placeholder:text-faint focus:outline-none focus:border-muted";

function Field({ label, right, children }: { label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="label">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}
