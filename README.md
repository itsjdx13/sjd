# Northstar Personal Finance

A private, local-first personal finance terminal for investments, cash, currencies, Iranian assets, precious metals, property, vehicles, custom assets, and liabilities. It is an installable React PWA designed for one person and a permanent **$0 operating cost**.

## What works

- Instant IndexedDB portfolio load with clearly separated demo data
- Net worth, daily change, cost basis, profit/loss, and asset allocation
- Sortable holdings, manual assets, properties, ownership percentages, and liabilities
- USD, EUR, GBP, AED, IRR, and IRT display; `1 IRT = 10 IRR` is explicit
- CoinGecko crypto, Gold API metals, Frankfurter FX, optional Alpha Vantage stocks, and opt-in TSETMC adapters
- Ayar / `عیار` as a Unicode-safe manual holding with an optional TSETMC instrument code
- Watchlist, privacy mode, light/dark/system appearance, and cached price status
- Position-size, risk/reward, P&L, pip, and margin calculators
- JSON backup/restore and CSV export
- Offline application shell and cached provider responses
- Optional Supabase email/password snapshot sync with row-level security

No analytics, ads, trackers, paid APIs, server requirement, or Mofid credentials are used.

## Architecture

```text
React UI → calculation/services layer → provider adapters → public APIs
                              ↘ IndexedDB (source of truth)
                               ↘ optional Supabase snapshot sync
```

The UI never fetches provider APIs directly. `MarketDataService` batches crypto requests, deduplicates in-flight requests, applies provider-specific cache TTLs, and retains cached prices on errors. The normalized data types live in `src/types/finance.ts`; calculation code is in `src/utils/finance.ts`; providers are under `src/services/market-data/`.

## Install and run

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

Other commands:

```bash
npm test        # business-critical finance calculations
npm run build   # strict TypeScript check + optimized PWA build
npm run preview # serve the production build locally
```

The first launch shows removable demo assets. Settings → **Remove demo data** clears them before you enter or restore personal data.

## Market-data providers

Research was checked on 21 Aug 2026. Providers can change their terms or limits, so cached/manual pricing is always the fallback.

| Provider | Use | Key / current free limit | Behavior |
| --- | --- | --- | --- |
| [CoinGecko Public API](https://docs.coingecko.com/docs/keyless-public-api) | BTC, ETH, SOL, USDT | No key; IP rate limiting, low-volume non-commercial use | Batched, 60-second cache |
| [Frankfurter](https://frankfurter.dev/) | Conventional FX | No key; no quota, fair-use rate limiting; central-bank reference rates | Daily/reference data, 15-minute app cache |
| [Gold API](https://gold-api.com/docs) | XAU, XAG | No key; real-time endpoint advertised without a quota | Five-minute cache; verify before trading |
| [Alpha Vantage](https://www.alphavantage.co/support/) | International equities | Optional key; 25 requests/day; free US data is not real-time/15-minute | Labeled delayed, five-minute cache |
| TSETMC public site | Iranian instruments / Ayar | No documented developer SLA or stable official public API contract found | Disabled by default; instrument-code adapter, cached/manual fallback |
| Manual | Property, cash, Mofid holdings, IRR FX | Unlimited, offline | User-maintained |

No authenticated Mofid API suitable for this personal client was verified. The app therefore never signs in to Mofid and never scrapes account data. Record the owned units manually, then use a legitimate public quote where available. TradingView and Bloomberg are navigation/research products only and are not critical data dependencies.

### Optional keys

Copy `.env.example` to `.env.local`. Vite variables are visible to the browser: only place a personal, restricted public-data key here—never a brokerage credential or service-role key.

```env
VITE_ALPHA_VANTAGE_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Optional cross-device sync

Local IndexedDB remains authoritative. To enable Supabase:

1. Create a free Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Add its URL and **anon** key to `.env.local`; never use the service-role key.
3. Restart the app, open Settings, create/sign in to an account, then explicitly upload or download a snapshot.

RLS restricts every row to `auth.uid()`. Passwords and tokens are held only for the open app session and are never exported. The [Supabase free plan](https://supabase.com/pricing) currently includes 500 MB database, 5 GB egress, and 50,000 MAU, but pauses projects after one inactive week. Sync failure never affects local operation.

## Privacy and backups

Portfolio data, preferences, watchlist, and transactions are stored in the browser's IndexedDB database `northstar-finance`. Market providers receive symbols only—not quantities, cost basis, properties, or total wealth. Clearing browser site data deletes local records, so export a JSON backup regularly. Restoring a backup replaces the current local portfolio and does not merge demo records.

## PWA installation and offline use

- **iPhone/iPad:** open the HTTPS deployment in Safari → Share → Add to Home Screen.
- **Android/desktop:** use the browser's Install app action.

The service worker caches the application shell, font, and successful public quote responses. Offline mode shows the portfolio, manual/cached values, property records, settings, and calculators. Live refresh resumes when connectivity returns.

## Free deployment

[Cloudflare Pages](https://developers.cloudflare.com/pages/) is recommended: static asset requests are free/unlimited, the free plan allows 500 builds/month and 20,000 files, and this app needs no Functions.

1. Push the repository to GitHub or GitLab.
2. Create a Pages project with build command `npm run build` and output directory `dist`.
3. Add optional `VITE_*` variables in Pages settings.
4. Deploy. `_headers` applies a restrictive CSP and `_redirects` supports SPA navigation.

GitHub Pages, Netlify, and Vercel can also serve `dist`, but verify their current free-tier terms before relying on them.

## Accuracy notes

This is a personal tracking tool, not an execution or accounting system. Public quotes may be delayed, incomplete, unavailable, or denominated differently by a market. Verify instrument units—especially Iranian funds and Rial/Toman prices—before entering quantities. Property values and Mofid ownership remain manual by design.
