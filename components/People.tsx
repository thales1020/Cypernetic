"use client";

import type { CaseAnalysis } from "@/lib/types";
import { KIND_META } from "./ui";

/** Who did what: each person with their events and promise record. */
export function People({ analysis }: { analysis: CaseAnalysis }) {
  const norm = (s: string) => s.toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim();
  const sides = ["client", "internal", "unknown"] as const;

  return (
    <div className="space-y-6">
      {sides.map((side) => {
        const people = analysis.actors.filter((a) => a.side === side);
        if (!people.length) return null;
        return (
          <section key={side}>
            <h3 className="label mb-2">{side === "client" ? "Client side" : side === "internal" ? "Our team" : "Other"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {people.map((a) => {
                const events = analysis.events.filter((e) => norm(e.actor) === norm(a.name));
                const made = analysis.commitments.filter((c) => norm(c.by) === norm(a.name));
                const broken = made.filter((c) => c.status === "broken").length;
                const kept = made.filter((c) => c.status === "kept").length;
                return (
                  <article key={a.name} className="bg-panel border border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-xs text-muted">{a.role}</div>
                      </div>
                      <div className="font-mono text-[11px] text-right text-muted">
                        <div>{events.length} actions</div>
                        {made.length > 0 && (
                          <div>
                            {made.length} promises
                            {broken > 0 && <span className="text-red"> · {broken} broken</span>}
                            {kept > 0 && <span className="text-accent"> · {kept} kept</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted mt-2 leading-relaxed">{a.summary}</p>
                    {events.length > 0 && (
                      <div className="flex gap-1 mt-3 flex-wrap">
                        {events.map((e) => (
                          <span
                            key={e.id}
                            title={e.title}
                            className={`w-2.5 h-2.5 rounded-full ${KIND_META[e.kind].dot}`}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
