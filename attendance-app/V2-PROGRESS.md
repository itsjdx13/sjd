# Roco Guys v2 — implementation checkpoint

## Confirmed personal-project decisions

- Saturday and Sunday are regular days off. The calendar grid still starts Saturday.
- Leave requires only the manager's final approval.
- System Admin may approve requests and edit attendance.
- Tehran remains the workplace timezone; offline punches stay pending verification.

## Implemented in this pass

- Semantic design tokens, type scale, logical-direction improvements, contrast-oriented status colors, focus styles and reduced-motion handling.
- Reusable buttons, fields, status badges, validated Jalali/date and time helpers, local attachment selection, Radix modal with focus management.
- Interactive Persian reference route: /design-system.
- Central role/capability configuration with safe stored-role parsing; HR no longer has user-administration access. This is UI gating, not server security.
- Mobile navigation now contains Home, Clock, Requests, Calendar and Profile; attendance remains reachable from dashboard details.
- Actual Jalali calendar month lengths, cross-year navigation, current Tehran day and Saturday/Sunday weekends. Official holidays and actual schedules are not connected.
- Manager-only request approval-route preview; current date replaces the stale desktop-header date.
- Existing matching status pills now share canonical icons, labels and semantic tones.

## Verification

- Production build and protected-runtime check pass.
- 12 Playwright cases pass in Microsoft Edge: six existing responsive/offline regressions plus six shared-policy, date-validation, reference-layout, keyboard-modal, mobile-navigation and calendar cases.
- Reference layout checked at 320px and all six requested viewport sizes. Dashboard regression covers the six original requested sizes.
- Production JS is approximately 100 KB gzip; this does not include fonts/CSS.

## Unfinished acceptance gates

This is not a completed production workforce system, nor a complete Stage 1 component inventory.

- Legacy controls still need full migration; shared tables, tabs, filter chips, full Jalali picker/range, drawer/sheet and all loading/error/empty variants remain.
- The native date picker is device/Gregorian based; the adjacent text field displays and validates Jalali.
- Real authentication, server-side permissions, session expiry and protected deep-link recovery remain.
- Manager approval persistence/audit, attendance editing, configured request forms, overlap/balance validation and draft autosave remain.
- GPS permissions/geofence and signed rotating QR are still demo states; authoritative server punches/sync are absent.
- Imports do not yet parse and commit actual file contents. Exports are still sample data, not genuine filtered reports.
- Formal axe/WCAG audits, Firefox/WebKit and manual screen-reader checks, 200%/400% zoom and every-route state coverage remain.
- Leave accrual/caps, correction window and location-retention rules require decisions before production behavior is asserted.

## Phase 1 correction pass (October 2, 2026) — handoff for Codex

Source of truth for the plan: the "Roco Guys Phase 1 Correction Plan". New code lives in `src/features/` (plus `features.css`); `Prototype.tsx` is now only session, shell, dashboard, profile and routing. Protected runtime files were not touched (`npm run check:runtime` passes).

### Done
- Session: login validation, loading screen, expired-session screen (live expiry timer), deep-link return after login, role-gated routes, 404. Session key `roco-session-v1` (8 h).
- Shared UI (`ui.tsx`): Sheet (bottom sheet / side drawer; close button, Escape, backdrop, swipe on handle; focus restore), Tabs with real tabpanel wiring, Segmented, Skeleton, EmptyState.
- Clock: real geolocation (permission → accuracy → inside/outside/denied/unavailable/low-accuracy), real camera QR scan (jsQR) of rotating signed codes shown on `/workplace-qr` (HR/admin only; the employee app never shows a QR), pre-submit summary, durable receipt, duplicate window, offline queue. Workplace geofence/secret in `features/qr.ts` (override via `localStorage["roco-workplace"]`). The QR secret is client-side only because there is no backend.
- Attendance: independent weekly/monthly ranges, detail drawer, loading/empty/offline/late/overtime/missing/correction states; correction deep-links into the prefilled request form.
- Requests: type-driven fields, validation, balance impact, overlap warning with acknowledgement, attachments (names only), route preview, filters, detail + history, edit and resubmit. Manager inbox: filters/search, comments (required for reject/return), confirmation, live counts, history; own requests never reach own inbox.
- Calendar day detail shows requests; Profile tabs; Admin table (filters, pagination, bulk edit, drawer, add/edit employee, org tab); mobile admin limited to quick actions; Import (CSV upload → mapping → validation preview → commit → result, error report) and Export (range, departments, CSV/JSON, progress, persisted history).
- A11y/polish: skip link, labelled rail nav, 44px targets, focus ring, contrast of input borders, "·" separator replaced with "•" (it looked like Persian zero), Persian decimal separator.

