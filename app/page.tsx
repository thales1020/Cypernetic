import Link from "next/link";
import { LocalCaseList } from "@/components/LocalCaseList";
import { loadSampleCases } from "@/lib/cases";

export default function Home() {
  const samples = loadSampleCases();

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-12">
      <div className="label mb-3">
        <span className="text-red">▲</span> customer success / the investigator
      </div>
      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05]">
        A client escalates.
        <br />
        <span className="text-accent">Know what happened in minutes</span>, not days.
      </h1>
      <p className="mt-5 text-muted max-w-2xl leading-relaxed">
        Case File reads the tickets, emails and chat around a project and rebuilds the story: <strong className="text-ink">who did
        what, when, what was promised, and where it broke</strong>. Every claim links back to the original message, so you can
        trust it before you call the client.
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-4 gap-px bg-line border border-line">
        {[
          ["01", "Consolidate", "Tickets, email threads and chat merged into one timeline"],
          ["02", "Track promises", "Every commitment checked: kept, broken or at risk"],
          ["03", "Explain", "Root causes and contradictions, each with a citation"],
          ["04", "Ask", "Ask the case anything and get answers with citations"],
        ].map(([n, t, d]) => (
          <div key={n} className="bg-panel p-4">
            <div className="font-mono text-xs text-accent">{n}</div>
            <div className="font-semibold mt-1">{t}</div>
            <div className="text-sm text-muted mt-1">{d}</div>
          </div>
        ))}
      </div>

      <h2 className="label mt-12 mb-3">Sample escalations · open one</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {samples.map(({ meta, sources, analysis }) => {
          const broken = analysis?.commitments.filter((c) => c.status === "broken").length ?? 0;
          return (
            <Link
              key={meta.id}
              href={`/case/${meta.id}`}
              className="group bg-panel border border-line hover:border-accent/70 p-5 flex flex-col transition-colors"
            >
              <div className="label">{meta.client}</div>
              <div className="font-semibold mt-1.5 group-hover:text-accent transition-colors">{meta.title}</div>
              <p className="text-sm text-muted mt-2 flex-1">{meta.summary}</p>
              <div className="mt-4 font-mono text-[11px] text-faint flex gap-3">
                <span>{sources.length} messages</span>
                {analysis && <span className="text-red">{broken} broken promises</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <LocalCaseList />

      <div className="mt-12 border border-dashed border-line p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <div className="font-semibold">Investigate your own case</div>
          <p className="text-sm text-muted mt-1">
            Paste an email thread, a ticket export or a Slack log, or upload .eml / .json / .csv / .txt files.
          </p>
        </div>
        <Link
          href="/new"
          className="font-mono text-xs uppercase tracking-wider bg-accent text-bg px-4 py-2.5 hover:opacity-90 text-center"
        >
          + New case
        </Link>
      </div>
    </div>
  );
}
