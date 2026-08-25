# Repository Guidelines

## Canonical Project

`sjd-project/` is the single active application. It combines portfolio management, habits, tasks, activities, and planning in a Next.js PWA. The older `life OS/`, `personal dashboard/`, and `life-os-app/` folders are reference implementations only; do not add features there unless explicitly asked.

## Project Structure

- `sjd-project/app/`: App Router pages and Node.js API route handlers.
- `sjd-project/components/`: shared shell, charts, and UI primitives.
- `sjd-project/lib/`: domain types, local-first store, finance calculations, and PostgreSQL connection.
- `sjd-project/database/schema.sql`: idempotent PostgreSQL setup.
- `sjd-project/public/`: PWA worker and generated SJD brand assets.

Do not edit generated `.next/`, `out/`, `dist/`, `release/`, or `tsconfig.tsbuildinfo` files.

## Development Commands

Run commands from `sjd-project/`:

```powershell
npm install         # install exact dependencies from package-lock.json
npm run dev         # start Next.js locally
npm run typecheck   # validate strict TypeScript
npm run build       # create the production server build
npm run start       # serve the production build
```

## Style & Architecture

Use TypeScript, functional React components, two-space indentation, semicolons, and PascalCase component names. Keep route files focused on composition; put shared UI in `components/` and domain logic in `lib/`. Reuse CSS variables from `app/globals.css`, especially the SJD palette, rather than adding one-off colors. Preserve responsive behavior, keyboard focus, touch targets, and reduced-motion support.

Client data is local-first. The optional PostgreSQL boundary belongs in `app/api/`; never import database code into client components. Keep SQL changes idempotent.

## Testing & Reviews

Automated tests are not configured yet. Before submitting, run `npm audit --audit-level=high`, `npm run typecheck`, and `npm run build`, then manually check `/`, `/portfolio`, `/life`, `/calendar`, `/mentor`, and `/settings` at desktop and mobile widths. Test theme switching, notes, adding an asset/task, habit toggles, backup export/import, and PWA installation.

Use concise imperative commits, commonly `feat: ...` or `fix: ...`. Pull requests should summarize behavior, verification, schema/environment changes, and include screenshots for visual work.

## Security

Copy `.env.example` to `.env.local`; never commit credentials. `DATABASE_URL` is server-only. Do not add brokerage secrets, analytics, trackers, or paid dependencies without explicit approval.