### Verification
- `npm test` (responsive-app, design-foundation, phase1-flows): all pass, including axe (WCAG 2.2 AA, serious/critical) on 11 routes at 390 and 1366, 44px target sweep, overflow sweep at 320/390/430/683/768/1366, keyboard focus-ring sweep, camera-QR end-to-end with a stubbed camera.
- Cross-browser smoke (`npx playwright test -c playwright.cross-browser.config.ts`): Edge, Android-Chrome emulation, WebKit desktop and iPhone emulation pass. **Firefox did not launch on this machine ("spawn UNKNOWN")** — not verified.
- `tests/mobile-runtime.spec.ts` (legacy phone-frame runtime fixture) has 7 failures; it only imports protected `src/mobile`, which was not modified. Not investigated.

### Still open
- Not done: PWA manifest/service worker (installable mode), real-device iOS/Android checks, manual screen-reader pass, an automated swipe-to-close test, export "individual employees" picker and XLSX (CSV/JSON only), HR roster persistence.
- Still demo-only: no backend auth, server permissions, authoritative punches, or signed QR issuance; attachments store names only; attendance history before today is deterministic sample data.
- QA screenshots: `npm run qa:screens` → `qa/phase1/`.

## Continuation — October 2, 2026

Completed the agreed PWA / roster / swipe batch without changing protected runtime files.

- Added Persian RTL standalone manifest, 192/512 PNG icons and Apple touch metadata. Production-only registration keeps development previews free of workers.
- Build generates a content-versioned service worker that precaches the static shell (including lazy chunks), uses network-first navigation with offline shell fallback, and never intercepts POST or caches API responses. Older Roco shell caches are removed on activation; new workers do not force-reload an active session.
- HR roster edits and publication timestamp persist locally. Editing a published roster returns it to draft. Invalid stored rosters are preserved and block edits; failed writes do not falsely report publication. Publication remains local/demo-only and sends no notification to employees. Corrected the sample week's dates to 11–17 Mehr (Monday 13 through Friday 17).
- Automated pointer swipe test verifies a short drag stays open and a longer downward swipe closes with focus restored. Pointer cancellation now resets the drag rather than accidentally dismissing the sheet. This is not a real-phone touch test.
- Final verification: `npm test -- --workers=2 --reporter=line`: **48 passed**. Separate production `playwright.pwa.config.ts`: **1 passed**, including browser manifest validation, icon dimensions, active service worker, offline reload/direct navigation and lazy-reference navigation. Build/type check and protected-runtime check pass. Earlier regression attempts had an outdated copy assertion and a dev hot-reload during axe; the final stable run passes.
- A detached local built preview is running on `http://127.0.0.1:4175/`. This is a separate origin from development port 4173: browser data does not automatically transfer between them. No external deployment or actual OS-level installation was performed.
- Preview evidence: `qa/phase1/roster-persistence.png`.

Still open: Firefox launch issue, real-device Android/iOS checks and installation, manual screen-reader pass, individual-employee export selection, XLSX import/export and the seven legacy phone-runtime failures. All previously noted backend/security/demo-only limitations still apply. The initial offline shell must be loaded successfully online before offline reopening works.

## Employee exports and Firefox verification — October 5, 2026

