import { z } from "zod";

const sourceIds = z
  .array(z.string())
  .describe("IDs of the source messages that support this, e.g. [\"T3\", \"E2\"]. Never invent IDs.");

export const ExtractionSchema = z.object({
  actors: z.array(
    z.object({
      name: z.string().describe("Person's name as it appears, without the org suffix"),
      side: z.enum(["client", "internal", "unknown"]),
      role: z.string().describe("Short role, e.g. 'Account Manager', 'VP Finance'"),
      summary: z.string().describe("One sentence: what this person did in the case"),
    }),
  ),
  events: z.array(
    z.object({
      time: z.string().describe("ISO timestamp of the source message where this happened"),
      actor: z.string(),
      kind: z.enum(["issue", "action", "promise", "decision", "escalation", "miss", "resolution"]),
      title: z.string().describe("Short headline, max ~10 words"),
      detail: z.string().describe("1-2 sentences of what happened and why it matters"),
      sourceIds,
    }),
  ),
  commitments: z.array(
    z.object({
      by: z.string(),
      to: z.string(),
      what: z.string(),
      madeAt: z.string().describe("ISO timestamp"),
      dueAt: z.string().nullable().describe("ISO date if a deadline was stated or clearly implied, else null"),
      status: z.enum(["kept", "broken", "open", "at-risk", "unknown"]),
      statusReason: z.string().describe("Evidence for the status, citing source IDs inline like [C4]"),
      sourceIds,
    }),
  ),
});

export const SynthesisSchema = z.object({
  headline: z.string().describe("One sentence: what happened in this case, for an executive"),
  phases: z.array(
    z.object({
      name: z.string().describe("2-4 word phase name"),
      start: z.string(),
      end: z.string(),
      summary: z.string(),
      eventIds: z.array(z.string()).describe("IDs of events (ev1, ev2...) in this phase"),
    }),
  ),
  whatWentWrong: z.array(
    z.object({
      title: z.string(),
      detail: z.string().describe("Explain the failure and its impact, citing sources inline like [E4]"),
      sourceIds,
    }),
  ),
  contradictions: z.array(
    z.object({
      title: z.string(),
      detail: z.string().describe("What was said vs. what was true, citing sources inline"),
      sourceIds,
    }),
  ),
  openQuestions: z.array(z.string()).describe("Things the record doesn't answer that a manager should find out"),
  clientReply: z
    .string()
    .describe("Draft reply to the escalating client: honest acknowledgement, factual timeline, what changes now. Plain text, no citations."),
});

export const SegmentSchema = z.object({
  messages: z.array(
    z.object({
      channel: z.enum(["ticket", "email", "chat"]),
      author: z.string(),
      to: z.string().nullable(),
      timestamp: z.string().describe("ISO 8601. If the year is missing, infer from context."),
      subject: z.string().nullable(),
      thread: z.string().nullable(),
      body: z.string().describe("The message text, verbatim"),
    }),
  ),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Synthesis = z.infer<typeof SynthesisSchema>;
