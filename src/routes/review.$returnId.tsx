import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  PencilLine,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  FileText,
  History,
  Hourglass,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/clearledger/AppShell";
import { StatusBadge } from "@/components/clearledger/StatusBadge";
import { W2Document } from "@/components/clearledger/W2Document";
import {
  Form1099DivDocument,
  Form1099IntDocument,
  GenericSourcePanel,
  SystemCalculationPanel,
} from "@/components/clearledger/SourceDocuments";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  correctTaxField,
  createClientRequest,
  DEMO_REVIEWER,
  getAuditEvents,
  getReturnById,
  getSourceDocument,
  getTaxFields,
  isKnownReturnId,
  OLIVIA_WAGES_FIELD_ID,
  RETURN_IDS,
  verifyTaxField,
} from "@/lib/clearledger-api";
import { auditActionLabels, formatAuditTimestamp } from "@/lib/clearledger-data";
import type { AuditEvent, TaxField } from "@/lib/types";

type ReviewSearch = {
  field?: string;
};

export const Route = createFileRoute("/review/$returnId")({
  validateSearch: (search: Record<string, unknown>): ReviewSearch => {
    const field = search["field"];
    return typeof field === "string" ? { field } : {};
  },
  loader: ({ params }) => {
    if (!isKnownReturnId(params.returnId)) throw notFound();
    return { returnId: params.returnId };
  },
  // Avoid large default “Working…” shell during light client navigations.
  pendingMs: 500,
  pendingMinMs: 0,
  head: () => ({
    meta: [
      { title: "Return review — ClearLedger" },
      {
        name: "description",
        content:
          "Review AI-extracted tax return fields side by side with the source document, traceability path, and human correction actions.",
      },
    ],
  }),
  component: ReviewScreen,
});

type Modal = null | "correct" | "ask";

