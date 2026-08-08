import type {
  AuditEvent,
  ClientRequest,
  DemoStore,
  AIReviewFinding,
  SourceDocument,
  TaxField,
  TaxReturn,
  User,
} from "./types";

/** Demo reviewer recorded on verify / correct actions. */
export const DEMO_REVIEWER: User = {
  id: "user-maya-patel",
  name: "Maya Patel",
  role: "reviewer",
  initials: "MP",
};

export const DEMO_USERS: User[] = [
  DEMO_REVIEWER,
  {
    id: "user-jordan-reyes",
    name: "Jordan Reyes",
    role: "preparer",
    initials: "JR",
  },
];

export const RETURN_IDS = {
  olivia: "olivia-martin-1040",
  hawthorne: "hawthorne-studio-1120s",
  brooks: "ethan-nora-brooks-1040",
  northstar: "northstar-coffee-1065",
} as const;

const SEED_RETURNS: TaxReturn[] = [
  {
    id: RETURN_IDS.olivia,
    taxpayer: "Olivia Martin",
    form: "Form 1040",
    formType: "Individual · TY 2025",
    taxYear: 2025,
    stage: "AI-assisted review",
    filingDeadline: "2026-03-18",
    dueLabel: "Due Mar 18 · 2 days",
    daysToDeadline: 2,
    priority: "critical",
    priorityScore: 96,
    // 3 of 5 fields already complete (fed withheld, dividends, standard deduction) → 60%
    reviewProgress: 60,
    outstandingFindings: 3,
    highImpactFindings: 1,
    assignedPreparer: "Maya Patel",
    blockers: ["Unverified wages entry", "Wages require verification"],
    impact: 12400,
    impactNote: "$12,400 refund exposure",
    avgConfidence: 93,
    reasons: [
      "Highest priority: earliest critical deadline (Mar 18)",
      "Primary finding: wages require verification ($84,250)",
      "3 outstanding AI findings with high-impact exposure",
    ],
    primaryFinding: "Wages require verification",
  },
  {
    id: RETURN_IDS.hawthorne,
    taxpayer: "Hawthorne Studio LLC",
    form: "Form 1120-S",
    formType: "S-Corp · TY 2025",
    taxYear: 2025,
    stage: "Document collection",
    filingDeadline: "2026-03-20",
    dueLabel: "Due Mar 20 · 4 days",
    daysToDeadline: 4,
    priority: "high",
    priorityScore: 81,
    reviewProgress: 42,
    outstandingFindings: 2,
    highImpactFindings: 0,
    assignedPreparer: "Maya Patel",
    blockers: ["Missing K-1 for second shareholder"],
    impact: 8600,
    impactNote: "$8,600 basis adjustment",
    avgConfidence: 88,
    reasons: [
      "Missing document blocks completion",
      "Moderate financial impact on shareholder basis",
    ],
    primaryFinding: "Missing shareholder K-1",
  },
  {
    id: RETURN_IDS.brooks,
    taxpayer: "Ethan and Nora Brooks",
    form: "Form 1040",
    formType: "Joint · TY 2025",
    taxYear: 2025,
    stage: "AI-assisted review",
    filingDeadline: "2026-03-25",
    dueLabel: "Due Mar 25 · 9 days",
    daysToDeadline: 9,
    priority: "medium",
    priorityScore: 58,
    reviewProgress: 51,
    outstandingFindings: 4,
    highImpactFindings: 0,
    assignedPreparer: "Jordan Reyes",
    blockers: [],
    impact: 2150,
    impactNote: "$2,150 credit variance",
    avgConfidence: 71,
    reasons: ["Low AI confidence on Schedule C mileage", "No blockers; deadline has slack"],
    primaryFinding: "Schedule C mileage confidence low",
  },
  {
    id: RETURN_IDS.northstar,
    taxpayer: "Northstar Coffee Co.",
    form: "Form 1065",
    formType: "Partnership · TY 2025",
    taxYear: 2025,
    stage: "Final review",
    filingDeadline: "2026-04-01",
    dueLabel: "Due Apr 1 · 16 days",
    daysToDeadline: 16,
    priority: "low",
    priorityScore: 34,
    reviewProgress: 89,
    outstandingFindings: 1,
    highImpactFindings: 0,
    assignedPreparer: "Jordan Reyes",
    blockers: [],
    impact: 900,
    impactNote: "$900 depreciation delta",
    avgConfidence: 96,
    reasons: ["High AI confidence across most fields", "Ready for final read-through"],
    primaryFinding: "Depreciation schedule delta",
  },
];

