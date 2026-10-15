"use client";

import { createContext, Fragment, useContext, type ReactNode } from "react";
import type { Channel, EventKind, PromiseStatus, SourceItem } from "@/lib/types";

// ---------- Case context: lets any citation open the source drawer ----------

interface CaseCtx {
  sourcesById: Map<string, SourceItem>;
  openSource: (id: string) => void;
}
export const CaseContext = createContext<CaseCtx>({ sourcesById: new Map(), openSource: () => {} });
export const useCase = () => useContext(CaseContext);

// ---------- Formatting ----------

export function fmtDate(iso: string, withTime = true): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (!withTime) return date;
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  return `${date}, ${time}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ---------- Channel ----------

export const CHANNEL_META: Record<Channel, { label: string; color: string; glyph: string }> = {
  ticket: { label: "Ticket", color: "text-amber border-amber/40", glyph: "#" },
  email: { label: "Email", color: "text-blue border-blue/40", glyph: "@" },
  chat: { label: "Chat", color: "text-violet border-violet/40", glyph: "›" },
};

export function ChannelTag({ channel }: { channel: Channel }) {
  const m = CHANNEL_META[channel];
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${m.color}`}>
      <span aria-hidden>{m.glyph}</span>
      {m.label}
    </span>
  );
}

// ---------- Citations ----------

export function Cite({ id }: { id: string }) {
  const { sourcesById, openSource } = useCase();
  const src = sourcesById.get(id);
  if (!src) return <span className="font-mono text-[11px] text-faint">[{id}]</span>;
  const m = CHANNEL_META[src.channel];
  return (
    <button
      type="button"
      onClick={() => openSource(id)}
      title={`${src.author}: ${src.body.slice(0, 140)}`}
      className={`inline-flex items-center align-baseline font-mono text-[10.5px] leading-none border px-1 py-[3px] mx-[1px] hover:bg-white/10 cursor-pointer ${m.color}`}
    >
      {id}
    </button>
  );
}

export function Cites({ ids }: { ids: string[] }) {
  if (!ids.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-0.5">
      {ids.map((id) => (
        <Cite key={id} id={id} />
      ))}
    </span>
  );
}

/** Renders text, turning [E4] / [T2, C7] into clickable citation chips and **bold** into <strong>. */
export function CitedText({ text }: { text: string }) {
  const parts = text.split(/(\[[TEC]\d+(?:\s*[,;]\s*[TEC]\d+)*\]|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\[[TEC]\d+/.test(part)) {
          const ids = part.slice(1, -1).split(/\s*[,;]\s*/);
          return (
            <Fragment key={i}>
              {ids.map((id) => (
                <Cite key={id} id={id} />
              ))}
            </Fragment>
          );
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

// ---------- Status & kinds ----------

export const STATUS_META: Record<PromiseStatus, { label: string; cls: string }> = {
  broken: { label: "Broken", cls: "bg-red/15 text-red border-red/50" },
  "at-risk": { label: "At risk", cls: "bg-amber/15 text-amber border-amber/50" },
  open: { label: "Open", cls: "bg-blue/10 text-blue border-blue/40" },
  kept: { label: "Kept", cls: "bg-accent/10 text-accent border-accent/40" },
  unknown: { label: "Unknown", cls: "bg-white/5 text-muted border-line" },
};

export function StatusBadge({ status }: { status: PromiseStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.unknown;
  return (
    <span className={`inline-block font-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${m.cls}`}>
      {m.label}
    </span>
  );
}

export const KIND_META: Record<EventKind, { label: string; dot: string; text: string }> = {
  issue: { label: "Issue", dot: "bg-amber", text: "text-amber" },
  action: { label: "Action", dot: "bg-muted", text: "text-muted" },
  promise: { label: "Promise", dot: "bg-blue", text: "text-blue" },
  decision: { label: "Decision", dot: "bg-violet", text: "text-violet" },
  escalation: { label: "Escalation", dot: "bg-red", text: "text-red" },
  miss: { label: "Miss", dot: "bg-red ring-2 ring-red/30", text: "text-red" },
  resolution: { label: "Resolution", dot: "bg-accent", text: "text-accent" },
};

export function Panel({ title, right, children, className = "" }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-panel border border-line ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-line">
          <h3 className="label">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
