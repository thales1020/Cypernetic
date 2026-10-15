"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { CaseFile } from "./types";

// User-created cases live only in this browser.
const KEY = "casefile:cases";
const EVENT = "casefile:changed";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): CaseFile[] {
  try {
    return JSON.parse(raw) as CaseFile[];
  } catch {
    return [];
  }
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Local cases, or null during server render / before hydration. */
export function useLocalCases(): CaseFile[] | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  return useMemo(() => (raw === null ? null : parse(raw)), [raw]);
}

function write(cases: CaseFile[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
  } catch {
    // Storage full or blocked; nothing else to do.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function saveLocalCase(c: CaseFile): void {
  write([c, ...parse(read()).filter((x) => x.meta.id !== c.meta.id)].slice(0, 20));
}

export function deleteLocalCase(id: string): void {
  write(parse(read()).filter((c) => c.meta.id !== id));
}
