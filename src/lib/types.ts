/** ClearLedger domain models — all taxpayer data is fictional. */

export type FieldStatus =
  "ai_generated" | "needs_review" | "verified" | "corrected" | "warning" | "system_calculated";

export type ReturnPriority = "critical" | "high" | "medium" | "low" | "ready_for_signoff";

export type AuditAction =
  | "ai_extraction_created"
  | "field_verified"
  | "field_corrected"
  | "client_clarification_requested"
  | "review_completed_sign_off";

export type ClientRequestStatus = "pending" | "waiting_on_client" | "resolved";

export interface User {
  id: string;
  name: string;
  role: "preparer" | "reviewer" | "partner";
  initials: string;
}

export interface SourceDocument {
  id: string;
  returnId: string;
  name: string;
  type: "W-2" | "1099-INT" | "1099-DIV" | "K-1" | "Bank statement" | "Other";
  taxYear: number;
  pageCount: number;
  uploadedAt: string;
  employerOrPayer?: string;
  maskedEin?: string;
  maskedSsn?: string;
}

export interface SourceReference {
  documentId: string;
  page: number;
  section: string;
  label: string;
}

export interface TaxField {
  id: string;
  returnId: string;
  label: string;
  value: string;
  form: string;
  line: string;
  status: FieldStatus;
  confidence: number | null;
  sourceDocumentId: string | null;
  sourcePage: number | null;
  sourceSection: string | null;
  transformation: string;
  aiExplanation: string;
  supportingEvidence: string[];
  uncertainty: string | null;
  recommendedAction: string;
  lastReviewedBy: string | null;
  lastReviewedAt: string | null;
  impact?: "high" | "normal";
  waitingOnClient?: boolean;
  /** Original AI/source extraction — never overwritten by human correction. */
  sourceExtractedValue?: string | null;
}

export interface AIReviewFinding {
  id: string;
  returnId: string;
  fieldId: string;
  title: string;
  severity: "high" | "medium" | "low";
  summary: string;
  status: "open" | "resolved";
}

export interface TaxReturn {
  id: string;
  taxpayer: string;
  form: string;
  formType: string;
  taxYear: number;
  stage: string;
  filingDeadline: string;
  dueLabel: string;
  daysToDeadline: number;
  priority: ReturnPriority;
  priorityScore: number;
  reviewProgress: number;
  outstandingFindings: number;
  highImpactFindings: number;
  assignedPreparer: string;
  blockers: string[];
  impact: number;
  impactNote: string;
  avgConfidence: number;
  reasons: string[];
  primaryFinding: string;
}

export interface AuditEvent {
  id: string;
  returnId: string;
  fieldId: string | null;
  fieldLabel: string | null;
  action: AuditAction;
  actor: string;
  timestamp: string;
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  note?: string | null;
}

export interface ClientRequest {
  id: string;
  returnId: string;
  fieldId: string;
  documentId: string | null;
  message: string;
  owner: string;
  createdAt: string;
  status: ClientRequestStatus;
}

export interface DashboardSummary {
  openReturns: number;
  nearestDeadlineDays: number;
  nearestDeadlineLabel: string;
  /** Count of returns that have at least one blocker. */
  blockedReturns: number;
  /** Sum of all blocker items across returns (summary-card “Total blockers”). */
  totalBlockers: number;
  openAiFindings: number;
  totalReviewProgress: number;
  /** Returns ready for sign-off (not in active queue). */
  readyForSignOff: number;
}

export type QueueScope = "my" | "team";

/** Active review work vs ready-for-sign-off archive of the queue. */
export type QueueListMode = "active" | "sign_off";

export interface ReturnListQuery {
  query?: string;
  scope?: QueueScope;
  /** Active-queue risk filter, or ready_for_signoff when using listMode sign_off. */
  priority?: ReturnPriority | "all";
  listMode?: QueueListMode;
  page?: number;
  pageSize?: number;
  /** Preparer name used for “My queue” (default Maya Patel). */
  ownerName?: string;
}

export interface ReturnListResult {
  items: TaxReturn[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Traceability {
  field: TaxField;
  document: SourceDocument | null;
  finding: AIReviewFinding | null;
  sourceReference: SourceReference | null;
}

export interface DemoStore {
  returns: TaxReturn[];
  fields: TaxField[];
  documents: SourceDocument[];
  findings: AIReviewFinding[];
  auditEvents: AuditEvent[];
  clientRequests: ClientRequest[];
  users: User[];
}
