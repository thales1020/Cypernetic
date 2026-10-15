"use client";

import { useMemo, useState } from "react";
import type { CaseAnalysis, EventKind } from "@/lib/types";
import { CHANNEL_META, Cites, fmtDate, KIND_META, useCase } from "./ui";

export function Timeline({ analysis }: { analysis: CaseAnalysis }) {
  const [kinds, setKinds] = useState<Set<EventKind>>(new Set());
  const [actor, setActor] = useState<string>("");

  const actors = useMemo(() => [...new Set(analysis.events.map((e) => e.actor))].sort(), [analysis.events]);
  const presentKinds = useMemo(
    () => (Object.keys(KIND_META) as EventKind[]).filter((k) => analysis.events.some((e) => e.kind === k)),
    [analysis.events],
  );
  const visible = (e: CaseAnalysis["events"][number]) =>
    (kinds.size === 0 || kinds.has(e.kind)) && (!actor || e.actor === actor);

  // Events not assigned to any phase still need to show up.
  const assigned = new Set(analysis.phases.flatMap((p) => p.eventIds));
  const phases = [...analysis.phases];
  const orphans = analysis.events.filter((e) => !assigned.has(e.id)).map((e) => e.id);
  if (orphans.length) phases.push({ name: "Other events", start: "", end: "", summary: "", eventIds: orphans });
  const byId = new Map(analysis.events.map((e) => [e.id, e]));

  return (
    <div className="space-y-5">
      <ChannelStrip />

      <div className="flex flex-wrap items-center gap-2">
        {presentKinds.map((k) => {
          const on = kinds.has(k);
          return (
            <button
              key={k}
              onClick={() => {
                const next = new Set(kinds);
                if (on) next.delete(k);
                else next.add(k);
                setKinds(next);
              }}
              className={`flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider border px-2 py-1 ${
                on ? "border-ink text-ink" : "border-line text-muted hover:text-ink"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${KIND_META[k].dot}`} />
              {KIND_META[k].label}
            </button>
          );
        })}
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="bg-panel border border-line font-mono text-[11px] text-muted px-2 py-1 ml-auto"
        >
          <option value="">All people</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {phases.map((phase, pi) => {
        const events = phase.eventIds.map((id) => byId.get(id)).filter((e) => e && visible(e));
        if (!events.length) return null;
        return (
          <section key={pi}>
            <div className="flex items-baseline gap-3 mb-2">
              <span className="font-mono text-xs text-accent">PHASE {pi + 1}</span>
              <h3 className="font-semibold">{phase.name}</h3>
              {phase.start && (
                <span className="font-mono text-[11px] text-faint">
                  {fmtDate(phase.start, false)} – {fmtDate(phase.end, false)}
                </span>
              )}
            </div>
            <ol className="relative border-l border-line ml-[7px]">
              {events.map((e) => {
                const k = KIND_META[e!.kind];
                const alarm = e!.kind === "miss" || e!.kind === "escalation";
                return (
                  <li key={e!.id} className="relative pl-6 pb-4">
                    <span className={`absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full ${k.dot}`} />
                    <div className={`bg-panel border px-4 py-3 ${alarm ? "border-red/40" : "border-line"}`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-[11px] text-faint">{fmtDate(e!.time)}</span>
                        <span className={`font-mono text-[10px] uppercase tracking-wider ${k.text}`}>{k.label}</span>
                        <span className="text-xs text-muted">{e!.actor}</span>
                        <span className="ml-auto">
                          <Cites ids={e!.sourceIds} />
                        </span>
                      </div>
                      <div className="font-medium mt-1">{e!.title}</div>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{e!.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/** One row per channel; each tick is a message, so you can see where the conversation lived over time. */
function ChannelStrip() {
  const { sourcesById, openSource } = useCase();
  const sources = [...sourcesById.values()];
  if (sources.length < 2) return null;
  const t0 = new Date(sources[0].timestamp).getTime();
  const t1 = new Date(sources[sources.length - 1].timestamp).getTime();
  const span = Math.max(t1 - t0, 1);
  const days = Math.ceil(span / 86_400_000);
  const tickEvery = days > 40 ? 14 : days > 14 ? 7 : 1;

  return (
    <div className="bg-panel border border-line p-4">
      <div className="label mb-3">Activity by channel</div>
      <div className="space-y-2">
        {(["ticket", "email", "chat"] as const).map((ch) => (
          <div key={ch} className="grid grid-cols-[56px_1fr] items-center gap-2">
            <span className={`font-mono text-[10px] uppercase ${CHANNEL_META[ch].color.split(" ")[0]}`}>{ch}</span>
            <div className="relative h-5 bg-panel-2">
              {sources
                .filter((s) => s.channel === ch)
                .map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSource(s.id)}
                    title={`${s.id} · ${s.author} · ${fmtDate(s.timestamp)}`}
                    style={{ left: `${((new Date(s.timestamp).getTime() - t0) / span) * 100}%` }}
                    className={`absolute top-0.5 bottom-0.5 w-[3px] -ml-[1px] hover:w-[6px] ${
                      ch === "ticket" ? "bg-amber" : ch === "email" ? "bg-blue" : "bg-violet"
                    }`}
                  />
                ))}
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[56px_1fr] gap-2">
          <span />
          <div className="relative h-4 font-mono text-[10px] text-faint">
            {Array.from({ length: Math.floor(days / tickEvery) + 1 }, (_, i) => {
              const t = t0 + i * tickEvery * 86_400_000;
              const pct = ((t - t0) / span) * 100;
              if (pct > 100) return null;
              return (
                <span key={i} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pct}%` }}>
                  {fmtDate(new Date(t).toISOString(), false)}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
