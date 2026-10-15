"use client";

import { useEffect } from "react";
import { ChannelTag, fmtDate, useCase } from "./ui";

/** Side drawer showing the original message behind a citation, with prev/next in the same thread. */
export function SourceDrawer({
  id,
  onClose,
  onNavigate,
}: {
  id: string | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const { sourcesById } = useCase();
  const src = id ? sourcesById.get(id) : undefined;

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, onClose]);

  if (!src) return null;
  const thread = [...sourcesById.values()].filter((s) => s.thread && s.thread === src.thread);
  const idx = thread.findIndex((s) => s.id === src.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div key={src.id} className="relative w-full max-w-xl h-full bg-panel border-l border-line overflow-y-auto scroll-thin">
        <div className="sticky top-0 bg-panel border-b border-line px-5 py-3 flex items-center justify-between">
          <span className="label">Source {src.id}</span>
          <button onClick={onClose} className="font-mono text-xs text-muted hover:text-ink border border-line px-2 py-1">
            ✕ Close
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ChannelTag channel={src.channel} />
            {src.thread && <span className="font-mono text-xs text-muted">{src.thread}</span>}
          </div>
          {src.subject && <h2 className="text-lg font-semibold">{src.subject}</h2>}
          <dl className="grid grid-cols-[60px_1fr] gap-y-1 font-mono text-xs">
            <dt className="text-faint">from</dt>
            <dd>{src.author}</dd>
            {src.to && (
              <>
                <dt className="text-faint">to</dt>
                <dd>{src.to}</dd>
              </>
            )}
            <dt className="text-faint">time</dt>
            <dd>{fmtDate(src.timestamp)} UTC</dd>
          </dl>
          <div className="bg-panel-2 border border-line p-4 whitespace-pre-wrap leading-relaxed">{src.body}</div>

          {thread.length > 1 && (
            <div>
              <div className="label mb-2">
                Thread · {idx + 1} of {thread.length}
              </div>
              <ul className="space-y-1">
                {thread.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onNavigate(s.id)}
                      className={`w-full text-left text-sm px-3 py-1.5 border ${
                        s.id === src.id ? "border-accent/60 bg-accent/5" : "border-line hover:border-muted"
                      }`}
                    >
                      <span className="font-mono text-[11px] text-faint mr-2">
                        {s.id} · {fmtDate(s.timestamp, false)}
                      </span>
                      <span className="text-muted">{s.author}:</span> <span className="line-clamp-1 inline">{s.body.slice(0, 90)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
