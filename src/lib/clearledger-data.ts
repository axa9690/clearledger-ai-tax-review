import type { FieldStatus } from "./types";

export type { FieldStatus } from "./types";

export const statusMeta: Record<FieldStatus, { label: string; className: string }> = {
  ai_generated: {
    label: "AI generated",
    className: "bg-ai-soft text-ai border-ai/25",
  },
  needs_review: {
    label: "Needs review",
    className: "bg-warning-soft text-warning-foreground border-warning/40",
  },
  verified: {
    label: "Verified",
    className: "bg-verified-soft text-verified border-verified/25",
  },
  corrected: {
    label: "Corrected",
    className: "bg-verified-soft text-verified border-verified/25",
  },
  warning: {
    label: "Warning",
    className: "bg-warning-soft text-warning-foreground border-warning/40",
  },
  system_calculated: {
    label: "System calculated",
    className: "bg-secondary text-secondary-foreground border-border",
  },
};

export const auditActionLabels: Record<string, string> = {
  ai_extraction_created: "AI extraction created",
  field_verified: "Field verified",
  field_corrected: "Field corrected",
  client_clarification_requested: "Client clarification requested",
  review_completed_sign_off: "Review completed and moved to sign-off",
};

export function formatAuditTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function sourceLabel(field: {
  sourceDocumentId: string | null;
  sourceSection: string | null;
  sourcePage: number | null;
  form: string;
  line: string;
}): string {
  if (!field.sourceDocumentId) {
    return `System · ${field.form}, ${field.line}`;
  }
  const section = field.sourceSection ?? "—";
  const page = field.sourcePage != null ? `p.${field.sourcePage}` : "";
  return [section, page].filter(Boolean).join(" · ");
}
