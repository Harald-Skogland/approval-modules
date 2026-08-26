# approval-modules — handoff

Read this first after a restart. `README.md` documents *what the prototype is*; this file documents
*where the work stands, what was decided, and what to do next*.

Last session: **2026-08-21** → doc updated **2026-08-24**.

---

## 1. Status

**`My tasks` is built and verified working in the browser.** Nothing is half-finished.

| Verified | Result |
|---|---|
| Group by Urgency | `Overdue 198 / 436 684.65 NOK`, `Later 4` |
| Group by Company | `DC testing 32 / 82 737.95 NOK` |
| Group by From, Document type | render correctly |
| Collapse group | chevron rotates, rows hide, count + total persist |
| Sort | any column, asc/desc toggle, arrow on sorted column |
| Search `PO#2556` | 7 rows, `Pending` recomputed to 27 111.44 NOK |
| Select row / select all | indeterminate dash; footer flips `Pending` → `Selected 2  2 398.87 NOK`; enables `Approve selected` + `Open...` |
| Approve / Reject | 202 → 201 → 200 rows; group count 198 → 196; totals recomputed; toast confirms |
| Column chooser | all 13 optional columns toggle |
| Console | no errors on load or during interaction |

## 2. Run it

```sh
cd ~/claude-projects/approval-modules
npm install                       # restores Gaia — see §10
python3 serve.py                  # → http://localhost:8747
```

`serve.py` is `SimpleHTTPRequestHandler` plus `Cache-Control: no-store`. Use it rather than
`python3 -m http.server 8747`: that sends weak validators, and Chrome then serves cached css/js after
an edit. During development this repeatedly *looked* like a broken change — the page had one
`.td-stack` rule while disk had another, and once a stale `module-shell.js` with no menu positioner.
`http.server` still works if you prefer it; you just need ⌘⇧R after every edit.

Opening `index.html` directly works too; serving it just lets the Inter web fonts load.
The previous session left a server on **port 8747** — after a machine shutdown it is gone; if a
stale one lingers, `pkill -f "http.server 8747"`.

## 3. Decisions already made — do not re-litigate

These were settled with the user. Re-opening them wastes a session.

| # | Decision | Why |
|---|---|---|
| 1 | **Pixel-faithful *and* interactive** | Chosen over static-visual or behaviour-first |
| 2 | **Split files, vanilla JS, no build step** | Folder name is plural, so more Approval views are expected. (This decision was originally justified partly by a shared `_ds` — that copy has since been purged, see Gaia below.) |
| 3 | **Synthetic Norwegian data, real shape** | Staging holds QA junk (`Test new claim 2`, `Approval_NGInbox_Norway_100193`) and real colleague names |
| 4 | **Hand-rolled grid, not AG Grid** | Staging uses AG Grid, but its grouping / aggregation / column tool panel are **Enterprise**. Community cannot row-group. 202 rows in plain DOM need no virtualisation |
| 5 | **Real Gaia classes for all chrome** | Nothing Gaia is hand-built. **The CSS source is currently unresolved** — see *Gaia CSS: purged* below |
| 6 | **Type column shows the type *name*, not the icon** | User's call. Width therefore 150px, not the measured 80px |
| 7 | **Keep AG Grid's 13px `#181d1f` row text** | User's call — fidelity over Gaia-correctness. The only two non-token values in the CSS, both commented |
| 8 | **Drop the `New My tasks` toggle** | The new view is the only one in scope |
| 9 | Stubbed: `Open...`, `Feedback`, company selector, side nav, task detail, assistant/help icons | Each is really a different screen |

## 4. Where the numbers came from

Measured from the live staging app, **not** eyeballed from a screenshot:

- URL `https://approval.aws.stag.visma.net/`, build `26.61.0-260821`, captured 2026-08-21
- **Requires the user's logged-in Chrome.** `WebFetch` returns only the SPA shell
  (`<title>Approval | Visma.net</title>`) — it is a JS app behind Visma auth
