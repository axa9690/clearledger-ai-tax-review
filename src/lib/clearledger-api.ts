/**
 * ClearLedger mock API / service layer.
 * Simulates async network calls and persists reviewer changes in localStorage.
 * All taxpayer data and AI outputs are fictional.
 */

import {
  createSeedStore,
  DEMO_OWNER_NAME,
  DEMO_REVIEWER,
  isKnownReturnId as seedIsKnownReturnId,
  OLIVIA_WAGES_FIELD_ID,
  RETURN_IDS,
} from "./seed-data";
import { applyPriorityScoring, sortByPriority } from "./priority";
import type {
  AuditEvent,
  ClientRequest,
  DashboardSummary,
  DemoStore,
  ReturnListQuery,
  ReturnListResult,
  SourceDocument,
  TaxField,
  TaxReturn,
  Traceability,
} from "./types";

/** Bumped when seed size / sign-off queue rules change. */
const STORAGE_KEY = "clearledger-demo-store-v5";
const LEGACY_KEYS = [
  "clearledger-demo-store-v1",
  "clearledger-demo-store-v2",
  "clearledger-demo-store-v3",
  "clearledger-demo-store-v4",
];

function delay(ms?: number): Promise<void> {
  const wait = ms ?? 180 + Math.floor(Math.random() * 160);
  return new Promise((resolve) => setTimeout(resolve, wait));
}

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function countOpenFindings(store: DemoStore, returnId: string): number {
  return store.findings.filter((f) => f.returnId === returnId && f.status === "open").length;
}

function isFieldComplete(field: TaxField): boolean {
  if (field.waitingOnClient) return false;
  return (
    field.status === "verified" ||
    field.status === "corrected" ||
    field.status === "system_calculated"
  );
}

function recomputeReturnState(store: DemoStore, ret: TaxReturn): void {
  const wasReadyForSignOff =
    ret.priority === "ready_for_signoff" || ret.stage === "Ready for sign-off";

  const fields = store.fields.filter((f) => f.returnId === ret.id);
  const total = fields.length;
  const complete = fields.filter(isFieldComplete).length;
  // Only recompute progress from fields when this return has field rows.
  if (total > 0) {
    ret.reviewProgress = Math.round((complete / total) * 100);
  }
  ret.outstandingFindings = countOpenFindings(store, ret.id);
  ret.highImpactFindings = store.findings.filter(
    (f) => f.returnId === ret.id && f.status === "open" && f.severity === "high",
  ).length;

  const waiting = fields.some((f) => f.waitingOnClient);
  const openNeedsReview = fields.filter(
    (f) =>
      !isFieldComplete(f) &&
      (f.status === "needs_review" || f.status === "warning" || f.status === "ai_generated"),
  );

  // Blockers / stage scaffolding (findings tracked separately — not as permanent blockers)
  if (waiting) {
    ret.stage = "Waiting on client";
    ret.blockers = [
      "Waiting on client",
      ...fields.filter((f) => f.waitingOnClient).map((f) => `Client request: ${f.label}`),
    ];
  } else if (ret.id === RETURN_IDS.olivia) {
    const wages = fields.find((f) => f.id === OLIVIA_WAGES_FIELD_ID);
    if (wages && !isFieldComplete(wages)) {
      ret.stage = "AI-assisted review";
      ret.blockers = ["Unverified wages entry", "Wages require verification"];
    } else if (openNeedsReview.length > 0) {
      ret.stage = "AI-assisted review";
      ret.blockers = openNeedsReview.slice(0, 3).map((f) => `${f.label} needs attention`);
    } else {
      ret.blockers = [];
      ret.stage = "AI-assisted review";
    }
  } else if (openNeedsReview.length > 0 && total > 0) {
    ret.stage = "AI-assisted review";
    ret.blockers = openNeedsReview.slice(0, 3).map((f) => `${f.label} needs attention`);
  } else {
    ret.blockers = [];
    if (total > 0 && ret.reviewProgress < 100) {
      ret.stage = "AI-assisted review";
    }
  }

  const eligibleForSignOff =
    total > 0 &&
    ret.reviewProgress === 100 &&
    ret.outstandingFindings === 0 &&
    ret.blockers.length === 0 &&
    !waiting;

  if (eligibleForSignOff) {
    ret.stage = "Ready for sign-off";
    ret.blockers = [];
    ret.priority = "ready_for_signoff";
    ret.priorityScore = 0;
    ret.highImpactFindings = 0;
    ret.reasons = [
      "All fields settled",
      "No open AI findings",
      "No blockers — ready for sign-off (not yet filed)",
    ];

    if (!wasReadyForSignOff) {
      store.auditEvents.unshift({
        id: uid("audit"),
        returnId: ret.id,
        fieldId: null,
        fieldLabel: null,
        action: "review_completed_sign_off",
        actor: DEMO_REVIEWER.name,
        timestamp: nowIso(),
        previousValue: null,
        newValue: null,
        reason: null,
        note: "Review completed and moved to sign-off.",
      });
    }
    return;
  }

  // Still in active review — risk badges (Critical/High/etc.) only while open.
  const scored = applyPriorityScoring({
    ...ret,
    // Force re-score under active queue rules (clear ready flag if it reopened).
    priority: ret.priority === "ready_for_signoff" ? "medium" : ret.priority,
    stage: ret.stage === "Ready for sign-off" ? "AI-assisted review" : ret.stage,
  });
  ret.priorityScore = scored.priorityScore;
  ret.priority = scored.priority;
  ret.reasons = scored.reasons;
  if (ret.stage === "Ready for sign-off") {
    ret.stage = "AI-assisted review";
  }
}

