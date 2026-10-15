"use client";

import { useCallback, useMemo, useState } from "react";
import type { CaseFile } from "@/lib/types";
import { AskPanel } from "./AskPanel";
import { Overview } from "./Overview";
import { People } from "./People";
import { PromiseTracker } from "./PromiseTracker";
import { SourceDrawer } from "./SourceDrawer";
import { SourceList } from "./SourceList";
import { Timeline } from "./Timeline";
import { CaseContext, fmtDate } from "./ui";

const TABS = ["Overview", "Timeline", "Promises", "People", "Sources"] as const;
type Tab = (typeof TABS)[number];

export function CaseView({ caseFile }: { caseFile: CaseFile }) {
  const { meta, sources, analysis } = caseFile;
  const [tab, setTab] = useState<Tab>(analysis ? "Overview" : "Sources");
  const [openId, setOpenId] = useState<string | null>(null);

  const sourcesById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const openSource = useCallback((id: string) => setOpenId(id), []);
  const ctx = useMemo(() => ({ sourcesById, openSource }), [sourcesById, openSource]);

  const first = sources[0]?.timestamp;
  const last = sources[sources.length - 1]?.timestamp;
  const broken = analysis?.commitments.filter((c) => c.status === "broken").length ?? 0;
  const counts = { ticket: 0, email: 0, chat: 0 };
  sources.forEach((s) => counts[s.channel]++);

  return (
    <CaseContext.Provider value={ctx}>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <div className="label mb-2">
            Case file · {meta.client}
            {meta.sample && <span className="ml-2 text-accent">sample data</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{meta.title}</h1>
          {analysis && <p className="mt-2 text-muted max-w-3xl">{analysis.headline}</p>}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-muted">
            <span>
              <span className="text-ink">{sources.length}</span> messages ({counts.ticket} ticket · {counts.email} email · {counts.chat} chat)
            </span>
            {first && last && (
              <span>
                {fmtDate(first, false)} → {fmtDate(last, false)}
              </span>
            )}
            {analysis && (
              <>
                <span>
                  <span className="text-ink">{analysis.actors.length}</span> people
                </span>
                <span>
                  <span className="text-ink">{analysis.commitments.length}</span> promises ·{" "}
                  <span className="text-red">{broken} broken</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">
          <div className="min-w-0">
            <nav className="flex gap-0 border-b border-line mb-5 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  disabled={!analysis && t !== "Sources"}
                  className={`font-mono text-xs uppercase tracking-wider px-4 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors disabled:opacity-30 ${
                    tab === t ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>

            {!analysis && (
              <p className="mb-4 text-sm text-amber">This case has not been analyzed yet. Only the raw sources are available.</p>
            )}
            {analysis && tab === "Overview" && <Overview analysis={analysis} onTab={(t) => setTab(t as Tab)} />}
            {analysis && tab === "Timeline" && <Timeline analysis={analysis} />}
            {analysis && tab === "Promises" && <PromiseTracker commitments={analysis.commitments} />}
            {analysis && tab === "People" && <People analysis={analysis} />}
            {tab === "Sources" && <SourceList sources={sources} />}
          </div>

          <aside className="xl:sticky xl:top-20">
            <AskPanel caseFile={caseFile} />
          </aside>
        </div>
      </div>
      <SourceDrawer id={openId} onClose={() => setOpenId(null)} onNavigate={setOpenId} />
    </CaseContext.Provider>
  );
}