- Method: `claude-in-chrome` skill → navigate → `javascript_tool` reading `getComputedStyle` on the
  header row, data row, group row, cells, toolbar and footer, plus `col-id` attributes for the
  column list and a scroll-loop to collect every group label and `__state` value

The full measured spec now lives in the **`gaia-ds` skill**, under `Approval → The Live Product`.
That is the durable copy — it survives this folder. Don't re-extract; read it there first.

## 5. Files

Shared by BOTH views — if a `js/x.js` is used by both pages, its `css/x.css` must be too. Getting
this wrong has bitten three times (see §12).

| Path | Notes |
|---|---|
| `css/app-shell.css` | Split layout, splitter, stacks, `--td-*` tokens, page-header no-bg-fill |
| `css/task-header.css` | The task-header component |
| `css/modules/module-shell.css` | Module chrome |
| `js/splitter.js` | Initialises every `.td-split`; no element ids |
| `js/task-context.js` | Resolves `?task=`, the traversal order, and `setTask()` for the pane |
| `js/task-header.js` | `ApprTaskHeader.render(container, opts)` — page row or in-pane |
| `js/modules/module-shell.js` | `ApprModule` base class; exports `ApprIcon`, `ApprPlaceMenu` |
| `js/data.js` | `buildTasks()` — seeded `mulberry32(20260821)`, `TODAY` pinned to 21 Aug 2026 |

My tasks

| Path | Notes |
|---|---|
| `index.html` | Shell, toolbar (incl. the Preview switch), grid + reading pane in one `.td-split` |
| `css/my-tasks.css` | Grid, toolbar, footer, reading pane |
| `js/my-tasks.js` | Grid behaviour, row click → open or preview, `visibleOrder()` handover |

Task detail

| Path | Notes |
|---|---|
| `task-detail.html` | Shell, two module stacks either side of the splitter |
| `css/task-detail.css` | Context-selector trigger, stack edge insets |
| `js/task-detail.js` | Host glue only — module events |

Modules — `js/modules/*.js` + `css/modules/*.css`, six of them: `attachment-viewer`,
`voucher-details`, `workflow-details`, `workflow-history`, `comments`, `external-editor`.

Assets — `assets/documents/*.pdf`, one per document type, each with the `.source.html` it was
rendered from (headless Chrome). Regenerate rather than hand-edit the binary.

## 6. Traps already hit — don't rediscover them

1. **`rank[k] || 9`** put `Later` above `Overdue`, because `Overdue`'s rank is `0` and `0` is falsy.
   Use `k in rank ? rank[k] : 9`.
2. **`.ga-menu` overrides `[hidden]`.** Gaia sets `display`, which beats the UA rule, so the column
   menu rendered open on load. Needs an explicit `[hidden] { display: none; }`.
3. **Gaia checkbox clicks miss `closest()`.** The native input is a *sibling* of the marker span, not
   an ancestor. Put the data attribute on the cell and set `pointer-events: none` on `.ga-checkbox`.
4. **Amount distribution.** A flat random draw averaged 31k against staging's ~2k. A squared draw
   (`pow(rnd(), 4)`) reproduces the real skew — now mean 2 177 vs staging 2 068.
5. **Token names.** `--ga-text-md-size` and `--ga-border-width-md` **do not exist**. The real names
   are `--ga-text-md-font-size` and `--ga-size-border-width-md`. An undefined custom property fails
   silently, so this is invisible at runtime. The `gaia-ds` skill was corrected on 2026-08-24.
6. **`--ga-color-text-error` is not red.** It resolves to the heading ink. Staging's overdue marker
   uses the raw scale token `--ga-color-red-60` (`#cc453e`).

## 7. Known rough edges

- Widening Type to 150px pushes `Action` past the right edge at 1316px viewport, so approve/reject
  need a nudge of horizontal scroll. In staging both icons were just visible. Narrowing another
  column recovers it.
- The `Comments` header truncates to `Co...` at its measured 60px width. Faithful, but ugly.
- No empty state beyond a single line of text; no error or permission-denied states.
- Row click only raises a stub toast.