const SEED_DOCUMENTS: SourceDocument[] = [
  {
    id: "doc-acme-w2-2025",
    returnId: RETURN_IDS.olivia,
    name: "Acme Corporation 2025 W-2",
    type: "W-2",
    taxYear: 2025,
    pageCount: 1,
    uploadedAt: "2026-03-10T14:22:00.000Z",
    employerOrPayer: "Acme Corporation",
    maskedEin: "47-2938471",
    maskedSsn: "XXX-XX-4192",
  },
  {
    id: "doc-northbridge-1099int",
    returnId: RETURN_IDS.olivia,
    name: "Northbridge Bank 1099-INT",
    type: "1099-INT",
    taxYear: 2025,
    pageCount: 1,
    uploadedAt: "2026-03-11T09:05:00.000Z",
    employerOrPayer: "Northbridge Bank",
    maskedEin: "36-1182044",
  },
  {
    id: "doc-halverson-1099div",
    returnId: RETURN_IDS.olivia,
    name: "Halverson Brokerage 1099-DIV",
    type: "1099-DIV",
    taxYear: 2025,
    pageCount: 1,
    uploadedAt: "2026-03-11T09:08:00.000Z",
    employerOrPayer: "Halverson Brokerage",
    maskedEin: "22-4508912",
  },
  {
    id: "doc-hawthorne-k1",
    returnId: RETURN_IDS.hawthorne,
    name: "Hawthorne Studio K-1 draft",
    type: "K-1",
    taxYear: 2025,
    pageCount: 4,
    uploadedAt: "2026-03-08T16:40:00.000Z",
    employerOrPayer: "Hawthorne Studio LLC",
    maskedEin: "84-2201193",
  },
  {
    id: "doc-brooks-w2",
    returnId: RETURN_IDS.brooks,
    name: "Riverside Tech 2025 W-2 (Ethan Brooks)",
    type: "W-2",
    taxYear: 2025,
    pageCount: 1,
    uploadedAt: "2026-03-09T11:15:00.000Z",
    employerOrPayer: "Riverside Tech",
    maskedEin: "15-7723041",
    maskedSsn: "XXX-XX-8831",
  },
  {
    id: "doc-northstar-k1",
    returnId: RETURN_IDS.northstar,
    name: "Northstar Coffee Co. K-1 package",
    type: "K-1",
    taxYear: 2025,
    pageCount: 6,
    uploadedAt: "2026-03-07T13:00:00.000Z",
    employerOrPayer: "Northstar Coffee Co.",
    maskedEin: "91-3340056",
  },
];

const oliviaWagesField: TaxField = {
  id: "field-olivia-wages",
  returnId: RETURN_IDS.olivia,
  label: "Wages, salaries, tips",
  value: "$84,250",
  form: "Form 1040",
  line: "Line 1a",
  status: "needs_review",
  confidence: 93,
  sourceDocumentId: "doc-acme-w2-2025",
  sourcePage: 1,
  sourceSection: "Box 1",
  transformation: "None — direct mapping",
  aiExplanation: "The value was extracted directly from Box 1 of the employer W-2.",
  supportingEvidence: [
    "Tax year matches the return",
    "Box 1 label was clearly recognized",
    "Employer EIN matches taxpayer records",
  ],
  uncertainty: 'The uploaded document is marked "Copy C"',
  recommendedAction:
    "Verify wages against the W-2 Box 1 highlight, or correct if a second W-2 exists.",
  lastReviewedBy: null,
  lastReviewedAt: null,
  impact: "high",
};

