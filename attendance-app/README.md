# Attendance App

Independent Persian RTL workforce application, shared for Claude collaboration. This folder is separate from the existing SJD application. Its existing in-app branding has been preserved; the shared folder and branch are named `attendance-app`.

## Start here

Read this folder's `AGENTS.md` and the latest entries in `V2-PROGRESS.md` before editing. The parent repository's Next.js commands are for SJD, not this Vite project. Work from `attendance-app/`.

```sh
npm ci
npm run dev
```

For a production build: `npm run build`. Do not deploy publicly or introduce paid services without Sajad's approval.

## Verification

```sh
npm run check:runtime
npm test
npm run setup:firefox
npm run test:requests:firefox
npm run test:pwa
```

The main browser suite uses installed Microsoft Edge. Firefox setup downloads the official Playwright test browser into the ignored `.cache/` folder. Other browser suites may require their Playwright browsers to be installed. Review the Playwright configs for ports and platform requirements. Windows checks are not automatically reproduced on Linux.

Latest reported local results before this source upload: 73 main tests passed, 7 Firefox request-persistence tests passed, 1 production PWA/offline test passed; build/type-check and all 28 protected-file checks passed. These are historical Windows results, not independently verified by Claude or CI. The protected-file check was rerun before sharing.

## Next work for Claude

1. Apply strict persistence to administrative employee add/edit/bulk changes, with failure, retry, reload and stale-edit tests.
2. Make HR, administration, requests and roster share employee records before completing HR placeholder operations.
3. Implement honest local HR operations: balance corrections with reason/history, local policy settings, announcement preview clearly marked not sent, and per-employee offboarding checklists.
4. Investigate the seven legacy phone-runtime failures separately; do not weaken the protected-file checks.
5. Leave real-device camera/GPS/install/swipe and Persian screen-reader acceptance marked unverified until performed.

## Demo limitations

No backend: authentication, permissions and workplace QR signing are demo-only. Browser-local saving is not server storage, persistent backup or an atomic cross-tab transaction. Request/approval, import/export, administrative employee add/edit/bulk, HR profile edits and leave-balance corrections use strict confirmed saving. Shared daily paid-leave balances include pending reservations, newly approved deductions and correction history; earlier approvals are included in the migrated starting snapshot. Unknown balances remain unknown until HR records one. Annual accrual and hourly-to-day conversion are not implemented. Attachment storage keeps names only. Attendance before today includes sample data. No employee notifications are sent. Read the latest handoff notes for detailed limitations.

Source, required assets, tests and QA evidence are included. Dependencies, browser downloads, generated builds and test-output folders are excluded. Nothing in the original SJD app is changed by this branch.