## 8. Next steps, in the order they make sense

1. **Task detail** — the highest-value next view. Tabbed: task details (comment field), attachments,
   document lines, `Editor` tab, `Accounting lines` for Document Center invoices. Since June 2026 the
   editor detaches into a separate browser window. **Design is unspecified — interview first.**
2. **Keyboard-first triage** — the real product has a full shortcut set (`A` approve, `Shift+A`
   approve directly, `R` reject, `F` forward, `V` review, `M` email, `X`/`N` next, `Z`/`P` previous,
   `1`–`6` jump to document). The shortcut table is in the `gaia-ds` skill. This is cheap to add to
   `My tasks` and very close to how approvers actually work.
3. **The action dialogs** — Forward, Request review, Postpone, Email. All four take a mandatory
   comment; Reject does too. Currently `Open...` is one stub covering all of them.
4. **Other views** — `My history`, then the admin overviews (`Task` / `Process` / `Document`).
   Document overview needs blocked-state remediation, which is where the interesting UX is.

Before designing any of these, read **`Approval → Open Questions`** in the `gaia-ds` skill. Seven
things are genuinely unspecified in the public docs (graphical workflow view, line-approval UI,
workflow editor, mobile action set, document-type mapping, empty/error states). Ask; don't invent.

## 9. Ground rules for this project

- **Interview, don't assume.** Project-wide rule. Ask for any unspecified detail before writing code.
- **No hand-rolled Gaia.** If Gaia has the component, use its real class. If it doesn't (tables),
  say so explicitly and match measured metrics.
- **Never copy assets in from a sibling project folder.** Not `_ds/`, not CSS, fonts, tokens or
  bundles, from any other `claude-projects/*` or `Claude-temp/*` directory. Ask where a dependency
  should come from; vendoring one is the user's decision. (Cost us a purge on 2026-08-24.)
- **No backticks inside template-literal styles** — even in `/* comments */` they close the string
  and break the component. Run `node --check` after editing any JS.
- **Verify in the browser before claiming done.** Every claim in section 1 was checked by driving the
  page, not by reading the source.

---

## 10. Gaia CSS — source of truth: npm

The vendored `_ds/gaia-design-system-d69b3cc0-…/` copy was **purged 2026-08-24**. It had been taken
from the sibling `visma-login/_ds`, which was never sanctioned. **Never bring assets in from a
sibling project folder.**

Gaia now comes from its real source:

    @vsn-ux/gaia-styles  0.6.11   (npm, MIT, public)

- Pinned **exact** in `package.json`; installed under `node_modules/`. npm owns it, nothing is
  vendored into the repo.
- Both pages link two files, in this order:
  `node_modules/@vsn-ux/gaia-styles/src/font/inter.css` (Inter woff2 — the dist build has **no**
  `@font-face`, fonts live under `src/font/`) then
  `node_modules/@vsn-ux/gaia-styles/dist/all.css` (tokens + base + all 33 components).
- Still no build step. `dist/all.css` is a prebuilt Tailwind v4 output; we only link it.
- `npm install` restores it from scratch.

### The purged copy was NOT faithful — differences that bit us

Anything written against the old copy must be re-checked against these:

| Old vendored copy | Real package 0.6.11 |
|---|---|
| `--ga-radius-default` | **`--ga-radius`** (4px). `-default` never existed |
| `--ga-focus-outline`, `--ga-focus-outline-offset` | **absent** — compose from `--ga-size-border-width-md` + `--ga-color-border-focus` |
| `--ga-sf` scaling factor, `calc(0.5rem * var(--ga-sf))` | **absent** — plain `rem`. (Real name is `--ga-base-scaling-factor`) |
| `--ga-text-md-line-height: 24px` | **20px** (`1.25rem`). Figma's kit says 24 — the kit and the package disagree; the package wins in code |
| standalone `.ga-icon` sizing helper (16px box, `svg{width:100%}`) | **absent** — `.ga-icon` only sets `color`, and only nested inside Gaia components. Size inline SVGs yourself |
| shipped `context-selector.css`, `accordion`, `drawer`, `feedback`, `pagination` | **not in the package** (33 components, not 39) — the copy carried components Gaia does not ship |