const SEED_FIELDS: TaxField[] = [
  oliviaWagesField,
  {
    id: "field-olivia-fed-withheld",
    returnId: RETURN_IDS.olivia,
    label: "Federal tax withheld",
    value: "$12,640",
    form: "Form 1040",
    line: "Line 25a",
    status: "verified",
    confidence: 99,
    sourceDocumentId: "doc-acme-w2-2025",
    sourcePage: 1,
    sourceSection: "Box 2",
    transformation: "None — direct mapping",
    aiExplanation:
      "Federal income tax withheld was read from W-2 Box 2 and mapped to Form 1040 Line 25a.",
    supportingEvidence: [
      "Box 2 value is fully legible",
      "Matches Acme payroll summary total for tax year 2025",
    ],
    uncertainty: null,
    recommendedAction: "No action required — human verified.",
    lastReviewedBy: "Maya Patel",
    lastReviewedAt: "2026-03-12T15:40:00.000Z",
    impact: "normal",
  },
  {
    id: "field-olivia-interest",
    returnId: RETURN_IDS.olivia,
    label: "Taxable interest",
    value: "$1,842",
    form: "Form 1040",
    line: "Line 2b",
    status: "warning",
    confidence: 72,
    sourceDocumentId: "doc-northbridge-1099int",
    sourcePage: 1,
    sourceSection: "Box 1",
    transformation: "None — direct mapping",
    aiExplanation:
      "Interest income was extracted from Northbridge Bank 1099-INT Box 1; scan quality reduced confidence.",
    supportingEvidence: [
      "Payer TIN partially matches prior year",
      "Account last-four digits match client record",
    ],
    uncertainty:
      "Scan blur on Box 1 digit grouping — confirm last two digits with client statement.",
    recommendedAction: "Review source 1099-INT or ask client for a clearer copy.",
    lastReviewedBy: null,
    lastReviewedAt: null,
    impact: "normal",
  },
  {
    id: "field-olivia-dividends",
    returnId: RETURN_IDS.olivia,
    label: "Ordinary dividends",
    value: "$3,610",
    form: "Form 1040",
    line: "Line 3b",
    status: "verified",
    confidence: 98,
    sourceDocumentId: "doc-halverson-1099div",
    sourcePage: 1,
    sourceSection: "Box 1a",
    transformation: "None — direct mapping",
    aiExplanation: "Ordinary dividends were taken from Halverson Brokerage 1099-DIV Box 1a.",
    supportingEvidence: [
      "Brokerage account name matches taxpayer",
      "Box 1a and total ordinary dividends reconcile",
    ],
    uncertainty: null,
    recommendedAction: "No action required — human verified.",
    lastReviewedBy: "Maya Patel",
    lastReviewedAt: "2026-03-12T16:05:00.000Z",
    impact: "normal",
  },
  {
    id: "field-olivia-std-deduction",
    returnId: RETURN_IDS.olivia,
    label: "Standard deduction",
    value: "$15,000",
    form: "Form 1040",
    line: "Line 12",
    status: "system_calculated",
    confidence: null,
    sourceDocumentId: null,
    sourcePage: null,
    sourceSection: null,
    transformation: "IRS 2025 table · Single filing status",
    aiExplanation:
      "System applied the 2025 standard deduction for a single filer; no AI extraction was required.",
    supportingEvidence: ["Filing status = Single", "No itemized deduction package uploaded"],
    uncertainty: null,
    recommendedAction: "Confirm filing status before sign-off.",
    lastReviewedBy: null,
    lastReviewedAt: null,
    impact: "normal",
  },
  {
    id: "field-hawthorne-gross-receipts",
    returnId: RETURN_IDS.hawthorne,
    label: "Gross receipts",
    value: "$412,800",
    form: "Form 1120-S",
    line: "Line 1a",
    status: "needs_review",
    confidence: 86,
    sourceDocumentId: "doc-hawthorne-k1",
    sourcePage: 1,
    sourceSection: "Income summary",
    transformation: "Summed monthly book deposits",
    aiExplanation:
      "Gross receipts were aggregated from monthly book exports and mapped to Form 1120-S Line 1a.",
    supportingEvidence: ["12 monthly deposit totals present", "No cash-basis adjustments flagged"],
    uncertainty: "December export is marked draft.",
    recommendedAction: "Confirm final December books before sign-off.",
    lastReviewedBy: null,
    lastReviewedAt: null,
    impact: "high",
  },
  {
    id: "field-hawthorne-officer-comp",
    returnId: RETURN_IDS.hawthorne,
    label: "Officer compensation",
    value: "$96,000",
    form: "Form 1120-S",
    line: "Line 7",
    status: "verified",
    confidence: 91,
    sourceDocumentId: "doc-hawthorne-k1",
    sourcePage: 2,
    sourceSection: "Payroll summary",
    transformation: "None — direct mapping",
    aiExplanation: "Officer compensation was pulled from payroll year-end summary.",
    supportingEvidence: ["W-2 Box 1 for officer matches"],
    uncertainty: null,
    recommendedAction: "Spot-check against payroll register.",
    lastReviewedBy: "Maya Patel",
    lastReviewedAt: "2026-03-13T11:00:00.000Z",
  },
  {
    id: "field-brooks-wages",
    returnId: RETURN_IDS.brooks,
    label: "Wages (Ethan Brooks)",
    value: "$118,400",
    form: "Form 1040",
    line: "Line 1a",
    status: "verified",
    confidence: 97,
    sourceDocumentId: "doc-brooks-w2",
    sourcePage: 1,
    sourceSection: "Box 1",
    transformation: "None — direct mapping",
    aiExplanation: "Wages extracted from Riverside Tech W-2 Box 1.",
    supportingEvidence: ["EIN matches employer on file"],
    uncertainty: null,
    recommendedAction: "No action required.",
    lastReviewedBy: "Jordan Reyes",
    lastReviewedAt: "2026-03-13T10:20:00.000Z",
  },
  {
    id: "field-brooks-mileage",
    returnId: RETURN_IDS.brooks,
    label: "Schedule C mileage",
    value: "14,220 mi",
    form: "Schedule C",
    line: "Line 9",
    status: "warning",
    confidence: 64,
    sourceDocumentId: "doc-brooks-w2",
    sourcePage: 1,
    sourceSection: "Client mileage log",
    transformation: "Miles × IRS standard rate applied separately",
    aiExplanation:
      "Mileage total was OCR'd from a photo of a handwritten log; confidence is reduced.",
    supportingEvidence: ["Client claimed business use only"],
    uncertainty: "Handwriting ambiguity on March and July totals.",
    recommendedAction: "Request digital log or odometer photos.",
    lastReviewedBy: null,
    lastReviewedAt: null,
    impact: "normal",
  },
  {
    id: "field-northstar-depr",
    returnId: RETURN_IDS.northstar,
    label: "Depreciation",
    value: "$28,450",
    form: "Form 1065",
    line: "Line 16c",
    status: "needs_review",
    confidence: 90,
    sourceDocumentId: "doc-northstar-k1",
    sourcePage: 3,
    sourceSection: "Depreciation schedule",
    transformation: "MACRS calculation applied per asset class",
    aiExplanation:
      "Depreciation was recalculated from the fixed-asset register; one asset class differs from client books by $900.",
    supportingEvidence: ["Asset register present", "Prior-year method consistent"],
    uncertainty: "Espresso machine placed-in-service date may be off by one month.",
    recommendedAction: "Confirm placed-in-service date with client.",
    lastReviewedBy: null,
    lastReviewedAt: null,
  },
  {
    id: "field-northstar-receipts",
    returnId: RETURN_IDS.northstar,
    label: "Gross receipts",
    value: "$1,204,600",
    form: "Form 1065",
    line: "Line 1a",
    status: "verified",
    confidence: 99,
    sourceDocumentId: "doc-northstar-k1",
    sourcePage: 1,
    sourceSection: "P&L gross sales",
    transformation: "None — direct mapping",
    aiExplanation: "Gross receipts taken from year-end P&L.",
    supportingEvidence: ["Bank deposits reconcile within $120"],
    uncertainty: null,
    recommendedAction: "No action required.",
    lastReviewedBy: "Jordan Reyes",
    lastReviewedAt: "2026-03-14T09:00:00.000Z",
  },
];

