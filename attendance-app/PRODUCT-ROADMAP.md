# Attendance App: route to a real product

## Where we are — October 6, 2026

We are finishing the **Phase 1 frontend prototype**, with selected early **Phase 2 HR prototypes**. We have not completed the original Phase 1 vertical slice, which explicitly requires both frontend and backend. Existing browser-local accounts and permissions are demonstrations, not security boundaries.

Implemented locally: responsive Persian RTL application, role-aware routes, clocking and receipts, attendance views, requests and approvals, administration, import/export, installable/offline PWA shell, shared employee records, HR profile editing and shared daily paid-leave corrections/history. Announcement work is a local draft/preview only, never delivery.

The original three product phases remain:

1. Foundation, attendance and employee self-service, backed by a server.
2. Advanced HR lifecycle, leave policies, scheduling and administration.
3. Payroll and verified statutory outputs.

Payroll is **not** required to release the first real attendance product. Conversely, adding HR screens does not mean the production Phase 1 gate has passed.

## Six major milestones to a first private attendance release

These are planning groups, not six small tasks or a fixed date estimate. Backend and security work are still substantial.

1. **Close prototype gaps and agree the release scope.** Finish or explicitly defer local HR placeholders (policy settings, announcement preview, employee-specific offboarding). Review incomplete administration, legacy phone-runtime failures, sample labels and remaining UX/acceptance gaps. Separate necessary attendance functions from optional advanced HR work.
2. **Build the persistent server foundation.** Agree how the existing frontend connects to the planned API; create the database, migrations, shared validation and server-side employee/location/shift/calendar/attendance/request records. Browser storage must not be the sole copy. No frontend replacement just to match the original stack without an explicit architecture decision.
3. **Connect real accounts and permissions.** Secure sessions, password lifecycle, employee identity/manager relationships, field and route authorization, administrative protections and audit records. Permissions must be enforced on the server, not merely hidden in navigation.
4. **Make workforce operations trustworthy across devices.** Server-validated clocking/location checks, short-lived signed workplace QR with replay/duplicate protection, immutable punch history and reviewed corrections, overnight/timezone calculations, transactional approvals and leave accounting, safe imports, real private attachment storage and reconciliation. No fabricated success or delivery labels.
5. **Pass a release acceptance gate.** API/security/concurrency tests, supported browser checks, actual Android/iPhone camera/GPS/install/offline behavior, Persian screen-reader and keyboard testing, realistic employee scenarios and recoverable error states. Existing automated browser checks are useful evidence, not a replacement for this gate.
6. **Run a restricted pilot with operational safeguards.** With Sajad's approval: choose private hosting, HTTPS, secrets management, backups and a demonstrated restore, health monitoring and support procedures. Start with a small employee group, resolve issues, then roll out to the organization. Do not deploy publicly or introduce paid services without approval.

## What can be used now

The local app can be explored and tested now. It is **not ready to be the official attendance or payroll record**. There is no server-backed authentication, cross-device synchronization, persistent backup or real notification delivery. Sample attendance and HR information remains clearly marked. Attachments currently keep file names only. Annual leave accrual and hourly-to-day conversion are not implemented.

Use `V2-PROGRESS.md` for exact branch/commit and verification evidence. This roadmap does not authorize deployment, paid services, legal/payroll policy decisions or silent changes to the agreed organization rules.