Class names *do* match: `.ga-page-header__global-navigation` / `__menu-breadcrumbs` /
`__header-actions`, and `.ga-breadcrumb-item__trigger` / `__label` / `__separator` /
`--current-page` all exist in 0.6.11 as used.

`--ga-color-border-secondary` resolves to `secondary-30` → **`orange-30` (#f5c3a1)**, Gaia's brand
peach — *not* a neutral. The neutral keyline is **`--ga-color-border-tertiary`** (#cccfd7).

Also present and worth knowing about: `dist/integrations/ag-grid` — an official AG Grid theme
integration, relevant to `My tasks`, not yet used.

---

## 11. Repository and deployment

- **GitHub:** `https://github.com/Harald-Skogland/approval-modules` (public, `main`).
- **Live:** `https://harald-skogland.github.io/approval-modules/` — `index.html` (My tasks) is the
  landing page; `task-detail.html` is the Task detail view.

Pages deploys through `.github/workflows/pages.yml`, **not** a branch deploy. The reason matters: the
pages link Gaia from `node_modules/@vsn-ux/gaia-styles`, which is gitignored because Gaia comes from
npm (§10). A branch deploy would publish every page with no design system at all. The workflow runs
`npm ci` — honouring `package-lock.json`, so Pages gets exactly 0.6.11 — and copies the package into
the artifact at the same path the markup already uses, so local and deployed load Gaia identically
and nothing is vendored into git. The assemble step asserts `all.css` and `inter.css` exist, so a
broken install fails the build instead of shipping an unstyled site.

Every asset path in both pages is relative, which is what lets the site work under the
`/approval-modules/` sub-path. **Do not introduce root-absolute paths** (`/css/...`) — they resolve
against `harald-skogland.github.io` and 404.

Known gap: nothing on My tasks links to Task detail (row click is still a stub toast), so a visitor
landing on the deployed site has to type the `task-detail.html` URL.

---

## 12. The pattern that keeps biting

Component code shared between views while its CSS or tokens stay in a page-specific file. It fails
SILENTLY every time, because an undefined custom property is invalid at computed-value time and the
whole declaration is simply dropped — no error anywhere.

1. `--td-*` layout tokens lived in `task-detail.css`; My tasks' reading pane got
   `grid-template-columns: var(--td-left) var(--td-splitter-hit) 1fr` with an empty middle var, so
   the grid collapsed to one column and the pane stacked underneath it.
2. The page-header no-bg-fill rule was COPIED into both page stylesheets, so the two drifted and My
   tasks kept a white header bar after Task detail lost it.
3. `task-header`'s CSS stayed in `task-detail.css` after the component was reused in the pane, so
   the pane's header ran with no component CSS at all — counter not flexed, title and subtitle both
   falling back to 16px.

Rule: **shared JS means shared CSS.** `css/app-shell.css`, `css/task-header.css` and
`css/modules/module-shell.css` exist for exactly this reason.

### Gaia components hand the glyph to the markup

Three of them so far ship a positioned, coloured, state-toggled *container* and no icon:
`.ga-checkbox__marker__indicator-checked` / `-indeterminate`, `.ga-switch__check-icon`, and
`.ga-icon` anywhere (which carries colour but **no dimensions** in this package). Expect it as the
norm. The purged `_ds` port drew these itself, which is why the markup looked fine before the npm
swap.

### getComputedStyle is unreliable here

Under browser automation it has twice misreported Gaia's nested state rules — the checkbox fill and
the switch's checked state both read as unapplied while rendering correctly. An inline `#1f4e66`
once read back as `rgba(0,0,0,0)`. **Verify Gaia state styling from a screenshot**, not a computed
value. Geometry (`getBoundingClientRect`) has been trustworthy.
