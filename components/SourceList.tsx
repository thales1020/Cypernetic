"use client";

import { useState } from "react";
import type { Channel, SourceItem } from "@/lib/types";
import { ChannelTag, fmtDate, useCase } from "./ui";

export function SourceList({ sources }: { sources: SourceItem[] }) {
  const { openSource } = useCase();
  const [channel, setChannel] = useState<Channel | "">("");
  const [q, setQ] = useState("");
  const query = q.toLowerCase();
  const rows = sources.filter(
    (s) =>
      (!channel || s.channel === channel) &&
      (!query || `${s.author} ${s.subject ?? ""} ${s.body} ${s.thread ?? ""}`.toLowerCase().includes(query)),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search messages…"
          className="flex-1 min-w-[200px] bg-panel border border-line px-3 py-1.5 text-sm placeholder:text-faint focus:outline-none focus:border-muted"
        />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel | "")}
          className="bg-panel border border-line font-mono text-xs text-muted px-2"
        >
          <option value="">All channels</option>
          <option value="ticket">Tickets</option>
          <option value="email">Email</option>
          <option value="chat">Chat</option>
        </select>
      </div>
      <p className="font-mono text-[11px] text-faint">
        {rows.length} of {sources.length} messages, in time order
      </p>
      <ul className="space-y-1.5">
        {rows.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => openSource(s.id)}
              className="w-full text-left bg-panel border border-line hover:border-muted px-4 py-2.5 grid grid-cols-[44px_1fr] gap-3"
            >
              <span className="font-mono text-xs text-muted pt-0.5">{s.id}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <ChannelTag channel={s.channel} />
                  <span className="text-sm font-medium">{s.author}</span>
                  {s.thread && <span className="font-mono text-[11px] text-faint">{s.thread}</span>}
                  <span className="font-mono text-[11px] text-faint ml-auto">{fmtDate(s.timestamp)}</span>
                </span>
                <span className="block text-sm text-muted mt-1 line-clamp-2">{s.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
