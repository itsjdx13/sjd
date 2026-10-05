import { useSyncExternalStore } from "react";
import { organizationPolicy } from "../design/policy";

export type ClockMethod = "gps" | "qr" | "offline";
export type ClockEvent = {
  id: string; action: "in" | "out"; time: string; method: ClockMethod; state: "pending" | "local";
  /** Present for GPS punches: where the device reported itself and how accurate that was. */
  location?: { lat: number; lng: number; accuracy: number; distance: number };
  /** Present for QR punches: the workplace code window that was scanned. */
  qr?: { site: string; window: number };
};
export type ClockLedger = { events: ClockEvent[] };
export const ledgerKey = "roco-attendance-v2";
const methods = ["gps", "qr", "offline"];

export function readClockLedger(): ClockLedger {
  try {
    const stored = localStorage.getItem(ledgerKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed.events) || parsed.events.some((event: ClockEvent) =>
        !event || typeof event.id !== "string" || !["in", "out"].includes(event.action) ||
        !["pending", "local"].includes(event.state) || !methods.includes(event.method) ||
        !Number.isFinite(Date.parse(event.time)))) throw new Error("invalid ledger");
      return parsed;
    }
    const legacy = JSON.parse(localStorage.getItem("roco-offline-punches") || "[]");
    if (!Array.isArray(legacy)) throw new Error("invalid queue");
    return { events: legacy.map((event: ClockEvent) => {
      if (!event || typeof event.id !== "string" || !["in", "out"].includes(event.action) || !Number.isFinite(Date.parse(event.time))) throw new Error("invalid event");
      return { id: event.id, action: event.action, time: event.time, method: "offline", state: "pending" };
    }) };
  } catch {
    throw new Error("اطلاعات ذخیره‌شده قابل خواندن نیست. هیچ رویدادی حذف نشد؛ برای بازیابی با پشتیبانی تماس بگیرید.");
  }
}
export function safeLedger(): ClockLedger { try { return readClockLedger(); } catch { return { events: [] }; } }

/* Lightweight change feed so dashboard/attendance update when the clock page writes. */
const listeners = new Set<() => void>();
let version = 0;
export function writeClockLedger(next: ClockLedger) {
  localStorage.setItem(ledgerKey, JSON.stringify(next));
  version++; listeners.forEach(l => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => { if (e.key === ledgerKey) { version++; l(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
};
export const useLedgerVersion = () => useSyncExternalStore(subscribe, () => version);

const zone = organizationPolicy.workplaceTimeZone;
export const eventTime = (time: string) => new Intl.DateTimeFormat("fa-IR", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(time));
export const eventClock = (time: string) => new Intl.DateTimeFormat("fa-IR", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(time));
export const eventDate = (time: string) => new Intl.DateTimeFormat("fa-IR", { timeZone: zone, year: "numeric", month: "long", day: "numeric" }).format(new Date(time));
export function workplaceDateISO(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (name: string) => parts.find(p => p.type === name)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function workplaceMinutes(time: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(time));
  return Number(parts.find(p => p.type === "hour")!.value) % 24 * 60 + Number(parts.find(p => p.type === "minute")!.value);
}
/** Today's open/closed state derived from real events, not from a separate flag. */
export function todayStatus(ledger: ClockLedger) {
  const today = workplaceDateISO();
  const events = ledger.events.filter(e => workplaceDateISO(new Date(e.time)) === today);
  const first = events.find(e => e.action === "in");
  const last = events.at(-1);
  return { events, first, last, working: last?.action === "in", pending: events.some(e => e.state === "pending") };
}
export const shift = { name: "شیفت عادی", start: "08:30", end: "17:00", startMin: 8 * 60 + 30, endMin: 17 * 60, place: "دفتر مرکزی", breakMin: 60 };