const SEED_FINDINGS: AIReviewFinding[] = [
  {
    id: "finding-olivia-wages",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-wages",
    title: "Wages require verification",
    severity: "high",
    summary:
      "Form 1040 Line 1a wages of $84,250 were AI-extracted from Acme W-2 Box 1 and need human verification.",
    status: "open",
  },
  {
    id: "finding-olivia-interest",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-interest",
    title: "Interest confidence warning",
    severity: "medium",
    summary: "Taxable interest confidence is 72% due to scan quality on the 1099-INT.",
    status: "open",
  },
  {
    id: "finding-olivia-copyc",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-wages",
    title: "W-2 Copy C marking",
    severity: "low",
    summary:
      'Uploaded W-2 is marked "Copy C"; confirm against employee copy or e-file extract if available.',
    status: "open",
  },
  {
    id: "finding-hawthorne-k1",
    returnId: RETURN_IDS.hawthorne,
    fieldId: "field-hawthorne-gross-receipts",
    title: "Missing shareholder K-1",
    severity: "high",
    summary: "Second shareholder K-1 is missing; basis cannot be finalized.",
    status: "open",
  },
  {
    id: "finding-hawthorne-dec",
    returnId: RETURN_IDS.hawthorne,
    fieldId: "field-hawthorne-gross-receipts",
    title: "December books draft",
    severity: "medium",
    summary: "December book export is still marked draft.",
    status: "open",
  },
  {
    id: "finding-brooks-mileage",
    returnId: RETURN_IDS.brooks,
    fieldId: "field-brooks-mileage",
    title: "Schedule C mileage low confidence",
    severity: "medium",
    summary: "Handwritten mileage log OCR confidence is 64%.",
    status: "open",
  },
  {
    id: "finding-brooks-home-office",
    returnId: RETURN_IDS.brooks,
    fieldId: "field-brooks-mileage",
    title: "Home office worksheet incomplete",
    severity: "low",
    summary: "Home office square footage was not provided in intake.",
    status: "open",
  },
  {
    id: "finding-brooks-qbi",
    returnId: RETURN_IDS.brooks,
    fieldId: "field-brooks-wages",
    title: "QBI estimate pending",
    severity: "low",
    summary: "QBI worksheet not run after mileage adjusts.",
    status: "open",
  },
  {
    id: "finding-brooks-charitable",
    returnId: RETURN_IDS.brooks,
    fieldId: "field-brooks-wages",
    title: "Charitable cash receipt gap",
    severity: "low",
    summary: "One cash donation lacks a receipt over $250.",
    status: "open",
  },
  {
    id: "finding-northstar-depr",
    returnId: RETURN_IDS.northstar,
    fieldId: "field-northstar-depr",
    title: "Depreciation schedule delta",
    severity: "medium",
    summary: "Client books depreciation differs from AI MACRS by $900.",
    status: "open",
  },
];

