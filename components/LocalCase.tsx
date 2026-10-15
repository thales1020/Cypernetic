"use client";

import Link from "next/link";
import { useLocalCases } from "@/lib/local";
import { CaseView } from "./CaseView";

export function LocalCase({ id }: { id: string }) {
  const cases = useLocalCases();
  if (cases === null) return <div className="p-10 font-mono text-sm text-muted">Loading case…</div>;
  const found = cases.find((c) => c.meta.id === id);
  if (!found)
    return (
      <div className="mx-auto max-w-xl p-10 text-center space-y-3">
        <p className="text-muted">This case isn&apos;t in this browser. Cases you create are stored locally.</p>
        <Link href="/" className="text-accent font-mono text-sm hover:underline">
          ← back to cases
        </Link>
      </div>
    );
  return <CaseView caseFile={found} />;
}
