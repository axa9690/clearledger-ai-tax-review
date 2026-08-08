import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Search,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/clearledger/AppShell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getDashboardSummary,
  listReturns,
  OLIVIA_WAGES_FIELD_ID,
  RETURN_IDS,
  DEMO_OWNER_NAME,
} from "@/lib/clearledger-api";
import type { QueueListMode, QueueScope, TaxReturn } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClearLedger — CPA Tax Review Queue" },
      {
        name: "description",
        content:
          "ClearLedger prioritizes tax returns by deadline, blockers, financial impact, and AI confidence so CPAs know what to review next.",
      },
      { property: "og:title", content: "ClearLedger — CPA Tax Review Queue" },
      {
        property: "og:description",
        content:
          "A prioritized CPA review queue with source-document traceability and explainable AI findings.",
      },
    ],
  }),
  component: Dashboard,
});

const riskStyles = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning-soft text-warning-foreground border-warning/40",
  medium: "bg-secondary text-secondary-foreground border-border",
  low: "bg-verified-soft text-verified border-verified/25",
} as const;

const RISK_FILTERS = ["All", "Critical", "High", "Medium", "Low"] as const;
const PAGE_SIZE = 10;

function Dashboard() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<(typeof RISK_FILTERS)[number]>("All");
  const [listMode, setListMode] = useState<QueueListMode>("active");
  const [scope, setScope] = useState<QueueScope>("team");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query), 200);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, riskFilter, scope, listMode]);

  const summaryQuery = useQuery({
    queryKey: ["dashboard-summary", scope],
    queryFn: () => getDashboardSummary(scope),
  });

  const returnsQuery = useQuery({
    queryKey: ["returns", debouncedQuery, riskFilter, scope, page, listMode],
    queryFn: () =>
      listReturns({
        query: debouncedQuery,
        scope,
        ownerName: DEMO_OWNER_NAME,
        listMode,
        priority:
          listMode === "sign_off"
            ? "ready_for_signoff"
            : riskFilter === "All"
              ? "all"
              : (riskFilter.toLowerCase() as TaxReturn["priority"]),
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const list = returnsQuery.data;
  const rows = list?.items ?? [];
  const total = list?.total ?? 0;
  const totalPages = list?.totalPages ?? 1;
  const showingFrom = total === 0 ? 0 : (list!.page - 1) * list!.pageSize + 1;
  const showingTo = total === 0 ? 0 : Math.min(list!.page * list!.pageSize, total);

  const coldLoading =
    (summaryQuery.isLoading && !summaryQuery.data) ||
    (returnsQuery.isLoading && !returnsQuery.data);
  const summary = summaryQuery.data;

  return (
    <AppShell
      breadcrumb={
        <span className="font-medium text-foreground">
          {listMode === "sign_off" ? "Ready for sign-off" : "Review queue"}
        </span>
      }
    >
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              {listMode === "sign_off" ? "Ready for sign-off" : "What to work on now"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {listMode === "sign_off"
                ? "Review finished — awaiting CPA sign-off and filing (not filed yet)."
                : "Active review queue. Highest risk and nearest deadlines first."}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 text-xs sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:gap-3">
            {summary ? (
              <>
                <Stat
                  icon={Clock}
                  label="Nearest deadline"
                  value={summary.nearestDeadlineLabel}
                  tip="Earliest open filing deadline in the active review queue"
                />
                <Stat
                  icon={Ban}
                  label="Total blockers"
                  value={String(summary.totalBlockers)}
                  tip={`${summary.blockedReturns} active returns have blockers`}
                />
                <Stat
                  icon={Sparkles}
                  label="Open findings"
                  value={String(summary.openAiFindings)}
                  tip="AI findings on active returns still needing human attention"
                />
                <Stat
                  icon={CheckCircle2}
                  label="Ready for sign-off"
                  value={String(summary.readyForSignOff)}
                  tip="Returns at 100% with no findings or blockers — removed from active queue"
                />
              </>
            ) : (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded border border-border bg-card p-1">
            {(
              [
                { id: "my" as const, label: "My queue" },
                { id: "team" as const, label: "Team queue" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScope(opt.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  scope === opt.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setListMode("active")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                listMode === "active"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Active review
            </button>
            <button
              type="button"
              onClick={() => setListMode("sign_off")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                listMode === "sign_off"
                  ? "bg-verified text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              Ready for sign-off
              {summary ? ` (${summary.readyForSignOff})` : ""}
            </button>
          </div>

          <div className="flex flex-1 items-center gap-2 rounded border border-border bg-card px-2.5 py-2 sm:max-w-xs">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search taxpayer or form"
              aria-label="Search taxpayer or form"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {listMode === "active" && (
            <div className="flex max-w-full flex-wrap items-center gap-1 rounded border border-border bg-card p-1">
              {RISK_FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRiskFilter(f)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    riskFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {coldLoading
              ? "Loading queue…"
              : total === 0
                ? "No returns to show"
                : `Showing ${showingFrom}–${showingTo} of ${total}`}
            {scope === "my" ? ` · Owner: ${DEMO_OWNER_NAME}` : " · All preparers"}
            {listMode === "active" ? " · Active review queue" : " · Ready for sign-off"}
            {returnsQuery.isFetching && !coldLoading ? " · Updating…" : ""}
          </span>
        </div>

        <ol className="mt-3 space-y-2">
          {coldLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="h-16 animate-pulse rounded border border-border bg-card" />
            ))}

          {!coldLoading &&
            rows.map((r, i) => <ReturnRow key={r.id} ret={r} rank={showingFrom + i} />)}

          {!coldLoading && rows.length === 0 && (
            <li className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {listMode === "sign_off"
                ? "No returns are ready for sign-off yet. Finish reviewing fields to move them here."
                : "No returns match this search, filter, or queue scope."}
            </li>
          )}
        </ol>

        {!coldLoading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="text-xs text-muted-foreground">
              Page {list?.page ?? page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded border border-input bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ReturnRow({ ret: r, rank }: { ret: TaxReturn; rank: number }) {
  const search = r.id === RETURN_IDS.olivia ? { field: OLIVIA_WAGES_FIELD_ID } : {};
  const isSignOff = r.priority === "ready_for_signoff";

  return (
    <li className="rounded border border-border bg-card transition-colors hover:border-primary/40">
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4">
        <span className="w-6 shrink-0 text-center font-mono text-xs text-muted-foreground">
          {rank}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/review/$returnId"
              params={{ returnId: r.id }}
              search={search}
              className="truncate text-sm font-semibold text-foreground hover:text-primary hover:underline"
            >
              {r.taxpayer}
            </Link>
            <span className="text-xs text-muted-foreground">{r.form}</span>
            {isSignOff ? (
              <span className="inline-flex items-center gap-1 rounded border border-verified/30 bg-verified-soft px-1.5 py-0.5 text-[10px] font-medium text-verified">
                <CheckCircle2 className="h-3 w-3" />
                Ready for sign-off
              </span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-flex cursor-default items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${riskStyles[r.priority as keyof typeof riskStyles] ?? riskStyles.medium}`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {r.priority}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs bg-foreground text-background">
                  <p className="font-medium">Score {r.priorityScore} · Why ranked here</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-3 text-[11px] opacity-90">
                    {r.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-[11px] opacity-80">
                    Preparer {r.assignedPreparer} · {r.stage}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              <Clock className="h-3.5 w-3.5" />
              {r.dueLabel}
            </span>
            {!isSignOff && (
              <span className="inline-flex items-center gap-1 text-ai">
                <Sparkles className="h-3.5 w-3.5" />
                {r.outstandingFindings} findings
              </span>
            )}
            {r.blockers.length > 0 && (
              <span className="inline-flex items-center gap-1 text-warning-foreground">
                <Ban className="h-3.5 w-3.5" />
                {r.blockers.length} blocker{r.blockers.length === 1 ? "" : "s"}
              </span>
            )}
            <span className="font-mono sm:hidden">{r.reviewProgress}%</span>
          </div>
        </div>

        <div className="hidden w-24 shrink-0 sm:block">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span className="font-mono">{r.reviewProgress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full ${isSignOff ? "bg-verified" : "bg-primary"}`}
              style={{ width: `${r.reviewProgress}%` }}
            />
          </div>
        </div>

        <Link
          to="/review/$returnId"
          params={{ returnId: r.id }}
          search={search}
          className="inline-flex shrink-0 items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isSignOff ? "Open" : "Review"}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </li>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tip,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex min-w-0 cursor-default flex-col rounded border border-border bg-card px-2.5 py-1.5 sm:min-w-[7.5rem]">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {value}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-foreground text-background">{tip}</TooltipContent>
    </Tooltip>
  );
}

function StatSkeleton() {
  return (
    <div className="h-11 w-full animate-pulse rounded border border-border bg-card sm:w-[7.5rem]" />
  );
}
