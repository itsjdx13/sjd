# SJD Project

SJD Project combines personal finance, habits, tasks, activities, and planning in one private workspace. The interface uses a ClickUp-inspired navigation model and a TradingView-inspired portfolio terminal while remaining intentionally simple.

It also includes five optional professional interface themes and a private Dr. Majed mentor library for searchable principles, imported text notes, pinned lessons, and action conversion.

## Stack

- Next.js and React for the web/PWA frontend
- Next.js Node.js route handlers for the backend API
- PostgreSQL for optional cross-device persistence
- Browser `localStorage` as the free, zero-configuration default

## Run locally

Requires Node.js 20.19 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. The starter workspace is editable and stays on the device. Verify production output with:

```powershell
npm run typecheck
npm run build
npm run start
```

## Optional PostgreSQL

The app does not require a database for local use. For sync, create a PostgreSQL database (local PostgreSQL, Neon, or Supabase are compatible), run `database/schema.sql`, copy `.env.example` to `.env.local`, and set `DATABASE_URL`. The API endpoints are:

- `GET /api/health`: storage/database status
- `GET /api/sync`: load the saved workspace
- `PUT /api/sync`: save a workspace payload

The current sync route is deliberately single-user. Add authentication and replace the temporary user ID before exposing it publicly to multiple users.

## PWA installation

Build and serve over HTTPS in production. On Android or Windows, use the browser's **Install app** action. On iPhone/iPad, open the site in Safari, choose **Share**, then **Add to Home Screen**. The service worker caches the application shell for reliable navigation after the first successful load.

## Privacy and cost

There are no analytics, trackers, paid APIs, or required cloud services. Portfolio values are demo/manual data; market ticker values are illustrative until a free provider adapter is connected. Never put brokerage credentials or PostgreSQL secrets in browser-exposed variables.

See [`SECURITY.md`](SECURITY.md) for implemented protections and the owner’s step-by-step security checklist. PostgreSQL sync is disabled by default until an authenticated client is added.
