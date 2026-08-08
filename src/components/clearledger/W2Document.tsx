export function W2Document({
  highlightBox1 = false,
  highlightBox2 = false,
  box1Value = "84,250.00",
  box2Value = "12,640.00",
  copyLabel = "Copy C — For employee’s records",
}: {
  highlightBox1?: boolean;
  highlightBox2?: boolean;
  /** Always the original source extraction — never the corrected return value. */
  box1Value?: string;
  box2Value?: string;
  copyLabel?: string;
}) {
  return (
    <div className="rounded border border-border bg-card font-mono text-[11px] leading-tight shadow-sm">
      <div className="flex items-start justify-between border-b border-border px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Form</p>
          <p className="font-sans text-base font-semibold">W-2</p>
          <p className="text-[10px] text-muted-foreground">Wage and Tax Statement</p>
        </div>
        <div className="text-right">
          <p className="font-sans text-lg font-semibold">2025</p>
          <p className="text-[10px] text-muted-foreground">{copyLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-border">
        <div className="border-r border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">b Employer ID (EIN)</p>
          <p>47-2938471</p>
        </div>
        <div className="p-2">
          <p className="text-[9px] uppercase text-muted-foreground">a Employee SSN</p>
          <p>XXX-XX-4192</p>
        </div>
      </div>

      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">c Employer name, address</p>
        <p>Acme Corporation</p>
        <p>1440 Harbor Point Rd, Rockford, IL 61103</p>
      </div>

      <div className="border-b border-border p-2">
        <p className="text-[9px] uppercase text-muted-foreground">e Employee name</p>
        <p>Olivia Martin</p>
        <p>218 Kestrel Lane, Apt 4, Rockford, IL 61103</p>
      </div>

      <div className="grid grid-cols-2">
        <div
          data-testid="w2-box-1"
          className={`border-b border-r border-border p-2 ${
            highlightBox1 ? "bg-ai-soft ring-2 ring-inset ring-ai" : ""
          }`}
        >
          <p className="text-[9px] uppercase text-muted-foreground">1 Wages, tips, other comp.</p>
          <p className="text-sm font-semibold">{box1Value}</p>
          {highlightBox1 && (
            <p className="mt-1 font-sans text-[10px] font-medium text-ai">▲ Source of Line 1a</p>
          )}
        </div>
        <div
          data-testid="w2-box-2"
          className={`border-b border-border p-2 ${
            highlightBox2 ? "bg-ai-soft ring-2 ring-inset ring-ai" : ""
          }`}
        >
          <p className="text-[9px] uppercase text-muted-foreground">
            2 Federal income tax withheld
          </p>
          <p className="text-sm font-semibold">{box2Value}</p>
          {highlightBox2 && (
            <p className="mt-1 font-sans text-[10px] font-medium text-ai">▲ Source of Line 25a</p>
          )}
        </div>
        <div className="border-b border-r border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">3 Social security wages</p>
          <p>84,250.00</p>
        </div>
        <div className="border-b border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">
            4 Social security tax withheld
          </p>
          <p>5,223.50</p>
        </div>
        <div className="border-b border-r border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">5 Medicare wages and tips</p>
          <p>88,100.00</p>
        </div>
        <div className="border-b border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">6 Medicare tax withheld</p>
          <p>1,277.45</p>
        </div>
        <div className="border-r border-border p-2">
          <p className="text-[9px] uppercase text-muted-foreground">12a Code W (HSA)</p>
          <p>3,850.00</p>
        </div>
        <div className="p-2">
          <p className="text-[9px] uppercase text-muted-foreground">13 Retirement plan</p>
          <p>[X] checked</p>
        </div>
      </div>

      <div className="border-t border-border bg-secondary px-3 py-2 font-sans text-[10px] text-muted-foreground">
        acme-corp-w2-2025.pdf · page 1 of 1 · uploaded Mar 10, 2026 · fictional
      </div>
    </div>
  );
}
