import "server-only";
import fs from "node:fs";
import path from "node:path";
import { normalizeSources, type RawSource } from "./ingest";
import type { CaseAnalysis, CaseFile, CaseMeta } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
export const SAMPLE_IDS = ["northwind", "acme-health", "globex"];

export function loadSampleCase(id: string): CaseFile | null {
  if (!SAMPLE_IDS.includes(id)) return null;
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "cases", `${id}.json`), "utf8")) as {
    meta: CaseMeta;
    sources: RawSource[];
  };
  const analysisPath = path.join(DATA_DIR, "analysis", `${id}.json`);
  const analysis = fs.existsSync(analysisPath)
    ? (JSON.parse(fs.readFileSync(analysisPath, "utf8")) as CaseAnalysis)
    : null;
  return { meta: raw.meta, sources: normalizeSources(raw.sources), analysis };
}

export function loadSampleCases(): CaseFile[] {
  return SAMPLE_IDS.map((id) => loadSampleCase(id)!).filter(Boolean);
}
