# approval-modules

Prototypes for **Visma.net Approval**. First view: **My tasks**.

## Run

No build step. Either open `index.html` directly, or serve the folder so the
Inter web fonts load over http:

```sh
python3 -m http.server 8080
# → http://localhost:8080
```

## Files

| Path | What it is |
|---|---|
| `index.html` | App shell (Gaia page header + breadcrumb), toolbar, grid mount, footer bar |
| `css/my-tasks.css` | Only what Gaia has no component for: the grid, toolbar row, footer bar |
| `js/data.js` | 202 synthetic tasks from a seeded PRNG — identical on every reload |
| `js/my-tasks.js` | Grouping, sorting, search, selection, column chooser, row actions |
| `node_modules/@vsn-ux/gaia-styles/` | Gaia from npm, pinned exact at 0.6.11 in `package.json`. The old vendored `_ds/` copy was purged 2026-08-24 — never re-source Gaia from a sibling project. See `HANDOFF.md` §10 |

## Fidelity

Measured from the live staging app `approval.aws.stag.visma.net`, build
`26.61.0-260821`, on 21 Aug 2026.

The chrome uses **real Gaia classes** — `ga-page-header`, `ga-breadcrumb`,
`ga-button`, `ga-input`, `ga-native-select`, `ga-segmented-control`,
`ga-checkbox`, `ga-badge`, `ga-menu`. Nothing Gaia is hand-rolled.

The table is **not** Gaia. Staging renders it with **AG Grid**, and the
grouping, aggregation and column tool panel it relies on are AG Grid
**Enterprise** features. Rather than pull a licensed dependency into a
prototype, the grid is rendered directly here and styled to AG Grid's
measured metrics:

| | Value |
|---|---|
| Header row | 40px, `--ga-color-surface-page`, 12px / 600, letter-spacing −0.096px |
| Data row | 44px, 1px `--ga-color-border-tertiary` bottom border |
| Row text | 13px `#181d1f` |
| Group row | 44px full-width; label 13px / 700 `--ga-color-text-headings`; count badge 12px / 500 |
| Cell padding | 12px (`--ga-size-spacing-04`) |
| Overdue marker | Lucide `circle-alert` 16px, `--ga-color-red-60` |
| Approve / Reject | Lucide `check` / `x` 24px, `--ga-color-text-action` |

**Deliberate deviations from staging**

1. **Row text is 13px `#181d1f`** — AG Grid's own default, not Gaia's 14px
   `--ga-color-text-body` (`#133445`). Kept for pixel fidelity, by decision.
   These are the only two non-token values in the CSS.
2. **The Type column shows the document type name**, not the icon staging
   uses. Its width is therefore 150px rather than the measured 80px. That
   70px pushes the `Action` column past the right edge at 1316px viewport
   width, so approve/reject need a small horizontal scroll — in staging they
   were just visible. Narrowing another column would recover it.
3. **Data is synthetic.** Staging holds QA junk (`Test new claim 2`,
   `Approval_NGInbox_Norway_100193`) and real colleague names. The shape is
   preserved — same 25 field ids, same date spread, same amount
   distribution, same Overdue/Later split.
4. The overdue red is `--ga-color-red-60`. Staging reaches for that raw scale
   token rather than a semantic one — `--ga-color-text-error` resolves to the
   heading ink, not red.

## Columns

All 25 columns from the real grid, with their real field ids. Twelve are
hidden by default; the `Columns` button toggles them.

Visible: `select` · `documentType` · `from` · `description` · `companyName` ·
`documentDueDate` · `dueDate` · `activatedDate` · `invoiceDate` ·
`createdDate` · `amount` · `state` · `actions`

Hidden: `numberOfComments` · `lastChangedByUserName` · `id` · `displayId` ·
`supplierName` · `requesterName` · `companyId` · `foreignAmount` ·
`originalAssignee` · `displayApplicationTypeName` · `externalId` · `idProcess`

## What works

- **Group by** Urgency / Company / From / Document type — group rows show
  count and aggregated total; click to collapse
- **Sort** any column, ascending/descending toggle
- **Search** across type, from, description, company, supplier, requester,
  ids, source application, assignment
- **Current company** filter (current = `VNA | ERP`)
- **Select** rows or all filtered rows; footer switches from `Pending` to
  `Selected N` with the combined total; `Approve selected` enables
- **Approve / Reject** per row removes it and updates the totals
- **Column chooser** toggles all 13 optional columns

## What is stubbed

`Open...` split button · `Feedback` · company context selector · side
navigation · task detail (row click) · the assistant and help icon buttons.

Urgency buckets are **`Overdue`** and **`Later`** — the only two observed in
staging. If the real app has intermediate buckets, they weren't present in
the data at capture time.

## Not yet built

Task detail, My history, Task/Process/Document overview, Configuration.
See the `Approval` section of the `gaia-ds` skill for the domain model,
statuses, roles and open questions.