const SEED_AUDIT: AuditEvent[] = [
  {
    id: "audit-olivia-wages-extract",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-wages",
    fieldLabel: "Wages, salaries, tips",
    action: "ai_extraction_created",
    actor: "ClearLedger AI",
    timestamp: "2026-03-10T14:25:00.000Z",
    previousValue: null,
    newValue: "$84,250",
    reason: "OCR + form mapping from Acme Corporation 2025 W-2, Box 1",
    note: null,
  },
  {
    id: "audit-olivia-interest-extract",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-interest",
    fieldLabel: "Taxable interest",
    action: "ai_extraction_created",
    actor: "ClearLedger AI",
    timestamp: "2026-03-11T09:06:00.000Z",
    previousValue: null,
    newValue: "$1,842",
    reason: "OCR from Northbridge Bank 1099-INT, Box 1",
    note: null,
  },
  {
    id: "audit-olivia-fed-verify",
    returnId: RETURN_IDS.olivia,
    fieldId: "field-olivia-fed-withheld",
    fieldLabel: "Federal tax withheld",
    action: "field_verified",
    actor: "Maya Patel",
    timestamp: "2026-03-12T15:40:00.000Z",
    previousValue: "$12,640",
    newValue: "$12,640",
    reason: null,
    note: "Matches W-2 Box 2",
  },
];

const SEED_REQUESTS: ClientRequest[] = [];

const FIRST_NAMES = [
  "Ava",
  "Noah",
  "Liam",
  "Emma",
  "Sophia",
  "Jackson",
  "Mia",
  "Lucas",
  "Amelia",
  "Henry",
  "Harper",
  "Evelyn",
  "Benjamin",
  "Chloe",
  "Daniel",
  "Grace",
  "Matthew",
  "Zoe",
  "Samuel",
  "Lily",
  "Alexander",
  "Ella",
  "David",
  "Scarlett",
  "Joseph",
  "Victoria",
  "Carter",
  "Penelope",
  "Wyatt",
  "Riley",
];

