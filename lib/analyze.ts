import { structured } from "./llm";
import { normalizeSources, sourcesToPrompt, type RawSource } from "./ingest";
import { ExtractionSchema, SegmentSchema, SynthesisSchema } from "./schemas";
import type { CaseAnalysis, SourceItem } from "./types";

const EXTRACT_SYSTEM = `You are a customer-success investigator. You receive the full record of a client case: support tickets, emails and chat messages, each tagged with an ID like [T3], [E2], [C7].

Reconstruct exactly what happened. Be factual and skeptical: you are building the record a VP will rely on before calling an angry client.

- Every event and commitment must cite the source IDs that prove it. Only use IDs that appear in the record.
- "events": the meaningful steps in chronological order: reports, actions, decisions, promises, escalations, misses (something that should have happened and didn't, such as a silent deadline or a dropped handover) and the resolution. Skip pure chit-chat. Aim for 12-30 events depending on case size.
- "commitments": every promise or commitment anyone made (a date, an update cadence, a deliverable, a claim of something being done). Judge each against later evidence: kept, broken, at-risk (deadline near and no sign of delivery), open (not due yet), or unknown. A promise made to a colleague matters too if it affected the client.
- Name people consistently (drop org suffixes like "(Support)").`;

const SYNTH_SYSTEM = `You are a customer-success investigator writing the case file a VP reads before calling an escalating client. You get the raw record and the extracted events and commitments.

- Group events into 3-6 chronological phases.
- "whatWentWrong": the 3-5 root causes, meaning process failures rather than blame (wrong priority, a promise made without checking capacity, a handover gap, a status claim nobody verified). Cite sources inline like [C4].
- "contradictions": places where what someone told the client conflicts with what was true internally. Cite both sides.
- "clientReply": an honest, specific reply from the most senior internal person involved. Acknowledge what went wrong without blaming individuals and say what changes now. Under 200 words.
Be concrete, use dates, and don't speculate beyond the record.`;

const SEGMENT_SYSTEM = `Split the pasted text into individual messages (emails, ticket comments, chat lines). Keep each body verbatim. Pick the channel from context: a ticket/issue comment is "ticket", anything with email headers or a greeting/sign-off is "email", short instant messages are "chat". Use ISO timestamps.`;

/** Turns pasted or unstructured text into messages using the model. */
export async function segmentText(text: string): Promise<RawSource[]> {
  const out = await structured({
    system: SEGMENT_SYSTEM,
    prompt: text,
    schema: SegmentSchema,
  });
  return out.messages.map((m) => ({
    channel: m.channel,
    author: m.author,
    to: m.to ?? undefined,
    timestamp: m.timestamp,
    subject: m.subject ?? undefined,
    thread: m.thread ?? undefined,
    body: m.body,
  }));
}

export async function analyzeCase(sources: SourceItem[]): Promise<CaseAnalysis> {
  const record = sourcesToPrompt(sources);
  const validIds = new Set(sources.map((s) => s.id));
  const keepValid = (ids: string[]) => ids.filter((id) => validIds.has(id));

  const extraction = await structured({
    system: EXTRACT_SYSTEM,
    prompt: `<record>\n${record}\n</record>`,
    schema: ExtractionSchema,
  });

  // Anti-hallucination: drop citations to IDs that don't exist, then drop uncited items.
  const events = extraction.events
    .map((e) => ({ ...e, sourceIds: keepValid(e.sourceIds) }))
    .filter((e) => e.sourceIds.length > 0)
    .sort((a, b) => a.time.localeCompare(b.time))
    .map((e, i) => ({ ...e, id: `ev${i + 1}` }));
  const commitments = extraction.commitments
    .map((c) => ({ ...c, sourceIds: keepValid(c.sourceIds) }))
    .filter((c) => c.sourceIds.length > 0)
    .sort((a, b) => a.madeAt.localeCompare(b.madeAt))
    .map((c, i) => ({ ...c, id: `p${i + 1}` }));

  const dropped = extraction.events.length - events.length + extraction.commitments.length - commitments.length;
  if (dropped) console.warn(`analyzeCase: dropped ${dropped} items with no valid citation`);

  const eventList = events
    .map((e) => `${e.id} | ${e.time} | ${e.kind} | ${e.actor} | ${e.title} | ${e.sourceIds.join(",")}`)
    .join("\n");
  const commitmentList = commitments
    .map((c) => `${c.id} | ${c.by} -> ${c.to} | "${c.what}" | due ${c.dueAt ?? "n/a"} | ${c.status}: ${c.statusReason}`)
    .join("\n");

  const synthesis = await structured({
    system: SYNTH_SYSTEM,
    prompt: `<record>\n${record}\n</record>\n\n<events>\n${eventList}\n</events>\n\n<commitments>\n${commitmentList}\n</commitments>`,
    schema: SynthesisSchema,
  });

  const eventIds = new Set(events.map((e) => e.id));
  return {
    headline: synthesis.headline,
    actors: extraction.actors,
    events,
    commitments,
    phases: synthesis.phases.map((p) => ({ ...p, eventIds: p.eventIds.filter((id) => eventIds.has(id)) })),
    whatWentWrong: synthesis.whatWentWrong.map((f) => ({ ...f, sourceIds: keepValid(f.sourceIds) })),
    contradictions: synthesis.contradictions.map((f) => ({ ...f, sourceIds: keepValid(f.sourceIds) })),
    openQuestions: synthesis.openQuestions,
    clientReply: synthesis.clientReply,
    generatedAt: new Date().toISOString(),
    model: extraction._model,
  };
}

export { normalizeSources };
