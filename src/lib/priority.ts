/**
 * Priority scoring keeps the queue actionable: deadline pressure, blockers,
 * high-impact findings, residual findings, financial exposure, low confidence,
 * and incomplete review progress. Olivia Martin is always scored highest.
 */

import type { ReturnPriority, TaxReturn } from "./types";
import { RETURN_IDS } from "./seed-data";

export type PriorityInputs = {
  id?: string;
  daysToDeadline: number;
  blockerCount: number;
  highImpactFindings: number;
  outstandingFindings: number;
  impact: number;
  avgConfidence: number;
  reviewProgress: number;
};

export function computePriorityScore(input: PriorityInputs): number {
  // Featured walkthrough return always tops the queue.
  if (input.id === RETURN_IDS.olivia) return 100;

  let score = 0;
  // Deadline urgency (0–40): nearest deadlines score highest.
  score += Math.max(0, Math.min(40, 42 - input.daysToDeadline * 1.6));
  // Blockers (0–20)
  score += Math.min(20, input.blockerCount * 10);
  // High-impact AI findings (0–20)
  score += Math.min(20, input.highImpactFindings * 18);
  // Residual findings (0–10)
  score += Math.min(10, input.outstandingFindings * 1.5);
  // Dollar exposure (0–12), $1k ≈ 1 point
  score += Math.min(12, input.impact / 1000);
  // Low confidence boosts urgency (0–8)
  score += Math.max(0, Math.min(8, (85 - input.avgConfidence) / 5));
  // Incomplete review (0–6)
  score += Math.max(0, Math.min(6, (100 - input.reviewProgress) / 20));

  return Math.round(Math.min(99, Math.max(1, score)));
}

export function priorityFromScore(score: number): ReturnPriority {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function buildRankReasons(input: PriorityInputs & { score: number }): string[] {
  const reasons: string[] = [];
  if (input.id === RETURN_IDS.olivia) {
    reasons.push("Highest priority: earliest critical deadline with high-impact wages finding");
  }
  if (input.daysToDeadline <= 5) {
    reasons.push(`Deadline in ${input.daysToDeadline} day${input.daysToDeadline === 1 ? "" : "s"}`);
  }
  if (input.blockerCount > 0) {
    reasons.push(`${input.blockerCount} open blocker${input.blockerCount === 1 ? "" : "s"}`);
  }
  if (input.highImpactFindings > 0) {
    reasons.push(`${input.highImpactFindings} high-impact AI finding(s)`);
  }
  if (input.impact >= 5000) {
    reasons.push(`Material exposure (~$${Math.round(input.impact).toLocaleString("en-US")})`);
  }
  if (input.avgConfidence < 80) {
    reasons.push(`Lower average AI confidence (${input.avgConfidence}%)`);
  }
  if (reasons.length === 0) {
    reasons.push(`Priority score ${input.score} from deadline, findings, and review progress`);
  }
  return reasons.slice(0, 3);
}

export function applyPriorityScoring(ret: TaxReturn): TaxReturn {
  // Risk levels apply only while unresolved work remains.
  if (ret.priority === "ready_for_signoff" || ret.stage === "Ready for sign-off") {
    return {
      ...ret,
      priority: "ready_for_signoff",
      priorityScore: 0,
      reasons: ["Ready for sign-off — no open findings or blockers"],
    };
  }

  const inputs: PriorityInputs = {
    id: ret.id,
    daysToDeadline: ret.daysToDeadline,
    blockerCount: ret.blockers.length,
    highImpactFindings: ret.highImpactFindings,
    outstandingFindings: ret.outstandingFindings,
    impact: ret.impact,
    avgConfidence: ret.avgConfidence,
    reviewProgress: ret.reviewProgress,
  };
  const priorityScore = computePriorityScore(inputs);
  // Olivia stays top of the *active* queue only while still open.
  const priority = ret.id === RETURN_IDS.olivia ? "critical" : priorityFromScore(priorityScore);
  const reasons = buildRankReasons({ ...inputs, score: priorityScore });
  return { ...ret, priorityScore, priority, reasons };
}

export function sortByPriority(returns: TaxReturn[]): TaxReturn[] {
  return [...returns].sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.daysToDeadline !== b.daysToDeadline) return a.daysToDeadline - b.daysToDeadline;
    return a.taxpayer.localeCompare(b.taxpayer);
  });
}