const LAST_NAMES = [
  "Chen",
  "Nguyen",
  "Patel",
  "Garcia",
  "Kim",
  "Johnson",
  "Williams",
  "Brown",
  "Davis",
  "Miller",
  "Wilson",
  "Moore",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Clark",
  "Lewis",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
];

const BUSINESS_SUFFIXES = [
  "Consulting LLC",
  "Holdings Inc",
  "Partners LP",
  "Studios LLC",
  "Coffee Co.",
  "Tech Group",
  "Capital LLC",
  "Design Co",
  "Logistics LLC",
  "Health Partners",
];

const FORMS: Array<{ form: string; formType: string; kind: "ind" | "biz" }> = [
  { form: "Form 1040", formType: "Individual · TY 2025", kind: "ind" },
  { form: "Form 1040", formType: "Joint · TY 2025", kind: "ind" },
  { form: "Form 1120-S", formType: "S-Corp · TY 2025", kind: "biz" },
  { form: "Form 1065", formType: "Partnership · TY 2025", kind: "biz" },
  { form: "Form 1120", formType: "C-Corp · TY 2025", kind: "biz" },
];

const PREPARERS = ["Maya Patel", "Jordan Reyes"] as const;

const FINDING_SNIPPETS = [
  "Schedule C expense mismatch",
  "Missing K-1 details",
  "Charitable contribution receipt gap",
  "Depreciation basis check",
  "Interest income blurry scan",
  "Box 12 code needs confirmation",
  "State withholding variance",
  "Estimated payment timing",
  "Home office worksheet incomplete",
  "QBI calculation pending",
];

/** Extra mock returns (featured 4 detailed scenarios remain). Total 100 = 4 featured + 96 bulk. */
const BULK_COUNT = 96;

