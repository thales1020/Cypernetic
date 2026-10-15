"use client";

import Link from "next/link";
import { deleteLocalCase, useLocalCases } from "@/lib/local";

export function LocalCaseList() {
  const cases = useLocalCases();
  if (!cases?.length) return null;

  return (
    <>
      <h2 className="label mt-10 mb-3">Your cases · stored in this browser</h2>
      <ul className="space-y-2">
        {cases.map((c) => (
          <li key={c.meta.id} className="bg-panel border border-line flex items-center">
            <Link href={`/case/${c.meta.id}`} className="flex-1 px-4 py-3 hover:text-accent">
              <span className="font-medium">{c.meta.title}</span>
              <span className="font-mono text-[11px] text-faint ml-3">
                {c.meta.client} · {c.sources.length} messages
              </span>
            </Link>
            <button
              onClick={() => deleteLocalCase(c.meta.id)}
              className="font-mono text-[11px] text-faint hover:text-red px-4"
            >
              delete
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
