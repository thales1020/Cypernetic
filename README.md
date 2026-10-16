# Case File: The Investigator

> When a client escalates, find out **who did what, when, what was promised, and what went wrong** in minutes instead of days.

**Live demo:** https://cypernetic.vercel.app

Built for the *Agent in the Shell* hackathon, **Customer Success: The Investigator** challenge.

## The problem

A client escalates and the team has to rebuild the story. The history is spread across support tickets, email threads and internal chat. Nobody has the whole picture, so the client waits for days while people dig.

## What Case File does

Give it the raw history of a case (tickets, emails, chat) and it builds one investigation file:

| View | What you get |
|---|---|
| **What went wrong** | 3–5 root causes, framed as process failures rather than blame, with citations |
| **Promise tracker** | Every commitment anyone made (dates, updates, "it's deployed"), checked against what happened next: *kept / broken / at-risk / open* |
| **Contradictions** | Where what the client was told conflicts with what was true internally |
| **Timeline** | Events from all channels merged into phases, plus an activity strip per channel |
| **People** | Who was involved on each side, what each person did, and their promise record |
| **Ask the case** | Chat with the case. Answers come only from the record, and every claim is cited |
| **Draft reply** | An honest, specific reply to the client, ready to edit |

**Every claim links to its source.** Each message gets a stable ID (`T3` ticket, `E5` email, `C12` chat). The model must cite those IDs, citations to IDs that don't exist are stripped server-side, and any event left without a valid source is dropped. Click a citation to see the original message in its thread.

## How it works

```
tickets / emails / chat (paste or upload .eml .json .csv .txt)
   │  lib/ingest.ts: deterministic parsers; unstructured text is split by the LLM
   ▼
normalized messages, sorted by time, with stable IDs (T1, E1, C1…)
   │  lib/analyze.ts, pass 1: LLM structured output (Zod schema)
   ▼        → actors, events, commitments + status, each with sourceIds
   │  validation: drop hallucinated citations and uncited items
   │  pass 2: LLM synthesis → phases, root causes, contradictions, client reply
   ▼
Case File UI (Next.js)  ←→  /api/ask: streaming Q&A grounded in the record
```

- **Model:** Gemini (`gemini-3.5-flash`, falling back to `gemini-2.5-flash` when overloaded) via the Vercel AI SDK: structured output with Zod schemas, and streaming for Q&A. Claude works too: set `ANTHROPIC_API_KEY` instead.
- **Sample cases** (`data/cases/*.json`) are realistic multi-channel escalations. Their analyses are precomputed into `data/analysis/` so the demo opens instantly.
- **Your own cases** are analyzed live and stored only in your browser (localStorage). There is no database and no login.

## Sample cases

1. **Northwind Logistics**: a release breaks nightly exports. An account manager promises a Friday fix without checking with engineering, the issue is dropped from a vacation handover, a hotfix is pulled at the last minute, and the client is told "it's deployed" when it isn't.
2. **Acme Health**: sales promises a 5-year data migration, but the signed SOW covers 2 years. The client finds out during go-live week.
3. **Globex**: an SSO outage, a written RCA promised "within 5 business days", and an ownership gap between two account managers that means the RCA is never sent.

## Run locally

```bash
npm install
cp .env.example .env.local   # add GOOGLE_GENERATIVE_AI_API_KEY
npm run dev                  # http://localhost:3000
npm run precompute           # re-generate sample analyses (optional)
```
