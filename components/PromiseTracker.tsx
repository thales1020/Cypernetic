"use client";

import { useState } from "react";
import type { Commitment, PromiseStatus } from "@/lib/types";
import { CitedText, Cites, fmtDate, STATUS_META, StatusBadge } from "./ui";

const ORDER: PromiseStatus[] = ["broken", "at-risk", "open", "unknown", "kept"];

export function PromiseTracker({ commitments }: { commitments: Commitment[] }) {
  const [filter, setFilter] = useState<PromiseStatus | "all">("all");
  const counts = Object.fromEntries(ORDER.map((s) => [s, commitments.filter((c) => c.status === s).length]));
  const rows = commitments
    .filter((c) => filter === "all" || c.status === filter)
    .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.madeAt.localeCompare(b.madeAt));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterBtn on={filter === "all"} onClick={() => setFilter("all")}>
          All {commitments.length}
        </FilterBtn>
        {ORDER.filter((s) => counts[s] > 0).map((s) => (
          <FilterBtn key={s} on={filter === s} onClick={() => setFilter(s)}>
            {STATUS_META[s].label} {counts[s]}
          </FilterBtn>
        ))}
      </div>

      <div className="space-y-2">
        {rows.map((c) => (
          <article
            key={c.id}
            className={`bg-panel border px-4 py-3 grid grid-cols-1 md:grid-cols-[110px_1fr_170px] gap-3 ${
              c.status === "broken" ? "border-red/40" : "border-line"
            }`}
          >
            <div>
              <StatusBadge status={c.status} />
            </div>
            <div className="min-w-0">
              <div className="text-sm">
                <span className="font-medium">{c.by}</span>
                <span className="text-faint"> promised </span>
                <span className="font-medium">{c.to}</span>
              </div>
              <p className="mt-1">“{c.what}”</p>
              <p className="text-sm text-muted mt-1.5 leading-relaxed">
                <CitedText text={c.statusReason} />
              </p>
            </div>
            <div className="font-mono text-[11px] text-muted space-y-1 md:text-right">
              <div>made {fmtDate(c.madeAt)}</div>
              <div className={c.status === "broken" ? "text-red" : ""}>due {c.dueAt ? fmtDate(c.dueAt, false) : "n/a"}</div>
              <div>
                <Cites ids={c.sourceIds} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FilterBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`font-mono text-[11px] uppercase tracking-wider border px-2.5 py-1 ${
        on ? "border-ink text-ink" : "border-line text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