function resolveFindingsForField(store: DemoStore, fieldId: string): void {
  for (const finding of store.findings) {
    if (finding.fieldId === fieldId && finding.status === "open") {
      finding.status = "resolved";
    }
  }
}

function normalizeStore(store: DemoStore): DemoStore {
  for (const field of store.fields) {
    if (field.sourceExtractedValue == null) {
      field.sourceExtractedValue = field.value;
    }
  }
  for (const ret of store.returns) {
    recomputeReturnState(store, ret);
  }
  return store;
}

function clearLegacyStorage(): void {
  if (!canUseStorage()) return;
  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function readStore(): DemoStore {
  if (!canUseStorage()) {
    return normalizeStore(createSeedStore());
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      clearLegacyStorage();
      const seed = normalizeStore(createSeedStore());
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return normalizeStore(JSON.parse(raw) as DemoStore);
  } catch {
    const seed = normalizeStore(createSeedStore());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function writeStore(store: DemoStore): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatCurrencyValue(input: string): string | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const num = Number(cleaned);
  if (Number.isNaN(num)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

function filterReturns(store: DemoStore, opts: ReturnListQuery): TaxReturn[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const scope = opts.scope ?? "team";
  const ownerName = opts.ownerName ?? DEMO_OWNER_NAME;
  const priority = opts.priority ?? "all";
  const listMode = opts.listMode ?? (priority === "ready_for_signoff" ? "sign_off" : "active");

  let list = sortByPriority(store.returns.map((r) => ({ ...r })));

  if (scope === "my") {
    list = list.filter((r) => r.assignedPreparer === ownerName);
  }

  if (listMode === "sign_off") {
    list = list.filter((r) => r.priority === "ready_for_signoff");
  } else {
    // Active review queue — exclude returns ready for sign-off.
    list = list.filter((r) => r.priority !== "ready_for_signoff");
    if (priority !== "all" && priority !== "ready_for_signoff") {
      list = list.filter((r) => r.priority === priority);
    }
  }

  if (q) {
    list = list.filter(
      (r) =>
        r.taxpayer.toLowerCase().includes(q) ||
        r.form.toLowerCase().includes(q) ||
        r.formType.toLowerCase().includes(q) ||
        r.primaryFinding.toLowerCase().includes(q) ||
        r.assignedPreparer.toLowerCase().includes(q),
    );
  }
  return list;
}

export async function getDashboardSummary(
  scope: "my" | "team" = "team",
): Promise<DashboardSummary> {
  await delay();
  const store = readStore();
  const scoped =
    scope === "my"
      ? store.returns.filter((r) => r.assignedPreparer === DEMO_OWNER_NAME)
      : store.returns;

  const active = scoped.filter((r) => r.priority !== "ready_for_signoff");
  const readyForSignOff = scoped.filter((r) => r.priority === "ready_for_signoff").length;

  const sorted = [...active].sort((a, b) => a.daysToDeadline - b.daysToDeadline);
  const nearest = sorted[0];
  const blockedReturns = active.filter((r) => r.blockers.length > 0).length;
  const totalBlockers = active.reduce((n, r) => n + r.blockers.length, 0);
  const openAiFindings = active.reduce((n, r) => n + r.outstandingFindings, 0);
  const totalReviewProgress =
    active.length === 0
      ? 0
      : Math.round(active.reduce((n, r) => n + r.reviewProgress, 0) / active.length);

  return {
    openReturns: active.length,
    nearestDeadlineDays: nearest?.daysToDeadline ?? 0,
    nearestDeadlineLabel: nearest ? `${nearest.daysToDeadline} days` : "—",
    blockedReturns,
    totalBlockers,
    openAiFindings,
    totalReviewProgress,
    readyForSignOff,
  };
}

export async function getPrioritizedReturns(): Promise<TaxReturn[]> {
  await delay();
  const store = readStore();
  return sortByPriority(store.returns);
}

export async function searchReturns(query: string): Promise<TaxReturn[]> {
  return listReturns({ query, scope: "team", page: 1, pageSize: 1000 }).then((r) => r.items);
}

export async function listReturns(opts: ReturnListQuery = {}): Promise<ReturnListResult> {
  await delay();
  const store = readStore();
  const pageSize = Math.max(1, opts.pageSize ?? 10);
  const page = Math.max(1, opts.page ?? 1);
  const filtered = filterReturns(store, opts);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page: safePage, pageSize, total, totalPages };
}

export async function getReturnById(returnId: string): Promise<TaxReturn | null> {
  await delay();
  const store = readStore();
  const ret = store.returns.find((r) => r.id === returnId);
  return ret ?? null;
}

export async function getTaxFields(returnId: string): Promise<TaxField[]> {
  await delay();
  const store = readStore();
  return store.fields.filter((f) => f.returnId === returnId);
}

export async function getTraceability(fieldId: string): Promise<Traceability | null> {
  await delay();
  const store = readStore();
  const field = store.fields.find((f) => f.id === fieldId);
  if (!field) return null;
  const document = store.documents.find((d) => d.id === field.sourceDocumentId) ?? null;
  const finding =
    store.findings.find((f) => f.fieldId === fieldId && f.status === "open") ??
    store.findings.find((f) => f.fieldId === fieldId) ??
    null;
  const sourceReference =
    document && field.sourcePage != null && field.sourceSection
      ? {
          documentId: document.id,
          page: field.sourcePage,
          section: field.sourceSection,
          label: `${document.name}, ${field.sourceSection}`,
        }
      : null;

  return { field, document, finding, sourceReference };
}

export async function getSourceDocument(documentId: string): Promise<SourceDocument | null> {
  await delay();
  const store = readStore();
  return store.documents.find((d) => d.id === documentId) ?? null;
}

export async function verifyTaxField(
  fieldId: string,
  reviewerId: string = DEMO_REVIEWER.id,
): Promise<{ field: TaxField; return: TaxReturn }> {
  await delay();
  const store = readStore();
  const field = store.fields.find((f) => f.id === fieldId);
  if (!field) throw new Error(`Field not found: ${fieldId}`);
  const ret = store.returns.find((r) => r.id === field.returnId);
  if (!ret) throw new Error(`Return not found for field: ${fieldId}`);

  const reviewer = store.users.find((u) => u.id === reviewerId)?.name ?? DEMO_REVIEWER.name;
  const timestamp = nowIso();

  field.status = "verified";
  field.lastReviewedBy = reviewer;
  field.lastReviewedAt = timestamp;
  field.waitingOnClient = false;
  if (field.sourceExtractedValue == null) {
    field.sourceExtractedValue = field.value;
  }

  resolveFindingsForField(store, fieldId);

  store.auditEvents.unshift({
    id: uid("audit"),
    returnId: field.returnId,
    fieldId: field.id,
    fieldLabel: field.label,
    action: "field_verified",
    actor: reviewer,
    timestamp,
    previousValue: field.value,
    newValue: field.value,
    reason: null,
    note: "Human verified against source document",
  });

  recomputeReturnState(store, ret);
  writeStore(store);
  return { field: { ...field }, return: { ...ret } };
}

export async function correctTaxField(
  fieldId: string,
  newValue: string,
  reason: string,
  note: string,
  reviewerId: string = DEMO_REVIEWER.id,
): Promise<{ field: TaxField; return: TaxReturn }> {
  await delay();
  const store = readStore();
  const field = store.fields.find((f) => f.id === fieldId);
  if (!field) throw new Error(`Field not found: ${fieldId}`);
  const ret = store.returns.find((r) => r.id === field.returnId);
  if (!ret) throw new Error(`Return not found for field: ${fieldId}`);

  if (!reason.trim()) {
    throw new Error("Correction reason is required");
  }

  const formatted = formatCurrencyValue(newValue);
  if (!formatted) {
    throw new Error("Enter a valid numeric value (e.g. 84250 or 84,250)");
  }

  const reviewer = store.users.find((u) => u.id === reviewerId)?.name ?? DEMO_REVIEWER.name;
  const timestamp = nowIso();
  const previousValue = field.value;

  // Preserve original source extraction forever on the return field.
  if (field.sourceExtractedValue == null) {
    field.sourceExtractedValue = previousValue;
  }

  field.value = formatted;
  field.status = "corrected";
  field.lastReviewedBy = reviewer;
  field.lastReviewedAt = timestamp;
  field.waitingOnClient = false;
  // Keep historical confidence for display after correction.
  field.aiExplanation = `Human-corrected return value. Original AI/source extraction remains ${field.sourceExtractedValue}. Reason: ${reason.trim()}.${
    note.trim() ? ` Note: ${note.trim()}` : ""
  }`;

  resolveFindingsForField(store, fieldId);

  store.auditEvents.unshift({
    id: uid("audit"),
    returnId: field.returnId,
    fieldId: field.id,
    fieldLabel: field.label,
    action: "field_corrected",
    actor: reviewer,
    timestamp,
    previousValue,
    newValue: formatted,
    reason: reason.trim(),
    note: note.trim() || null,
  });

  recomputeReturnState(store, ret);
  writeStore(store);
  return { field: { ...field }, return: { ...ret } };
}

export async function createClientRequest(
  fieldId: string,
  message: string,
  owner: string = DEMO_REVIEWER.name,
): Promise<{ request: ClientRequest; field: TaxField; return: TaxReturn }> {
  await delay();
  const store = readStore();
  const field = store.fields.find((f) => f.id === fieldId);
  if (!field) throw new Error(`Field not found: ${fieldId}`);
  const ret = store.returns.find((r) => r.id === field.returnId);
  if (!ret) throw new Error(`Return not found for field: ${fieldId}`);
  if (!message.trim()) throw new Error("Message is required");

  const timestamp = nowIso();
  const request: ClientRequest = {
    id: uid("req"),
    returnId: field.returnId,
    fieldId: field.id,
    documentId: field.sourceDocumentId,
    message: message.trim(),
    owner,
    createdAt: timestamp,
    status: "waiting_on_client",
  };
  store.clientRequests.unshift(request);

  field.waitingOnClient = true;
  field.status =
    field.status === "verified" || field.status === "corrected" ? "needs_review" : field.status;

  store.auditEvents.unshift({
    id: uid("audit"),
    returnId: field.returnId,
    fieldId: field.id,
    fieldLabel: field.label,
    action: "client_clarification_requested",
    actor: owner,
    timestamp,
    previousValue: field.value,
    newValue: field.value,
    reason: "Client clarification requested",
    note: message.trim().slice(0, 240),
  });

  recomputeReturnState(store, ret);
  writeStore(store);
  return {
    request: { ...request },
    field: { ...field },
    return: { ...ret },
  };
}

export async function getAuditEvents(returnId: string): Promise<AuditEvent[]> {
  await delay();
  const store = readStore();
  return store.auditEvents
    .filter((e) => e.returnId === returnId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export async function getClientRequests(returnId: string): Promise<ClientRequest[]> {
  await delay();
  const store = readStore();
  return store.clientRequests.filter((r) => r.returnId === returnId);
}

export async function resetDemoData(): Promise<void> {
  await delay(120);
  if (canUseStorage()) {
    clearLegacyStorage();
    window.localStorage.removeItem(STORAGE_KEY);
  }
  const seed = normalizeStore(createSeedStore());
  writeStore(seed);
}

export function isKnownReturnId(returnId: string): boolean {
  return seedIsKnownReturnId(returnId);
}

export { DEMO_REVIEWER, DEMO_OWNER_NAME, OLIVIA_WAGES_FIELD_ID, RETURN_IDS };