- Completed individual-employee export selection: explicit all/selected mode, name/code/department search, Persian-digit code normalization, select search results, clear selection, eligible employee count and empty-selection protection. Search narrows the picker only, not the export scope. Department filters intersect with selected employees; inactive employees never enter exports. Hidden/out-of-department selections remain selected but are explicitly excluded from the current export.
- CSV and JSON download contents are verified against selected employee codes. Export history persists file contents and a snapshot of employee codes, departments and date range; previous history remains compatible.
- Expanded picker verified at 320/390/1366 pixels with accessibility checks. Final main suite: **52 passed**, exit 0. Production build/type checking and protected-runtime checks pass. Production offline/PWA check: **1 passed**, exit 0.
- Official Playwright Firefox 151.0 / build 1532 and required test support files downloaded into the project's ignored `.cache/playwright` directory with user approval. No everyday Firefox profile was changed. Added `npm run setup:firefox` and `npm run test:firefox` helpers to use that project-local browser cache.
- Firefox inside the command sandbox timed out during browser startup; approved execution outside it completed: **4 smoke checks passed**, exit 0. Scope: nine Persian RTL routes/no horizontal overflow, request validation/submission, offline punch recovery and expired-session screen. This is smoke coverage, not the complete 52-test suite or real-device verification. Earlier sandboxed test attempts were interrupted after they hung; final verification runs completed outside the sandbox.
- Built preview restored at `http://127.0.0.1:4175/admin/import-export`; select “کارکنان انتخاب‌شده” to use the picker. Browser storage remains separate from port 4173.

Remaining: XLSX import/export, real-device Android/iOS installation and interaction tests, manual screen-reader review, legacy phone-runtime failures, and all previously documented backend/auth/security/demo-data limitations. Firefox smoke testing and employee selection are no longer outstanding.

## Excel import/export — October 5, 2026

- Added pinned ExcelJS 4.4.0, loaded lazily for XLSX operations. The startup JavaScript remains approximately 182 KB gzip; the separate Excel chunk adds approximately 256 KB gzip and is included in the production offline cache. Existing large-chunk build warnings remain.
- Import accepts real XLSX alongside CSV, shows file-loading status, lets users select a visible nonempty sheet, remaps its columns, then uses the existing validation/preview/confirmation/commit flow. Only the selected sheet is committed. Hidden/empty sheets are excluded with explicit UI copy. Old binary XLS files require conversion to XLSX or CSV.
- Rejects corrupt/encrypted workbooks, formula cells and Excel error cells. Formulas must be converted to values before import; no formulas or external links are evaluated. Limits: 10 MB uploaded file, 20 sheets, 5000 data rows and 100 columns per visible sheet, 10000 characters per cell; ZIP metadata preflight bounds declared decompressed size to 50 MB. These are client-side guardrails, not a production-grade hostile-file scanning service.
- XLSX exports retain the date/department/individual-employee filters and existing demo-data semantics. Workbooks have Persian headers, RTL sheet view, frozen header, column filters and numeric hours/late/overtime. XLSX history stores base64 bytes and re-downloads the identical workbook after reload; old CSV/JSON history is compatible. History persistence remains subject to browser storage quota and the existing best-effort store behavior.
- Four new Excel checks cover mult-sheet selection/invalid-row review/confirmed commit, filtered workbook content and numeric cells, identical repeat download, corrupt/formula/row-limit rejection, mobile overflow and accessibility. `npm test` now includes them: **56 passed** before visual polish. Firefox smoke suite: **4 passed**. Production PWA check extended to actual offline XLSX import and download: **1 passed**, including the final rebuilt bundle. Build/type checks and all 28 protected-runtime hashes pass.
- Screenshot inspection caught inherited layout rules collapsing column selectors on mobile; corrected their grid specificity and added a minimum selector-width regression assertion. Evidence: `qa/phase1/xlsx-import-mobile.png` and `qa/phase1/xlsx-export-desktop.png`.
- Post-polish checks: **36 flow/Excel/accessibility tests passed** after the selector correction; final button-layout correction then passed all **4 Excel tests** again, with selector/button width assertions and refreshed screenshot inspection. Final production offline Excel check: **1 passed**. The full 56-test run preceded these CSS-only fixes. Mobile mapping actions now use readable wrapping buttons rather than inheriting the old three-column mapping grid.

Remaining: real-device Android/iOS installation and interaction checks, manual screen-reader review, seven legacy phone-runtime failures, and all backend/auth/security/demo-data limitations noted above. XLSX support is no longer outstanding; no Microsoft Excel desktop application was opened for these checks (workbooks were downloaded and parsed by ExcelJS).

## Accessible validation and keyboard boundaries — October 5, 2026