function ReviewScreen() {
  const { returnId } = Route.useLoaderData();
  const { field: fieldFromSearch } = Route.useSearch();
  const navigate = useNavigate({ from: "/review/$returnId" });
  const queryClient = useQueryClient();

  const returnQuery = useQuery({
    queryKey: ["return", returnId],
    queryFn: () => getReturnById(returnId),
  });
  const fieldsQuery = useQuery({
    queryKey: ["fields", returnId],
    queryFn: () => getTaxFields(returnId),
  });
  const auditQuery = useQuery({
    queryKey: ["audit", returnId],
    queryFn: () => getAuditEvents(returnId),
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [showAiDetail, setShowAiDetail] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const fields = useMemo(() => fieldsQuery.data ?? [], [fieldsQuery.data]);
  const ret = returnQuery.data;

  useEffect(() => {
    if (!fields.length) return;
    const preferred =
      (fieldFromSearch && fields.find((f) => f.id === fieldFromSearch)?.id) ||
      (returnId === RETURN_IDS.olivia
        ? fields.find((f) => f.id === OLIVIA_WAGES_FIELD_ID)?.id
        : undefined) ||
      fields[0]?.id ||
      null;
    setSelectedId((current) => {
      if (current && fields.some((f) => f.id === current)) return current;
      return preferred;
    });
  }, [fields, fieldFromSearch, returnId]);

  useEffect(() => {
    setShowAiDetail(false);
  }, [selectedId]);

  const selected = fields.find((f) => f.id === selectedId) ?? null;

  const documentQuery = useQuery({
    queryKey: ["document", selected?.sourceDocumentId],
    queryFn: () =>
      selected?.sourceDocumentId
        ? getSourceDocument(selected.sourceDocumentId)
        : Promise.resolve(null),
    enabled: Boolean(selected?.sourceDocumentId),
  });

  // Source-side values never follow human corrections (frozen extraction).
  const wagesSource =
    fields.find((f) => f.id === OLIVIA_WAGES_FIELD_ID)?.sourceExtractedValue ?? "$84,250";
  const fedSource =
    fields.find((f) => f.id === "field-olivia-fed-withheld")?.sourceExtractedValue ?? "$12,640";
  const interestSource =
    fields.find((f) => f.id === "field-olivia-interest")?.sourceExtractedValue ?? "$1,842";
  const divSource =
    fields.find((f) => f.id === "field-olivia-dividends")?.sourceExtractedValue ?? "$3,610";

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["return", returnId] }),
      queryClient.invalidateQueries({ queryKey: ["fields", returnId] }),
      queryClient.invalidateQueries({ queryKey: ["audit", returnId] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["returns"] }),
    ]);
  };

  const verifyMutation = useMutation({
    mutationFn: () => verifyTaxField(selected!.id, DEMO_REVIEWER.id),
    onSuccess: async (result) => {
      await invalidateAll();
      toast.success("Value verified", {
        description: `${result.field.label} verified · findings ${result.return.outstandingFindings} · progress ${result.return.reviewProgress}%`,
      });
    },
    onError: (err: Error) => {
      toast.error("Verification failed", { description: err.message });
    },
  });

  const correctMutation = useMutation({
    mutationFn: (input: { value: string; reason: string; note: string }) =>
      correctTaxField(selected!.id, input.value, input.reason, input.note, DEMO_REVIEWER.id),
    onSuccess: async (result) => {
      await invalidateAll();
      setModal(null);
      toast.success("Correction saved", {
        description: `${result.field.label} → ${result.field.value} · recorded in audit trail`,
      });
    },
    onError: (err: Error) => {
      toast.error("Correction failed", { description: err.message });
    },
  });

  const askMutation = useMutation({
    mutationFn: (message: string) => createClientRequest(selected!.id, message, DEMO_REVIEWER.name),
    onSuccess: async (result) => {
      await invalidateAll();
      setModal(null);
      toast.success("Client request saved", {
        description: `Linked to ${result.field.label}${
          result.request.documentId ? ` · doc ${result.request.documentId}` : ""
        } (no email sent)`,
      });
    },
    onError: (err: Error) => {
      toast.error("Could not save request", { description: err.message });
    },
  });

  const coldLoading =
    (returnQuery.isLoading && !returnQuery.data) || (fieldsQuery.isLoading && !fieldsQuery.data);
  const mutating = verifyMutation.isPending || correctMutation.isPending || askMutation.isPending;

  if (coldLoading || !ret) {
    return (
      <AppShell
        breadcrumb={
          <span className="flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Queue
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">Loading…</span>
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <div className="h-80 animate-pulse rounded border border-border bg-card" />
          <div className="h-80 animate-pulse rounded border border-border bg-card" />
          <div className="h-80 animate-pulse rounded border border-border bg-card" />
        </div>
      </AppShell>
    );
  }

  if (!selected) {
    return (
      <AppShell
        breadcrumb={
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Queue
          </Link>
        }
      >
        <p className="p-8 text-sm text-muted-foreground">No tax fields found for this return.</p>
      </AppShell>
    );
  }

  const canVerify =
    selected.status !== "verified" &&
    selected.status !== "corrected" &&
    selected.status !== "system_calculated";

  const pathNodes = buildValuePath(selected);
  const originalSource = selected.sourceExtractedValue ?? selected.value;
  const isCorrected = selected.status === "corrected";

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-2">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Queue
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">{ret.taxpayer}</span>
        </span>
      }
    >
      {mutating && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-40 rounded border border-border bg-card px-3 py-2 text-xs shadow-md">
          Working…
        </div>
      )}

      <div className="border-b border-border bg-card px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {ret.taxpayer}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {ret.form} · {ret.taxYear}
              </span>
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-destructive">{ret.dueLabel}</span>
              {ret.priority === "ready_for_signoff" ? (
                <span className="inline-flex items-center gap-1 rounded border border-verified/30 bg-verified-soft px-1.5 py-0.5 text-[11px] font-medium text-verified">
                  <CheckCircle2 className="h-3 w-3" />
                  Ready for sign-off
                </span>
              ) : (
                <>
                  <span className="text-ai">{ret.outstandingFindings} open findings</span>
                  <span className="uppercase">{ret.priority}</span>
                </>
              )}
              <span>{ret.stage}</span>
            </div>
          </div>
          <div className="w-40 sm:w-48">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Progress</span>
              <span className="font-mono">{ret.reviewProgress}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${ret.reviewProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:gap-4 lg:p-4">
        <section className="order-2 rounded border border-border bg-card lg:order-1 max-h-[40vh] overflow-y-auto lg:max-h-none">
          <header className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fields
          </header>
          <ul className="divide-y divide-border">
            {fields.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(f.id);
                    void navigate({
                      search: (prev) => ({ ...prev, field: f.id }),
                      replace: true,
                    });
                  }}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    f.id === selected.id ? "bg-accent" : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{f.label}</span>
                    <span className="shrink-0 font-mono text-xs">{f.value}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={f.status} />
                    {f.waitingOnClient && (
                      <Hourglass className="h-3 w-3 text-warning-foreground" aria-label="Waiting" />
                    )}
                    {f.impact === "high" && (
                      <span className="text-[10px] font-medium text-warning-foreground">
                        Impact: High
                      </span>
                    )}
                    {f.confidence != null && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        AI confidence: {f.confidence}%
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="order-1 space-y-3 lg:order-2">
          <div className="rounded border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {selected.label}
                  <span className="text-muted-foreground/70"> · {selected.line}</span>
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                  {selected.value}
                </p>
                {selected.confidence != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    AI confidence: {selected.confidence}%
                    {selected.impact === "high" ? " · Impact: High" : ""}
                  </p>
                )}
                {selected.confidence == null && selected.impact === "high" && (
                  <p className="mt-1 text-xs text-warning-foreground">Impact: High</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={selected.status} />
                {selected.waitingOnClient && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-warning-foreground">
                    <Hourglass className="h-3 w-3" /> Waiting on client
                  </span>
                )}
              </div>
            </div>

            {/* Full value path */}
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Value path
              </p>
              <p className="text-xs leading-relaxed text-foreground">{pathNodes.join(" → ")}</p>
              {isCorrected && (
                <p className="rounded border border-verified/30 bg-verified-soft/40 px-2.5 py-1.5 text-xs text-foreground">
                  Source {originalSource} → Human correction → Corrected return value{" "}
                  {selected.value}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {pathNodes.map((node, i) => (
                  <span key={node} className="inline-flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-1 ${
                        i === 1 ? "border-ai/25 bg-ai-soft text-ai" : "border-border bg-secondary"
                      }`}
                    >
                      {i === 0 ? (
                        <FileText className="h-3 w-3" />
                      ) : i === pathNodes.length - 1 ? (
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      {node}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <Collapsible open={showAiDetail} onOpenChange={setShowAiDetail} className="mt-3">
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-ai/25 bg-ai-soft/40 px-3 py-2 text-left text-xs font-medium text-ai transition-colors hover:bg-ai-soft/70">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI reasoning & evidence
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showAiDetail ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3 rounded border border-ai/20 bg-ai-soft/30 px-3 py-3 text-xs">
                <div>
                  <p className="font-semibold text-ai">What the AI did</p>
                  <p className="mt-1 leading-relaxed text-foreground/90">
                    {selected.aiExplanation} Extracted{" "}
                    <span className="font-mono font-medium">{originalSource}</span>
                    {selected.confidence != null && <> at {selected.confidence}% confidence</>}.
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Why</p>
                  <p className="mt-1 text-muted-foreground">
                    Mapped {pathNodes[0]} using transformation “{selected.transformation}” into{" "}
                    {selected.form}, {selected.line}. Confidence alone is not sufficient evidence.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="font-semibold">Supporting evidence</p>
                    <ul className="mt-1 space-y-1 text-muted-foreground">
                      {selected.supportingEvidence.map((item) => (
                        <li key={item} className="flex gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-verified" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold">Recommended action</p>
                    <p className="mt-1 text-muted-foreground">{selected.recommendedAction}</p>
                    {selected.uncertainty && (
                      <p className="mt-2 flex gap-1.5 text-warning-foreground">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>
                          <span className="font-medium">Uncertainty: </span>
                          {selected.uncertainty}
                        </span>
                      </p>
                    )}
                    {selected.lastReviewedBy && (
                      <p className="mt-2 text-muted-foreground">
                        Last reviewed by {selected.lastReviewedBy}
                        {selected.lastReviewedAt
                          ? ` · ${formatAuditTimestamp(selected.lastReviewedAt)}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => verifyMutation.mutate()}
                disabled={!canVerify || verifyMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {selected.status === "verified"
                  ? "Verified"
                  : selected.status === "corrected"
                    ? "Corrected"
                    : verifyMutation.isPending
                      ? "Verifying…"
                      : "Verify"}
              </button>
              <button
                type="button"
                onClick={() => setModal("correct")}
                disabled={selected.status === "system_calculated" || correctMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-input bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <PencilLine className="h-3.5 w-3.5" /> Correct
              </button>
              <button
                type="button"
                onClick={() => setModal("ask")}
                disabled={askMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-input bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <MessageSquare className="h-3.5 w-3.5" /> Ask client
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center self-center text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-foreground text-background">
                  Actions update status, findings, progress, dashboard counts, and audit trail.
                  Changes persist after refresh.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Collapsible open={showAudit} onOpenChange={setShowAudit}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary">
              <span className="inline-flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Audit trail
                <span className="font-mono text-muted-foreground/70">
                  ({auditQuery.data?.length ?? 0})
                </span>
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showAudit ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 rounded border border-border bg-card px-3 py-2">
              {auditQuery.isLoading ? (
                <p className="text-[11px] text-muted-foreground">Loading…</p>
              ) : (
                <ul className="max-h-40 space-y-1.5 overflow-y-auto font-mono text-[11px] text-muted-foreground">
                  {(auditQuery.data ?? []).map((a) => (
                    <li key={a.id}>
                      <AuditLine event={a} />
                    </li>
                  ))}
                  {(auditQuery.data ?? []).length === 0 && <li>No events yet.</li>}
                </ul>
              )}
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section className="order-3 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source
            </h2>
            <SourceHighlightLabel field={selected} />
          </div>
          <SourcePanel
            field={selected}
            {...(documentQuery.data?.name ? { documentName: documentQuery.data.name } : {})}
            taxpayer={ret.taxpayer}
            wagesSource={wagesSource}
            fedSource={fedSource}
            interestSource={interestSource}
            divSource={divSource}
          />
        </section>
      </div>

      {modal === "correct" && (
        <CorrectModal
          field={selected}
          busy={correctMutation.isPending}
          onClose={() => setModal(null)}
          onSubmit={(value, reason, note) => correctMutation.mutate({ value, reason, note })}
        />
      )}

      {modal === "ask" && (
        <AskClientModal
          field={selected}
          taxpayer={ret.taxpayer}
          {...(documentQuery.data?.name ? { documentName: documentQuery.data.name } : {})}
          busy={askMutation.isPending}
          onClose={() => setModal(null)}
          onSubmit={(message) => askMutation.mutate(message)}
        />
      )}
    </AppShell>
  );
}

function buildValuePath(field: TaxField): string[] {
  if (field.status === "system_calculated" || !field.sourceSection) {
    return [
      "System calculation",
      field.transformation || "IRS table rules",
      `${field.form} ${field.line}`,
    ];
  }

  const sourceNode =
    field.sourceDocumentId === "doc-acme-w2-2025"
      ? `W-2 ${field.sourceSection}`
      : field.sourceDocumentId === "doc-northbridge-1099int"
        ? `1099-INT ${field.sourceSection}`
        : field.sourceDocumentId === "doc-halverson-1099div"
          ? `1099-DIV ${field.sourceSection}`
          : field.sourceSection;

  const transform = field.transformation.startsWith("None")
    ? "No transformation — direct mapping"
    : field.transformation;

  return [sourceNode, transform, `${field.form} ${field.line}`];
}

function SourceHighlightLabel({ field }: { field: TaxField }) {
  if (field.status === "system_calculated") {
    return <span className="text-[11px] text-muted-foreground">System</span>;
  }
  const label =
    field.sourceDocumentId === "doc-acme-w2-2025"
      ? field.sourceSection === "Box 2"
        ? "Box 2 highlighted"
        : "Box 1 highlighted"
      : field.sourceDocumentId === "doc-northbridge-1099int"
        ? "Box 1 highlighted"
        : field.sourceDocumentId === "doc-halverson-1099div"
          ? "Box 1a highlighted"
          : (field.sourceSection ?? "Source");
  return <span className="text-[11px] font-medium text-ai">{label}</span>;
}

function SourcePanel({
  field,
  documentName,
  taxpayer,
  wagesSource,
  fedSource,
  interestSource,
  divSource,
}: {
  field: TaxField;
  documentName?: string;
  taxpayer: string;
  wagesSource: string;
  fedSource: string;
  interestSource: string;
  divSource: string;
}) {
  if (field.status === "system_calculated" || !field.sourceDocumentId) {
    return (
      <SystemCalculationPanel
        label={field.label}
        value={field.value}
        detail={field.transformation}
      />
    );
  }

  if (field.sourceDocumentId === "doc-acme-w2-2025") {
    return (
      <W2Document
        highlightBox1={field.sourceSection === "Box 1"}
        highlightBox2={field.sourceSection === "Box 2"}
        box1Value={formatDocAmount(wagesSource)}
        box2Value={formatDocAmount(fedSource)}
        copyLabel="Copy C — For employee’s records"
      />
    );
  }

  if (field.sourceDocumentId === "doc-northbridge-1099int") {
    return (
      <Form1099IntDocument
        highlightBox1={field.sourceSection === "Box 1"}
        box1Value={formatDocAmount(interestSource)}
      />
    );
  }

  if (field.sourceDocumentId === "doc-halverson-1099div") {
    return (
      <Form1099DivDocument
        highlightBox1a={field.sourceSection === "Box 1a"}
        box1aValue={formatDocAmount(divSource)}
      />
    );
  }

  return (
    <GenericSourcePanel
      name={documentName ?? "Source document"}
      section={field.sourceSection}
      page={field.sourcePage}
      value={field.sourceExtractedValue ?? field.value}
      taxpayer={taxpayer}
    />
  );
}

function formatDocAmount(currency: string): string {
  const cleaned = currency.replace(/[$,\s]/g, "");
  const num = Number(cleaned);
  if (Number.isNaN(num)) return cleaned;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function AuditLine({ event }: { event: AuditEvent }) {
  const label = auditActionLabels[event.action] ?? event.action;
  const parts = [formatAuditTimestamp(event.timestamp), event.actor, label, event.fieldLabel ?? ""];
  if (event.previousValue && event.newValue && event.previousValue !== event.newValue) {
    parts.push(`${event.previousValue} → ${event.newValue}`);
  }
  if (event.reason) parts.push(event.reason);
  if (event.note) parts.push(event.note);
  return <>{parts.filter(Boolean).join(" · ")}</>;
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded border border-border bg-card shadow-lg"
      >
        <header className="border-b border-border px-4 py-3 text-sm font-semibold">{title}</header>
        <div className="p-4">{children}</div>
        <footer className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Recorded in audit trail
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}

const reasons = [
  "Source document misread",
  "Additional W-2 received",
  "Client-provided correction",
  "Reclassified per IRS guidance",
];

function CorrectModal({
  field,
  busy,
  onClose,
  onSubmit,
}: {
  field: TaxField;
  busy: boolean;
  onClose: () => void;
  onSubmit: (value: string, reason: string, note: string) => void;
}) {
  const [value, setValue] = useState(field.value);
  const [reason, setReason] = useState<string>(reasons[0]!);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const cleaned = value.replace(/[$,\s]/g, "");
    if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
      setError("Enter a valid numeric value (e.g. 84250 or 84,250).");
      return;
    }
    if (!reason.trim()) {
      setError("Select a correction reason.");
      return;
    }
    setError(null);
    onSubmit(value, reason, note);
  }

  return (
    <ModalShell title={`Correct — ${field.label}`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          Current return value <span className="font-mono">{field.value}</span>
          {field.sourceExtractedValue && field.sourceExtractedValue !== field.value && (
            <>
              {" "}
              · Source remains <span className="font-mono">{field.sourceExtractedValue}</span>
            </>
          )}
        </p>
        <label className="block">
          <span className="font-medium">New value</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            className="mt-1 w-full rounded border border-input bg-background px-2.5 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="font-medium">Reason (required)</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-primary"
          >
            {reasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-medium">Note</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional workpaper note"
            className="mt-1 w-full rounded border border-input bg-background px-2.5 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={handleSave}
          className="w-full rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save correction"}
        </button>
      </div>
    </ModalShell>
  );
}

function AskClientModal({
  field,
  taxpayer,
  documentName,
  busy,
  onClose,
  onSubmit,
}: {
  field: TaxField;
  taxpayer: string;
  documentName?: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
}) {
  const firstName = taxpayer.split(" ")[0] ?? "there";
  const doc =
    documentName ?? (field.sourceSection ? `source (${field.sourceSection})` : "source document");
  const [message, setMessage] = useState(
    `Hi ${firstName},\n\nWhile reviewing your ${field.form} I want to confirm one item before we file. ${doc} reports ${field.sourceExtractedValue ?? field.value}${
      field.sourceSection ? ` in ${field.sourceSection}` : ""
    }, which we've entered on ${field.form}, ${field.line}.\n\nCould you confirm this amount is complete and correct for tax year 2025?\n\nThank you,\nMaya Patel, CPA — ClearLedger`,
  );
  const [error, setError] = useState<string | null>(null);

  return (
    <ModalShell title={`Ask client — ${field.label}`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <p className="text-muted-foreground">
          Linked to field <span className="font-mono">{field.id}</span>
          {field.sourceDocumentId ? (
            <>
              {" "}
              · document <span className="font-mono">{field.sourceDocumentId}</span>
            </>
          ) : null}{" "}
          · no email sent
        </p>
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError(null);
          }}
          rows={10}
          className="w-full rounded border border-input bg-background px-2.5 py-2 text-xs leading-relaxed outline-none focus:border-primary"
        />
        {error && (
          <p className="rounded border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!message.trim()) {
              setError("Message is required.");
              return;
            }
            onSubmit(message);
          }}
          className="w-full rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save request"}
        </button>
      </div>
    </ModalShell>
  );
}
