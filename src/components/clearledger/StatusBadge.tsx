import { Sparkles, CheckCircle2, AlertTriangle, Calculator, PencilLine } from "lucide-react";
import { statusMeta, type FieldStatus } from "@/lib/clearledger-data";

const icons = {
  ai_generated: Sparkles,
  needs_review: AlertTriangle,
  verified: CheckCircle2,
  corrected: PencilLine,
  warning: AlertTriangle,
  system_calculated: Calculator,
} as const;

export function StatusBadge({
  status,
  className = "",
}: {
  status: FieldStatus;
  className?: string;
}) {
  const Icon = icons[status];
  const meta = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}