- Login now associates validation errors with the affected input using `aria-invalid`/`aria-describedby`, focuses that input after failed submission, clears stale errors on edit and guards repeated submission while busy.
- Shared date/time fields accept business-validation messages. Request date order, blank/invalid times, event selection, reason, leave balance and overlap acknowledgement have linked error descriptions. Failed request submission focuses the first invalid control after rendering errors. The reason label stays stable rather than incorporating its error message into the control's name.
- Preserved caller-provided descriptions/invalid state in the shared Field component. Corrected the request date picker's minimum for overtime to match the existing seven-day correction rule; other request rules are unchanged.
- Extended keyboard testing initially exposed native-dialog focus escaping after a full traversal. Shared sheets/drawers now explicitly wrap Tab/Shift+Tab between their enabled visible controls, preserving Escape and trigger return. No protected runtime edits.
- Added five workflow tests: login correction focus/error semantics; blank time/reason errors; reversed-date errors; RTL profile tab arrows/Home/End; full forward/reverse request-dialog traversal and Escape focus return. Main suite now includes these: **61 passed**, exit 0. Dedicated Firefox accessibility suite: **5 passed**; existing Firefox smoke: **4 passed**. Production offline/PWA + real XLSX import/download: **1 passed**. Final build/type check and 28-file protected runtime integrity check pass. Existing large-chunk build warnings remain.
- Firefox accessibility checks can be repeated with `npm run test:a11y:firefox` using the already-downloaded project-local browser. These checks inspect keyboard behavior and accessibility attributes, not actual screen-reader speech.
- Inspected `qa/phase1/request-accessible-errors.png`; errors remain adjacent to controls and the correction focus ring is visible. Wrote `qa/phase1/MANUAL-ACCESSIBILITY-CHECKLIST.md` for the outstanding human screen-reader/device checks. No OS screen reader was started and no real phone was tested.

Remaining: actual Persian screen-reader listening pass, real Android/iOS permissions/installation/touch checks, seven legacy phone-runtime failures, and all previously documented backend/auth/security/demo-data limitations. Local preview remains `http://127.0.0.1:4175/`; do not claim full production acceptance or public deployment.

## Import/export persistence safety — October 5, 2026

- Added opt-in strict persisted-store operations. Import/export reads validate the saved shape rather than silently treating broken data as an empty/seed store. Strict writes update the in-memory view and notify subscribers only after browser storage succeeds. Existing callers of the legacy best-effort `set` remain unchanged; this is not a blanket persistence guarantee for the whole app.
- Import commit rereads the latest saved employee list, revalidates the preview, and returns to review if employee-code validity changed. Failed storage writes stay at confirmation with an accessible error, preserve the prior saved list and do not show completion. Users can retry after addressing storage availability. A changed saved employee list is merged instead of overwritten by the stale preview snapshot.
- Export generation uses the current saved employee list and refuses to substitute sample employees when the saved list is unreadable. History saving rereads the current history before appending. Storage/quota/schema failure preserves prior history, creates no phantom saved entry, and still allows the generated file to download with an explicit warning and announcement that history was not saved. No automatic deletion or destructive recovery was added.
- Employee/history shape validation now covers the fields used by rendering, including valid export timestamps and filter arrays, avoiding crashes on malformed saved history. CSV/JSON/XLSX history from previous passes remains compatible.
- Five new storage tests simulate write failures, retry with persistence after reload, corrupt employee data, employee-code changes between review/commit, export-history quota failure and invalid history schema. Mobile warning screenshot inspected: `qa/phase1/export-storage-warning-mobile.png`; no horizontal overflow. The initially targeted run passed all five tests. Final build/type check and 28 protected runtime hashes pass. Firefox smoke: **4 passed**; production offline navigation and XLSX import/download: **1 passed**.
- Final full regression run: **66 passed**, exit 0 (3.2 minutes), with a 300-second global limit. The earlier 180-second run timed out after 62 passes with four checks incomplete; it was not counted as a successful full run. No browser security settings or test assertions were weakened to obtain the final result.

Scope limitations: browser-local writes are not server transactions or a cross-tab locking mechanism. Other legacy store callers (including admin edits and request/approval saves) still have best-effort persistence. All earlier backend/security/sample-history/device/screen-reader/legacy-test limitations remain. No public deployment or real-device test was performed.

## Claude-guided strict requests and approvals — October 5, 2026

Claude reviewed the brief, not this checkout, and did not independently verify the code. Adopted its sequence locally: strict persistence → requests/approvals → administrative edits → shared HR data → HR placeholders → remaining acceptance checks. Nothing was pushed to the unrelated SJD repository.

