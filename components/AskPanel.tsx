"use client";

import { useEffect, useRef, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { CitedText } from "./ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Why did this take so long to fix?",
  "Who promised what to the client, and which promises were broken?",
  "What did the client know vs. what did we know internally?",
  "What should we change so this doesn't happen again?",
];

export function AskPanel({ caseFile }: { caseFile: CaseFile }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sources: caseFile.sources,
          analysis: caseFile.analysis,
          messages: history.filter((m) => m.content.trim() && !m.content.startsWith("⚠")),
        }),
      });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: text }]);
      }
    } catch (err) {
      setMessages([...history, { role: "assistant", content: `⚠ ${err instanceof Error ? err.message : "Request failed"}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-panel border border-line flex flex-col xl:max-h-[calc(100vh-6rem)]">
      <div className="px-4 py-2.5 border-b border-line flex items-center justify-between">
        <h3 className="label">
          <span className="text-accent">●</span> Ask the case
        </h3>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="font-mono text-[11px] text-faint hover:text-ink">
            clear
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">Answers come only from this case&apos;s messages, with a citation for every claim.</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full text-left text-sm border border-line hover:border-accent/60 px-3 py-2 text-muted hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="text-sm bg-panel-2 border border-line px-3 py-2 ml-6">
              {m.content}
            </div>
          ) : (
            <div key={i} className="text-sm leading-relaxed whitespace-pre-wrap">
              {m.content ? <CitedText text={m.content} /> : <span className="text-faint animate-pulse">investigating…</span>}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-line p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. When did we first know it was urgent?"
          className="flex-1 bg-bg border border-line px-3 py-2 text-sm placeholder:text-faint focus:outline-none focus:border-muted"
        />
        <button
          disabled={busy || !input.trim()}
          className="font-mono text-xs uppercase border border-accent text-accent px-3 disabled:opacity-40 hover:bg-accent hover:text-bg"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
