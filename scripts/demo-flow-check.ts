/**
 * Lightweight demo-flow check for the ClearLedger mock API (localStorage-backed).
 * Run: npx tsx scripts/demo-flow-check.ts
 */

const mem = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  },
};

async function main() {
  const api = await import("../src/lib/clearledger-api.ts");
  const seed = await import("../src/lib/seed-data.ts");
  await api.resetDemoData();

  const EXPECTED = seed.TOTAL_SEED_RETURNS;
  assert(EXPECTED === 100, `seed total constant must be 100, got ${EXPECTED}`);

  const list = await api.listReturns({ page: 1, pageSize: 10, scope: "team", listMode: "active" });
  assert(list.total === 100, `expected 100 active returns, got ${list.total}`);
  assert(list.totalPages === 10, `expected 10 pages, got ${list.totalPages}`);
  assert(list.items[0]!.taxpayer === "Olivia Martin", "Olivia ranked first");
  assert(list.items[0]!.priority === "critical", "Olivia starts critical");
  assert(list.items.length === 10, "page 1 has 10");

  const page2 = await api.listReturns({ page: 2, pageSize: 10, scope: "team", listMode: "active" });
  assert(page2.items.length === 10, "page 2 has 10");
  assert(
    page2.items.every((r) => r.id !== "olivia-martin-1040"),
    "Olivia only on first page of sort",
  );

  const page10 = await api.listReturns({
    page: 10,
    pageSize: 10,
    scope: "team",
    listMode: "active",
  });
  assert(page10.items.length === 10, "page 10 has 10");

  const summary0 = await api.getDashboardSummary("team");
  assert(summary0.openReturns === 100, "active open returns 100");
  assert(summary0.readyForSignOff === 0, "none ready yet");

  const myQueue = await api.listReturns({
    page: 1,
    pageSize: 10,
    scope: "my",
    ownerName: api.DEMO_OWNER_NAME,
    listMode: "active",
  });
  assert(myQueue.total > 0 && myQueue.total < 100, "My queue is a subset of team");
  assert(
    myQueue.items.every((r) => r.assignedPreparer === api.DEMO_OWNER_NAME),
    "My queue only owner returns",
  );

  const critical = await api.listReturns({
    page: 1,
    pageSize: 10,
    listMode: "active",
    priority: "critical",
  });
  assert(critical.total >= 1, "critical filter returns rows");
  assert(
    critical.items.every((r) => r.priority === "critical"),
    "critical filter accuracy",
  );

  const search = await api.listReturns({
    page: 1,
    pageSize: 10,
    query: "Olivia",
    listMode: "active",
  });
  assert(search.total >= 1, "search finds Olivia");
  assert(
    search.items.some((r) => r.taxpayer.includes("Olivia")),
    "search match",
  );

  const fields = await api.getTaxFields("olivia-martin-1040");
  const wages = fields.find((f) => f.id === api.OLIVIA_WAGES_FIELD_ID)!;
  const interest = fields.find((f) => f.label === "Taxable interest")!;

  await api.verifyTaxField(wages.id);
  await api.verifyTaxField(interest.id);

  const closed = await api.getReturnById("olivia-martin-1040");
  assert(closed!.reviewProgress === 100, "100% progress");
  assert(closed!.outstandingFindings === 0, "no findings");
  assert(closed!.blockers.length === 0, "no blockers");
  assert(closed!.priority === "ready_for_signoff", "priority ready for sign-off");
  assert(closed!.stage === "Ready for sign-off", "stage ready");

  const activeAfter = await api.listReturns({
    page: 1,
    pageSize: 10,
    listMode: "active",
  });
  assert(
    activeAfter.items.every((r) => r.id !== "olivia-martin-1040"),
    "Olivia removed from active queue",
  );
  assert(activeAfter.total === 99, `active total 99 got ${activeAfter.total}`);

  const signOff = await api.listReturns({ page: 1, pageSize: 10, listMode: "sign_off" });
  assert(signOff.total === 1, "one ready for sign-off");
  assert(signOff.items[0]!.id === "olivia-martin-1040", "Olivia in sign-off list");

  const summary1 = await api.getDashboardSummary("team");
  assert(summary1.openReturns === 99, "dashboard active 99");
  assert(summary1.readyForSignOff === 1, "dashboard ready 1");

  const audit = await api.getAuditEvents("olivia-martin-1040");
  const signOffEvents = audit.filter((e) => e.action === "review_completed_sign_off");
  assert(signOffEvents.length === 1, "exactly one sign-off audit");
  assert(
    signOffEvents[0]!.note === "Review completed and moved to sign-off.",
    "audit note wording",
  );

  // Re-verify shouldn't add a second sign-off audit
  await api.verifyTaxField(wages.id);
  const audit2 = await api.getAuditEvents("olivia-martin-1040");
  assert(
    audit2.filter((e) => e.action === "review_completed_sign_off").length === 1,
    "no duplicate sign-off audit",
  );

  await api.resetDemoData();
  const reset = await api.getReturnById("olivia-martin-1040");
  assert(reset!.priority === "critical", "reset restores critical");
  assert(reset!.stage !== "Ready for sign-off", "reset stage not sign-off");
  assert(reset!.reviewProgress === 60, "reset progress");
  const activeReset = await api.listReturns({ listMode: "active", pageSize: 10 });
  assert(activeReset.total === 100, "reset active 100");
  assert(activeReset.items[0]!.id === "olivia-martin-1040", "Olivia back in active queue");

  console.log("ALL_API_CHECKS_PASSED");
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
