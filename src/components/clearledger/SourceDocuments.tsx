/** Lightweight fictional source forms for non–W-2 Olivia fields. */

export function Form1099IntDocument({
  highlightBox1 = true,
  box1Value = "1,842.00",
}: {
  highlightBox1?: boolean;
  box1Value?: string;
}) {
  return (
    <div className="rounded border border-border bg-card font-mono text-[11px] leading-tight shadow-sm">
      <div className="flex items-start justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Form</p>
          <p className="font-sans text-base font-semibold">1099-INT</p>
          <p className="text-[10px] text-muted-foreground">Interest Income</p>
        </div>
        <p className="font-sans text-lg font-semibold">2025</p>
      </div>
      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">Payer</p>
        <p>Northbridge Bank</p>
        <p className="text-muted-foreground">EIN 36-1182044</p>
      </div>
      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">Recipient</p>
        <p>Olivia Martin · XXX-XX-4192</p>
      </div>
      <div
        data-testid="1099int-box-1"
        className={`p-2 ${highlightBox1 ? "bg-ai-soft ring-2 ring-inset ring-ai" : ""}`}
      >
        <p className="text-[9px] uppercase text-muted-foreground">1 Interest income</p>
        <p className="text-sm font-semibold">{box1Value}</p>
        {highlightBox1 && (
          <p className="mt-1 font-sans text-[10px] font-medium text-ai">▲ Source of Line 2b</p>
        )}
      </div>
      <div className="border-t border-border bg-secondary px-3 py-2 font-sans text-[10px] text-muted-foreground">
        northbridge-1099int-2025.pdf · page 1 · fictional
      </div>
    </div>
  );
}

export function Form1099DivDocument({
  highlightBox1a = true,
  box1aValue = "3,610.00",
}: {
  highlightBox1a?: boolean;
  box1aValue?: string;
}) {
  return (
    <div className="rounded border border-border bg-card font-mono text-[11px] leading-tight shadow-sm">
      <div className="flex items-start justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Form</p>
          <p className="font-sans text-base font-semibold">1099-DIV</p>
          <p className="text-[10px] text-muted-foreground">Dividends and Distributions</p>
        </div>
        <p className="font-sans text-lg font-semibold">2025</p>
      </div>
      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">Payer</p>
        <p>Halverson Brokerage</p>
        <p className="text-muted-foreground">EIN 22-4508912</p>
      </div>
      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">Recipient</p>
        <p>Olivia Martin · XXX-XX-4192</p>
      </div>
      <div
        data-testid="1099div-box-1a"
        className={`p-2 ${highlightBox1a ? "bg-ai-soft ring-2 ring-inset ring-ai" : ""}`}
      >
        <p className="text-[9px] uppercase text-muted-foreground">1a Total ordinary dividends</p>
        <p className="text-sm font-semibold">{box1aValue}</p>
        {highlightBox1a && (
          <p className="mt-1 font-sans text-[10px] font-medium text-ai">▲ Source of Line 3b</p>
        )}
      </div>
      <div className="border-t border-border bg-secondary px-3 py-2 font-sans text-[10px] text-muted-foreground">
        halverson-1099div-2025.pdf · page 1 · fictional
      </div>
    </div>
  );
}

export function SystemCalculationPanel({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-4 text-xs shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        System calculation
      </p>
      <p className="mt-1 font-medium">{label}</p>
      <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
      <p className="mt-2 text-muted-foreground">{detail}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">
        No source document — produced from IRS tables / filing-status rules.
      </p>
    </div>
  );
}

export function GenericSourcePanel({
  name,
  section,
  page,
  value,
  taxpayer,
}: {
  name: string;
  section: string | null;
  page: number | null;
  value: string;
  taxpayer: string;
}) {
  return (
    <div className="rounded border border-border bg-card p-3 text-xs shadow-sm">
      <p className="font-medium">{name}</p>
      <p className="mt-1 text-muted-foreground">
        {taxpayer}
        {section ? ` · ${section}` : ""}
        {page != null ? ` · p.${page}` : ""}
      </p>
      <p className="mt-2 font-mono text-sm font-semibold">{value}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Highlighted section matches the selected field. Multi-page PDF viewer is out of scope.
      </p>
    </div>
  );
}
