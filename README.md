# ClearLedger

ClearLedger is an AI-assisted CPA tax-review prototype built for a case-study demonstration. It shows how a reviewer can prioritize work, trace return values to source documents, and make human decisions over explainable AI-extracted fields.

**All taxpayer information and AI outputs are fictional.**

## Live Demo

Deployed app: [https://anand-clearledger.vercel.app/](https://anand-clearledger.vercel.app/)

Video Walkthrough: [https://drive.google.com/file/d/1HaMPYs1FEDHeCqmygwnU7CRtK1qiLS9n/view](https://drive.google.com/file/d/1HaMPYs1FEDHeCqmygwnU7CRtK1qiLS9n/view)

All deadlines use a fictional demo reference date of **March 16, 2026**.

## Challenges covered

| #      | Challenge                        | How this prototype addresses it                                                                                                                                          |
| ------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1**  | Source Document Traceability     | Field -> document -> page/section -> transformation -> form/line value path; W-2 Box 1 highlight for Olivia wages                                                        |
| **7**  | An Actionable Dashboard          | Prioritized review queue of 100 returns with deadline, blockers, impact, findings, progress, search, priority filters, My Queue / Team Queue, sorting, and pagination     |
| **10** | Trustworthy AI                   | AI explanation, confidence plus evidence, uncertainty, recommended action, human verify / correct / ask-client with audit trail                                          |

## Stack

- TanStack Start (React + file routes)
- TypeScript
- Tailwind CSS + existing ClearLedger design system
- TanStack Query (client data loading)
- localStorage persistence (no backend)

## Installation and run

Requires Node.js 20+ (npm).

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (typically `http://localhost:5173` or the port shown).

Other scripts:

```sh
npm run lint      # ESLint
npm run build     # Production build
npm run preview   # Preview production build
npm run format    # Prettier
```

## Demo walkthrough

1. **Dashboard** -- Load the home page. Olivia Martin is first (critical). The footer of the queue shows **Showing 1-10 of 100.** (page size 10). Summary counts show nearest deadline, blockers, and open AI findings.
2. **Scale controls** -- Use **My queue** / **Team queue**, priority chips (Critical / High / Medium / Low), search, and page controls. Search, filters, sorting, and pagination run across all 100 returns.
3. **Search** -- Type `Olivia` or `Hawthorne`; the queue filters. Clear search to return to the full team queue (**of 100** when nothing is filtered out).
4. **Open return** -- Click **Olivia Martin** or **Review**. Her workspace opens with wages selected; W-2 **Box 1** is highlighted.
5. **Trustworthy AI panel** -- Read explanation, confidence, evidence, uncertainty, transformation, and recommended action. Confidence is never the only signal.
6. **Verify value** -- Click **Verify**. Status becomes verified, reviewer becomes Maya Patel, and an audit event is created. Progress is completed fields / total fields (Olivia about 60% -> 80% after wages). A toast confirms success.
7. **Close the return fully** -- Verify (or Correct) remaining open fields (for example Olivia's **Taxable interest**). When every field is settled and findings are 0, progress hits **100%** and stage becomes **Ready for sign-off**. The return leaves the active queue and appears under **Ready for sign-off**.
8. **Refresh** -- Reload the page; state remains (localStorage).
9. **Correct** -- Select a field, open **Correct**, enter a numeric value and reason, save.
10. **Ask client** -- Saves a linked request (no email); field shows Waiting on client (progress does not increase).
11. **Reset demo** -- Sidebar / footer control restores the 100-return seed.

## What is genuinely functional

- Dashboard summary, prioritized queue of 100 returns, priority filters, My Queue / Team Queue, search, sorting, and pagination (10 per page)
- Review workspace field list, selection, source / traceability panel
- W-2 Box 1 highlight for Olivia's wages field
- Verify / Correct / Ask client with validation, toasts, and audit events
- Persistence of reviewer changes across refresh (localStorage)
- Demo reset to original seed
- Loading skeletons and empty search state
- Ready for sign-off list when a return is fully reviewed

## What is simulated

- No real OCR, LLM, or tax engine
- No authentication / multi-user security
- No document upload or storage service
- No email delivery (client requests are stored only)
- No filing / e-file integrations
- AI "extractions" and confidence scores are seed data
- Async delays (~200-400 ms) only to demonstrate loading states
- Non-Olivia source panels use lightweight fictional forms or metadata (not multi-page PDF viewers)
- Documents / Clients / Audit / Settings nav items are intentionally disabled

## Data architecture

```
src/lib/types.ts            Domain interfaces
src/lib/seed-data.ts        Four detailed returns + 96 scale returns, fields, documents, findings, seed audit
src/lib/clearledger-api.ts  Async mock service layer + localStorage store
src/lib/clearledger-data.ts Status labels / audit formatting helpers
src/lib/priority.ts         Priority score, rank reasons, queue sort
```

UI routes call **only** the service layer (`getDashboardSummary`, `listReturns`, `getReturnById`, `getTaxFields`, `verifyTaxField`, `correctTaxField`, `createClientRequest`, `getAuditEvents`, `resetDemoData`, and related helpers). Components never import raw seed arrays for live data.

Store key: `clearledger-demo-store-v5` in `localStorage`. After seed-size changes, use **Reset demo** or clear that key so the browser reloads the 100-return seed.

### Seed returns (100 total)

**Four detailed demonstration scenarios** (full fields, findings, documents, and review depth for Challenges 1 and 10):

1. **Olivia Martin** -- Form 1040, highest priority, Mar 18 deadline, 60% progress (3 of 5 fields done), open findings, preparer Maya Patel; always ranked first on a fresh seed
2. **Hawthorne Studio LLC** -- Form 1120-S
3. **Ethan and Nora Brooks** -- Joint Form 1040
4. **Northstar Coffee Co.** -- Form 1065

**Ninety-six additional fictional returns** fill the queue to **100** so Challenge 7 can demonstrate search, priority filters, My Queue / Team Queue, sorting, and pagination at scale. Bulk returns have lighter field/source scaffolding; they still participate in filters, ranks, and paging.

On Team queue with no filters: **Showing 1-10 of 100.** (then page 2 shows 11-20 of 100, and so on).

## Important design decisions

- **Frontend-only mock API** -- Keeps deployment simple and matches a short case-study scope without inventing a second stack.
- **Preserve Lovable UI** -- Existing layout, shells, W-2, badges, and modals retained; only wiring, data, and status vocabulary were completed.
- **Field status vocabulary** matches the brief (`ai_generated`, `needs_review`, `verified`, `corrected`, `warning`, `system_calculated`).
- **Progress** is completed fields / total fields. Olivia reaches 100% when wages and taxable interest are settled (federal withheld, dividends, and standard deduction start done). **Ask client** does not increase progress.
- **Audit trail in-review** -- Events rendered on the review screen; a separate Audit page was not built (nav remains placeholder).
- **Maya Patel** is the active demo reviewer on verify/correct actions.
- **Scale vs depth** -- Four named returns carry the deep walkthrough; the other 96 stress queue UX only.

## Deployment

This project is a standard Vite / TanStack Start app. Production build:

```sh
npm run build
npm run preview
```

Deploy the build output with any static/SSR host supported by your Vite config (the Lovable TanStack config defaults to Nitro with a Cloudflare-oriented target). For a pure local demo, `npm run dev` or `npm run preview` is enough.

If connected to Lovable: push to the linked GitHub branch; Lovable syncs commits to the editor for publish from that environment.

### Environment

No required `.env` secrets for the demo. Do not commit real taxpayer data. Optional `VITE_*` variables are unused by the mock layer.

## License / attribution

Prototype UI scaffolded with Lovable (TanStack Start). Domain data and service layer added for the AI engineer case study.
