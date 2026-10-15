/**
 * Runs the analysis pipeline on the bundled sample cases and writes data/analysis/<id>.json,
 * so the live demo opens instantly and doesn't depend on API quota.
 *
 *   npm run precompute              # all sample cases
 *   npm run precompute -- northwind # one case
 */
import fs from "node:fs";
import path from "node:path";
import { analyzeCase } from "../lib/analyze";
import { normalizeSources, type RawSource } from "../lib/ingest";

const ids = process.argv.slice(2).length ? process.argv.slice(2) : ["northwind", "acme-health", "globex"];
const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(path.join(dataDir, "analysis"), { recursive: true });

for (const id of ids) {
  const raw = JSON.parse(fs.readFileSync(path.join(dataDir, "cases", `${id}.json`), "utf8")) as {
    sources: RawSource[];
  };
  const sources = normalizeSources(raw.sources);
  const started = Date.now();
  console.log(`[${id}] analyzing ${sources.length} sources...`);
  const analysis = await analyzeCase(sources);
  fs.writeFileSync(path.join(dataDir, "analysis", `${id}.json`), JSON.stringify(analysis, null, 2) + "\n");
  console.log(
    `[${id}] done in ${((Date.now() - started) / 1000).toFixed(0)}s: ${analysis.events.length} events, ` +
      `${analysis.commitments.length} commitments (${analysis.commitments.filter((c) => c.status === "broken").length} broken)`,
  );
}
