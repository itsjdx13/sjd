import { shift } from "./ledger";

/**
 * Workplace configuration. A different site can be injected for testing via localStorage["roco-workplace"].
 * The QR secret lives in the client ONLY because this build has no backend: in production the server signs each
 * rotating window and verifies the scan, and the secret must never ship to employee devices.
 */
export type Workplace = { id: string; name: string; lat: number; lng: number; radius: number; maxAccuracy: number; qrSecret: string; qrWindowSeconds: number };
const defaults: Workplace = { id: "hq", name: shift.place, lat: 35.7219, lng: 51.3347, radius: 150, maxAccuracy: 100, qrSecret: "roco-demo-qr-secret-v1", qrWindowSeconds: 30 };
export function getWorkplace(): Workplace {
  try {
    const raw = localStorage.getItem("roco-workplace");
    if (raw) { const o = JSON.parse(raw); if (["lat", "lng", "radius"].every(k => Number.isFinite(o[k]))) return { ...defaults, ...o }; }
  } catch { /* use defaults */ }
  return defaults;
}
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => d * Math.PI / 180, R = 6371000;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const windowOf = (now: number, w: Workplace) => Math.floor(now / 1000 / w.qrWindowSeconds);
async function sign(site: string, window: number, secret: string) {
  const data = new TextEncoder().encode(`${secret}:${site}:${window}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}
export async function makeQrPayload(now = Date.now(), w = getWorkplace()) {
  const window = windowOf(now, w);
  return { payload: `ROCO:v1:${w.id}:${window}:${await sign(w.id, window, w.qrSecret)}`, window, expiresAt: (window + 1) * w.qrWindowSeconds * 1000 };
}
export type QrResult = { ok: true; site: string; window: number } | { ok: false; reason: "format" | "site" | "expired" | "signature" };
export async function verifyQrPayload(text: string, now = Date.now(), w = getWorkplace()): Promise<QrResult> {
  const m = /^ROCO:v1:([a-z0-9_-]+):(\d+):([0-9a-f]{16})$/.exec(text.trim());
  if (!m) return { ok: false, reason: "format" };
  const [, site, win, sig] = m, window = Number(win);
  if (site !== w.id) return { ok: false, reason: "site" };
  if (sig !== await sign(site, window, w.qrSecret)) return { ok: false, reason: "signature" };
  if (Math.abs(window - windowOf(now, w)) > 1) return { ok: false, reason: "expired" };
  return { ok: true, site, window };
}
export const qrErrorText: Record<Exclude<QrResult, { ok: true }>["reason"], string> = {
  format: "این کد متعلق به روکو گایز نیست.", site: "این کد برای محل کار دیگری است.",
  expired: "این کد منقضی شده است. کد جاری را از نمایشگر محل کار اسکن کنید.", signature: "امضای کد معتبر نیست.",
};
