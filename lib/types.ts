export type Channel = "ticket" | "email" | "chat";

/** One raw message from any channel, normalized. `id` is stable and citable (T3, E7, C12). */
export interface SourceItem {
  id: string;
  channel: Channel;
  author: string;
  timestamp: string; // ISO 8601
  body: string;
  subject?: string; // email subject or ticket title
  thread?: string; // ticket key, email thread, or chat channel
  to?: string;
}

export interface CaseMeta {
  id: string;
  title: string;
  client: string;
  summary: string;
  sample?: boolean;
  createdAt?: string;
}

export type EventKind =
  | "issue"
  | "action"
  | "promise"
  | "decision"
  | "escalation"
  | "miss"
  | "resolution";

export interface CaseEvent {
  id: string;
  time: string;
  actor: string;
  kind: EventKind;
  title: string;
  detail: string;
  sourceIds: string[];
}

export type PromiseStatus = "kept" | "broken" | "open" | "at-risk" | "unknown";

export interface Commitment {
  id: string;
  by: string;
  to: string;
  what: string;
  madeAt: string;
  dueAt: string | null;
  status: PromiseStatus;
  statusReason: string;
  sourceIds: string[];
}

export interface Actor {
  name: string;
  side: "client" | "internal" | "unknown";
  role: string;
  summary: string;
}

export interface Phase {
  name: string;
  start: string;
  end: string;
  summary: string;
  eventIds: string[];
}

export interface Finding {
  title: string;
  detail: string;
  sourceIds: string[];
}

export interface CaseAnalysis {
  headline: string;
  actors: Actor[];
  events: CaseEvent[];
  commitments: Commitment[];
  phases: Phase[];
  whatWentWrong: Finding[];
  contradictions: Finding[];
  openQuestions: string[];
  clientReply: string;
  generatedAt: string;
  model: string;
}

export interface CaseFile {
  meta: CaseMeta;
  sources: SourceItem[];
  analysis: CaseAnalysis | null;
}