- Added `src/features/persistence.ts` with typed read/corruption/write/read-back/conflict failures and a confirmed write helper. The opt-in store path checks read-back before updating cache or notifying listeners. Existing import/export strict saves now use this helper too. Generic reads may display the last valid in-memory copy when storage is unreadable; corrupted bytes are preserved, and request/approval screens show a notice. This is not a persistent backup or automatic recovery feature.
- Request submission and returned-request resubmission reread current saved records and save strictly. The form closes and announces submission only on confirmation. Failure leaves dates/times/reason/attachments in the open form and shows an explicit retry button. Unsaved drafts are still in memory only; closing/reloading may lose them, and the error copy explains that.
- Rechecks balance/overlap against current saved records before submission. A changed returned request cannot be silently overwritten. Each open form has a submission key: retrying after a successful write with failed read-back does not duplicate that request or its history. If the draft was edited after an uncertain saved attempt, the UI warns rather than silently replacing the saved version.
- Manager decisions update status and history in one strict write, keeping comment/decision/confirmation on failure. Confirmation pins the reviewed request. Latest status/content is reread: an already-decided or changed request is rejected as a conflict and the latest view is refreshed. Own requests remain excluded and rejection/return requires a comment. These remain browser-local demo guards, not server permissions or a simultaneous cross-tab transaction lock.
- Tightened saved request shape checks to cover rendering fields, supported statuses/types, attachments and history. No automatic deletion/reset or destructive restoration was added.
- Seven new tests cover write failure/retry/reload, uncertain read-back with duplicate prevention, corrupt request data, manager comment/status/history preservation, stale manager confirmation, silent ignored writes and returned-request resubmission. Initial targeted verification: **12 passed** including existing storage tests. One initial test attempted an accessibility label lookup on the inert background under the confirmation modal; corrected it to verify both the retained DOM value and visible confirmation comment.
- Final full main suite: **73 passed**, exit 0 (1.9 minutes). Dedicated Firefox request-persistence checks: **7 passed**, exit 0 (`npm run test:requests:firefox`). Production offline/PWA and XLSX import/download: **1 passed**, exit 0. Build/type check and all 28 protected runtime hashes pass. Existing large-chunk warnings remain.
- Inspected mobile retry screenshot `qa/phase1/request-save-retry-mobile.png`: preserved fields and readable retry action, no horizontal overflow. Preview remains `http://127.0.0.1:4175/requests`.

Next: strict saving for administrative employee add/edit/bulk changes with failure/conflict/retry tests. Then unify HR employee data before implementing its placeholder actions. Admin legacy saves and some other demo state still use best-effort persistence. Human screen-reader/phone checks, legacy phone-runtime failures and all backend/security/sample-history limitations remain. No public deployment, paid service, repository upload or real-device verification was performed.

## Strict administrative employee saves — October 5, 2026 (Claude, Linux cloud session)

- Added `addEmployee`, `updateEmployee` and `patchEmployees` in `src/features/store.ts`. Each rereads the saved list, rejects stale or duplicate-code changes with a `conflict` failure, and saves through the confirmed read-back path. Employee shape validation now also checks `email`.
- `AdminPage`: add/edit forms keep the typed values on failure, show an alert and offer "تلاش دوباره برای ذخیره"; success is announced only after a confirmed save. After a conflict the draft is rebased: only fields the user changed are kept, everything else follows the latest saved record, and the user must save again deliberately. Bulk department/shift changes show their error inside the bulk bar, keep the selection and refuse rows edited elsewhere. A corrupt saved list shows a page-level notice and is never overwritten.
- Five new tests in `tests/admin-persistence.spec.ts` (added to `npm test`): edit quota failure + retry + reload; stale edit from another tab; add with quota failure and a code taken elsewhere; bulk failure + retry; bulk stale rows and corrupt data.

Verified in this session (Linux, project-local setup, Chromium instead of Microsoft Edge): the five new tests pass; the full main suite gave 76 of 78 passed. The two failures (`phase1-flows` export download and `xlsx` export download) report the download filename as "download" instead of the expected name. They fail identically on the code before this change, so they come from running Chromium on Linux rather than Edge on Windows. Not investigated further, not weakened. Build, type check and the 28-file protected-runtime check pass. Firefox, PWA/offline and real-device checks were not run here. No screenshots were refreshed.

