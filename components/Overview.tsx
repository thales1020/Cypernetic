"use client";

import { useState } from "react";
import type { CaseAnalysis } from "@/lib/types";
import { Cites, CitedText, fmtDate, Panel, StatusBadge } from "./ui";

export function Overview({ analysis, onTab }: { analysis: CaseAnalysis; onTab: (t: string) => void }) {
  const [copied, setCopied] = useState(false);
  const flagged = analysis.commitments.filter((c) => c.status === "broken" || c.status === "at-risk");

  return (
    <div className="space-y-5">
      {/* What went wrong */}
      <Panel title={<span className="text-red">▲ What went wrong</span>}>
        <ol className="space-y-4">
          {analysis.whatWentWrong.map((f, i) => (
            <li key={i} className="grid grid-cols-[28px_1fr] gap-2">
              <span className="font-mono text-red text-sm">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="font-medium">{f.title}</div>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  <CitedText text={f.detail} />
                </p>
                {f.sourceIds.length > 0 && (
                  <div className="mt-1.5">
                    <Cites ids={f.sourceIds} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Broken promises */}
        <Panel
          title="Broken & at-risk promises"
          right={
            <button onClick={() => onTab("Promises")} className="font-mono text-[11px] text-accent hover:underline">
              all {analysis.commitments.length} →
            </button>
          }
        >
          {flagged.length === 0 ? (
            <p className="text-sm text-muted">No broken promises found.</p>
          ) : (
            <ul className="space-y-3">
              {flagged.map((c) => {
                return (
                  <li key={c.id} className="border-l-2 border-red/60 pl-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={c.status} />
                      <span className="text-sm font-medium">{c.by}</span>
                      <span className="text-faint text-xs">→ {c.to}</span>
                    </div>
                    <p className="text-sm mt-1">“{c.what}”</p>
                    <div className="font-mono text-[11px] text-faint mt-1 flex flex-wrap gap-x-3 items-center">
                      <span>made {fmtDate(c.madeAt, false)}</span>
                      {c.dueAt && <span>due {fmtDate(c.dueAt, false)}</span>}
                      <Cites ids={c.sourceIds} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Contradictions */}
        <Panel title={<span className="text-amber">≠ Contradictions</span>}>
          {analysis.contradictions.length === 0 ? (
            <p className="text-sm text-muted">No contradictions found.</p>
          ) : (
            <ul className="space-y-3">
              {analysis.contradictions.map((f, i) => (
                <li key={i}>
                  <div className="text-sm font-medium">{f.title}</div>
                  <p className="text-sm text-muted mt-1 leading-relaxed">
                    <CitedText text={f.detail} />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Phases summary */}
      <Panel
        title="How it unfolded"
        right={
          <button onClick={() => onTab("Timeline")} className="font-mono text-[11px] text-accent hover:underline">
            full timeline →
          </button>
        }
      >
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {analysis.phases.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-xs text-faint pt-0.5">{i + 1}</span>
              <div>
                <div className="font-medium text-sm">
                  {p.name}{" "}
                  <span className="font-mono text-[11px] text-faint">
                    {fmtDate(p.start, false)}–{fmtDate(p.end, false)}
                  </span>
                </div>
                <p className="text-sm text-muted mt-0.5 leading-relaxed">
                  <CitedText text={p.summary} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Open questions">
          <ul className="space-y-2 text-sm text-muted list-disc pl-4">
            {analysis.openQuestions.map((q, i) => (
              <li key={i}>
                <CitedText text={q} />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Draft reply to client"
          right={
            <button
              onClick={() => {
                navigator.clipboard.writeText(analysis.clientReply);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="font-mono text-[11px] text-accent hover:underline"
            >
              {copied ? "copied ✓" : "copy"}
            </button>
          }
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{analysis.clientReply}</p>
        </Panel>
      </div>

      <p className="font-mono text-[11px] text-faint">
        Generated by {analysis.model} · {fmtDate(analysis.generatedAt)} UTC · every claim links to its source message.
      </p>
    </div>
  );
}