function generateBulkSeed(): {
  returns: TaxReturn[];
  fields: TaxField[];
  documents: SourceDocument[];
  findings: AIReviewFinding[];
} {
  const returns: TaxReturn[] = [];
  const fields: TaxField[] = [];
  const documents: SourceDocument[] = [];
  const findings: AIReviewFinding[] = [];

  for (let i = 1; i <= BULK_COUNT; i++) {
    const id = `ret-${String(i).padStart(3, "0")}`;
    const formMeta = FORMS[i % FORMS.length]!;
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[(i * 3) % LAST_NAMES.length]!;
    const biz = BUSINESS_SUFFIXES[i % BUSINESS_SUFFIXES.length]!;
    const taxpayer =
      formMeta.kind === "biz"
        ? `${last} ${biz}`
        : formMeta.formType.startsWith("Joint")
          ? `${first} and ${FIRST_NAMES[(i + 7) % FIRST_NAMES.length]} ${last}`
          : `${first} ${last}`;

    // Keep deadlines softer than Olivia’s 2-day critical window so she stays first.
    const daysToDeadline = 3 + (i % 40);
    const monthDay = Math.min(28, 18 + (i % 10));
    const filingDeadline = `2026-03-${String(monthDay).padStart(2, "0")}`;
    const dueLabel = `Due Mar ${monthDay} · ${daysToDeadline} days`;
    const preparer = PREPARERS[i % 2]!;
    const findingsCount = 1 + (i % 4);
    const highImpact = i % 11 === 0 ? 1 : 0;
    const progress = 20 + ((i * 7) % 70);
    const impact = 500 + ((i * 137) % 9000);
    const avgConfidence = 60 + (i % 35);
    const hasBlocker = i % 5 === 0;
    const primaryFinding = FINDING_SNIPPETS[i % FINDING_SNIPPETS.length]!;
    const blockers = hasBlocker ? [`Pending: ${primaryFinding}`] : [];

    // provisional scores; real priority is applied in the service layer
    const priorityScore = Math.min(
      94,
      30 + Math.round((40 - daysToDeadline) * 1.2) + findingsCount * 3,
    );

    returns.push({
      id,
      taxpayer,
      form: formMeta.form,
      formType: formMeta.formType,
      taxYear: 2025,
      stage: progress > 80 ? "Final review" : "AI-assisted review",
      filingDeadline,
      dueLabel,
      daysToDeadline,
      priority: "medium",
      priorityScore,
      reviewProgress: progress,
      outstandingFindings: findingsCount,
      highImpactFindings: highImpact,
      assignedPreparer: preparer,
      blockers,
      impact,
      impactNote: `$${impact.toLocaleString("en-US")} exposure`,
      avgConfidence,
      reasons: [`Deadline in ${daysToDeadline} days`, primaryFinding],
      primaryFinding,
    });

    const docId = `doc-${id}-source`;
    documents.push({
      id: docId,
      returnId: id,
      name: `${taxpayer.split(" ")[0]} source package`,
      type: formMeta.kind === "biz" ? "K-1" : "W-2",
      taxYear: 2025,
      pageCount: 1 + (i % 3),
      uploadedAt: `2026-03-${String(5 + (i % 10)).padStart(2, "0")}T12:00:00.000Z`,
      employerOrPayer: formMeta.kind === "biz" ? taxpayer : "Employer LLC",
      maskedEin: `##-###${String(1000 + i).slice(-4)}`,
    });

    const fieldId = `field-${id}-primary`;
    const value = `$${((i * 1234) % 200000).toLocaleString("en-US")}`;
    fields.push({
      id: fieldId,
      returnId: id,
      label: formMeta.kind === "biz" ? "Gross receipts" : "Wages, salaries, tips",
      value,
      form: formMeta.form,
      line: formMeta.kind === "biz" ? "Line 1a" : "Line 1a",
      status: progress > 70 ? "verified" : "needs_review",
      confidence: avgConfidence,
      sourceDocumentId: docId,
      sourcePage: 1,
      sourceSection: formMeta.kind === "biz" ? "Income summary" : "Box 1",
      transformation: "None — direct mapping",
      aiExplanation: `Simulated AI extraction for ${taxpayer} (${primaryFinding}).`,
      supportingEvidence: ["Document type recognized", "Tax year matches return"],
      uncertainty: hasBlocker ? "Supporting attachment incomplete" : null,
      recommendedAction: "Spot-check source section before sign-off.",
      lastReviewedBy: progress > 70 ? preparer : null,
      lastReviewedAt: progress > 70 ? "2026-03-12T10:00:00.000Z" : null,
      impact: highImpact ? "high" : "normal",
      sourceExtractedValue: value,
    });

    for (let f = 0; f < findingsCount; f++) {
      findings.push({
        id: `finding-${id}-${f}`,
        returnId: id,
        fieldId,
        title: FINDING_SNIPPETS[(i + f) % FINDING_SNIPPETS.length]!,
        severity: f === 0 && highImpact ? "high" : f === 0 ? "medium" : "low",
        summary: `Simulated finding for ${taxpayer}.`,
        status: "open",
      });
    }
  }

  return { returns, fields, documents, findings };
}

function withSourceExtractedValues(fields: TaxField[]): TaxField[] {
  return fields.map((f) => ({
    ...f,
    sourceExtractedValue: f.sourceExtractedValue ?? f.value,
  }));
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Immutable seed snapshot used for reset and cold start. */
export function createSeedStore(): DemoStore {
  const bulk = generateBulkSeed();
  return deepClone({
    returns: [...SEED_RETURNS, ...bulk.returns],
    fields: withSourceExtractedValues([...SEED_FIELDS, ...bulk.fields]),
    documents: [...SEED_DOCUMENTS, ...bulk.documents],
    findings: [...SEED_FINDINGS, ...bulk.findings],
    auditEvents: SEED_AUDIT,
    clientRequests: SEED_REQUESTS,
    users: DEMO_USERS,
  });
}

/** Featured return ids + bulk pattern for route validation (SSR-safe). */
export function isKnownReturnId(returnId: string): boolean {
  if ((Object.values(RETURN_IDS) as string[]).includes(returnId)) return true;
  return /^ret-\d{3}$/.test(returnId);
}

export const OLIVIA_WAGES_FIELD_ID = oliviaWagesField.id;
export const DEMO_OWNER_NAME = DEMO_REVIEWER.name;
export const TOTAL_SEED_RETURNS = 4 + BULK_COUNT;