Remaining: unify HR with the shared employee records, then the HR placeholder operations; admin edits no longer use best-effort saving, but other legacy `set` callers remain.

### Review fix: conflict recovery keeps every editable field — October 5, 2026
Reviewer found that rebasing a draft after a conflict looped over the latest saved record's fields, so a typed email was lost when the saved record had no email. The merge now iterates an explicit list of editable fields (`code, name, department, status, email, shift`). New test "conflict recovery keeps a typed email when the saved record has none" fails on the previous code and passes now. Re-run here (Linux, Chromium): admin-persistence 6/6; full suite as in the entry above, with the same two download-filename failures still unresolved (cause not confirmed; Windows/Edge run pending). Runtime check passes.

## Reconciled Claude/Codex Windows verification — October 5, 2026

- Collaboration branch: `codex/attendance-admin-windows`, based on Claude's strict-admin commit `258a07e`, with Claude's email fix `f2bfea9` merged. Kept Claude's production implementation. Added Codex tests for newly entered email surviving a conflict/reload and untouched email removed by another tab remaining absent after retry/reload. Claude's typed-email test remains too. Added `playwright.admin-persistence.config.ts` for the dedicated Firefox suite.
- Confirmed the dropped-email bug with a failing Windows Edge test before correction. Initial Codex implementation passed 80 main tests and 7 Firefox admin tests. One intermediate added test used an overly exact select-label lookup; corrected the test locator, not the application or assertions.
- Final reconciled checkout: **81/81 main tests pass in installed Windows Edge**, exit 0 (2.2 minutes), including both export filename checks without relaxing assertions. **8/8 admin persistence tests pass in Firefox**, exit 0 (37.1 seconds). **1/1 production PWA/offline test passes**, exit 0 (11.2 seconds), including offline routes, lazy reference screen and XLSX import/export. Build/type check and all 28 protected-file hashes pass. Large-chunk warnings remain.
- Windows tests used isolated Vite test ports 4186/4187 and the existing official Firefox download; no new browser download or browser security bypass. Regenerated tracked QA images were restored rather than published as refreshed evidence. Preview for the reconciled build: `http://127.0.0.1:4190/admin` (Windows local only).
- The Linux Chromium download-filename failures are **not explained yet**. Passing Edge checks establish that the tested Windows behavior is correct; they do not prove a headless Chromium cause. No filename assertions or export code were changed. Firefox verification here covers admin persistence, not those export filename assertions.
- SJD application, repository `main`, shared `attendance-app` branch and Claude's branch remain untouched by Codex's push. Only the separate collaboration branch is published. This is a source-code share, not website deployment.

Next for Claude: base shared-HR work on `codex/attendance-admin-windows`. Read `HrPage.tsx`, `store.ts` and `roster.ts`; replace hardcoded HR employee records with the shared employee store before completing placeholder operations. Keep honest sample-statistics labels and strict persistence boundaries. Codex handles Windows verification/integration while Claude handles the HR data changes; do not push concurrent changes to the same branch. Existing no-backend, browser-local race/backup, attachment-name-only, sample attendance, real-device, human screen-reader and legacy-runtime-test limitations remain.

## Shared HR employee records — October 5, 2026 (Claude, Linux cloud session)

Scope: only shared employee/profile data and labeled sample totals. Balance corrections, leave-policy settings, announcement preview and offboarding are **not** done and are separate batches; their buttons are still the old placeholders.

- Removed the hardcoded HR employee list. HR file directory, leave balances and roster rows now read the shared `employeeStore` (name, department, status). An admin edit, import or new employee shows in HR after reload; inactive/leave statuses follow the shared status.
- New `src/features/hr.ts`: HR-owned profile details (role, contract, skill, documents, sample leave balance) in `roco-hr-v1`, keyed by employee code and validated on read. Values carried over from the old screen are sample data. Employees without a recorded profile show "ثبت نشده" instead of invented values. Stored balance stays numeric (12.5); display uses the shared `fa` helper (۱۲٫۵). `saveProfile` is a strict, stale-checked write but is not wired to any UI yet.
- Roster rows are now bound to employee codes (`codes` field, optional so existing saved rosters load unchanged; defaults to the four sample codes). Names follow the shared list; a removed employee shows `RG-… (حذف‌شده)` rather than a stale name. Roster cells are still saved with the existing best-effort path.
- Sample labeling: overview banner states that only "active employees" is computed from the shared list; attendance snapshot, expiring documents, alerts, onboarding/offboarding people and the leave policy/ledger are sample. Removed the invented "94% saw the announcement / 128 recipients" sentence.
- Corrupt `roco-hr-v1` or employee data shows a notice and is never replaced.
- New `tests/hr-shared-data.spec.ts` (5 tests, in `npm test`): renamed/new employees in directory and balances with ۱۲٫۵ and numeric storage; status and real active count; roster rename/removal; corrupt HR data; real admin edit → HR after reload.

