# SJD Project Security

SJD Project is local-first: portfolio, Life OS, themes, and mentor notes stay in the browser unless you export them or deliberately enable PostgreSQL sync. The public deployment contains demonstration data only.

## Protections already enabled

- Restrictive Content Security Policy and browser permissions policy
- HTTPS-only HSTS, clickjacking protection, MIME sniffing protection, and no-referrer policy
- No analytics, third-party scripts, remote fonts, or brokerage integrations
- API responses and the service worker never cache private sync payloads
- PostgreSQL sync is disabled by default and requires a server-only API key
- Constant-time API-key comparison, basic abuse throttling, strict JSON content type, 2 MB request limit, and field validation
- PostgreSQL connection timeout, small connection pool, parameterized queries, and verified TLS certificates in production
- Backup imports are size-limited and validated before replacing local data
- Automated GitHub dependency updates and build checks

## Steps for the owner

### 1. Secure your accounts now

1. Enable two-factor authentication on GitHub and Vercel.
2. Use a unique password for each account and save recovery codes offline.
3. In GitHub, open **Settings → Code security** and enable Dependabot alerts and secret scanning if available.
4. Keep Windows, the browser, and the phone updated. Use a device PIN/password and disk encryption.

### 2. Keep sync disabled for now

No action is required for normal local use. Do not add `DATABASE_URL` or turn on `SJD_SYNC_ENABLED` yet. Browser sync is intentionally not connected until proper user authentication is added.

### 3. If server sync is added later

Use the Vercel project’s **Settings → Environment Variables** page. Never put these values in GitHub or variables beginning with `NEXT_PUBLIC_`.

Generate secrets locally:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
[guid]::NewGuid().ToString()
```

Set `DATABASE_URL`, a 64-character `SJD_SYNC_API_KEY`, and the UUID as `SJD_SYNC_USER_ID`; set `SJD_SYNC_ENABLED=true` only after an authenticated sync client is implemented. Rotate the API key immediately if it is ever exposed.

### 4. Protect your data

Export a JSON backup from Settings after important changes. Store it in an encrypted drive or password-protected archive. Remember that clearing browser site data removes the local workspace.

## Maintenance checklist

Run before every release:

```powershell
npm audit --audit-level=high
npm run typecheck
npm run build
```

No application can be made “fully secure” once and forgotten. Review dependency alerts monthly and add real authentication before any multi-user or cloud-sync feature.