Verified here (Linux, Chromium, not Edge): main suite **84 passed, 2 failed**; the two failures are the same unexplained export filename assertions (`phase1-flows` export, `xlsx` export), which passed in Windows Edge. Legacy `tests/mobile-runtime.spec.ts` run separately: **1 passed, 7 failed** (the known legacy failures, uninvestigated, not weakened). Type check and 28-file protected-runtime check pass. Not run here: Windows Edge, Firefox, PWA/offline, production build, real devices. No QA screenshots refreshed.

Next: Windows verification by Codex; then HR placeholder operations one batch at a time (profile editing UI, balance corrections, policy, announcement preview, offboarding).

## Shared HR review and Windows gate — October 5, 2026 (Codex)

- Reviewed Claude commit `5450525` on separate branch `codex/attendance-hr-windows`. Unmodified Claude version: **86/86 main Edge tests passed** and **5/5 shared-HR Firefox tests passed**. Build/type check and all 28 protected-file hashes passed. The two Linux export-filename failures were not reproduced in Edge; their cause remains unconfirmed and assertions stay unchanged.
- Found that the new optional roster `codes` field was consumed without validation. A focused regression reproduced a render crash for malformed saved codes. Added validation for a four-row, unique, nonempty-string code list; legacy rosters without `codes` still load. Invalid data stays untouched, the notice appears, and editing/publication is blocked instead of crashing. Tests cover string, wrong-length, duplicate and null-element lists.
- Removed a conditional hook call (`employeeStore.useProblem() || hrStore.useProblem()`) by calling both hooks unconditionally before combining their messages. The cross-tab employee corruption regression passed even before this preventive correction; do not claim that test reproduced a hook crash.
- Strengthened the balance check: it now strictly persists the HR record in the test and asserts the actual stored balance is numeric 12.5, alongside Persian display `۱۲٫۵`. Added a cross-tab corrupt-employee notice/no-crash/preserved-data test. Dedicated Firefox config: `playwright.hr-shared-data.config.ts`.
- Extended the production offline check to open `/hr` and verify the shared directory before the existing lazy-reference/XLSX checks.
- Final guarded version: **88/88 main Edge tests passed**, exit 0 (2.1 minutes); **7/7 shared-HR Firefox tests passed**, exit 0 (30.4 seconds); **1/1 production PWA/offline check passed**, exit 0 (8.4 seconds). Build/type check and protected-file check pass; large-chunk warnings remain. No browser security bypass, export assertion changes or runtime-lock changes. Generated tracked QA images were restored, not refreshed as evidence. Local production preview remains `http://127.0.0.1:4190/hr`.
- Did not rerun the legacy phone-runtime suite: Claude reports 1 pass/7 failures separately; those remain uninvestigated and are not silently counted as a successful acceptance gate. No real-device camera/GPS/install or human Persian screen-reader pass. All backend/local-storage/sample-history limitations remain.

Next Claude batch: start from `codex/attendance-hr-windows` and implement the employee-profile editing form only. Wire `saveProfile` for role, contract, skill and document notes; shared name/department/status/shift remain owned by the shared employee record. Do not expose `balanceBase` as a profile edit or add balance corrections, policy, announcements or offboarding in this batch. Preserve drafts on save failure, deliberate conflict review/retry, confirmed success and reload persistence; test quota/read-back/corrupt/missing-employee/stale-profile cases and accessible dialog close/focus behavior. Keep profile/sample labels honest. Use your separate Claude branch; Codex will handle the Windows integration gate after the push. Main/SJD and the previous shared branches are not modified by this verification branch.
