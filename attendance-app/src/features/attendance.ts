import { jalaliParts, jalaliToISO } from "../design/locale";
import { organizationPolicy } from "../design/policy";
import { eventClock, shift, workplaceDateISO, workplaceMinutes, type ClockLedger } from "./ledger";
import type { RoRequest } from "./store";

export type DayState = "complete" | "late" | "overtime" | "missingPunch" | "correction" | "off" | "future" | "noPunch" | "open";
export type DayRecord = {
  date: string; state: DayState; in?: string; out?: string; workedMin: number; lateMin: number; overtimeMin: number;
  note?: string; source: "ledger" | "schedule"; pendingSync?: boolean; location?: string;
};
const pad = (n: number) => String(n).padStart(2, "0");
const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const dayIndex = (iso: string) => Math.floor(Date.parse(iso + "T12:00:00Z") / 86400000);
export const isWeekend = (iso: string) => organizationPolicy.weekendDays.includes(new Date(iso + "T12:00:00Z").getUTCDay());
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);

/** Deterministic schedule history for days before the local ledger began. Real ledger events always win. */
function scheduled(date: string, today: string, salt = 0): DayRecord {
  if (date > today) return { date, state: "future", workedMin: 0, lateMin: 0, overtimeMin: 0, source: "schedule" };
  if (isWeekend(date)) return { date, state: "off", workedMin: 0, lateMin: 0, overtimeMin: 0, source: "schedule", note: "تعطیل هفتگی" };
  const n = (dayIndex(date) + salt) % 11;
  const base = { date, source: "schedule" as const, location: shift.place, overtimeMin: 0, lateMin: 0 };
  if (n === 0) return { ...base, state: "missingPunch", in: "08:34", workedMin: 0, note: "خروج ثبت نشده است." };
  if (n === 3) return { ...base, state: "late", in: "08:42", out: "17:00", workedMin: 7 * 60 + 18, lateMin: 12 };
  if (n === 5) return { ...base, state: "overtime", in: "08:28", out: "17:37", workedMin: 8 * 60 + 9, overtimeMin: 37 };
  if (n === 8) return { ...base, state: "complete", in: "08:25", out: "17:04", workedMin: 7 * 60 + 39 };
  return { ...base, state: "complete", in: hm(8 * 60 + 20 + (n * 3) % 9), out: hm(17 * 60 + (n * 2) % 7), workedMin: 7 * 60 + 30 + (n % 4) * 3 };
}

export function recordFor(date: string, ledger: ClockLedger, requests: RoRequest[], salt = 0): DayRecord {
  const today = workplaceDateISO();
  const events = salt === 0 ? ledger.events.filter(e => workplaceDateISO(new Date(e.time)) === date) : [];
  let record: DayRecord;
  if (events.length) {
    const first = events.find(e => e.action === "in"), last = [...events].reverse().find(e => e.action === "out");
    const inMin = first ? workplaceMinutes(first.time) : undefined, outMin = last ? workplaceMinutes(last.time) : undefined;
    const worked = inMin !== undefined && outMin !== undefined && outMin > inMin ? outMin - inMin - shift.breakMin : 0;
    const late = inMin !== undefined ? Math.max(0, inMin - shift.startMin) : 0;
    const overtime = outMin !== undefined ? Math.max(0, outMin - shift.endMin) : 0;
    const open = events.at(-1)!.action === "in";
    record = {
      date, source: "ledger", in: first ? eventClock(first.time) : undefined, out: last ? eventClock(last.time) : undefined,
      workedMin: Math.max(0, worked), lateMin: late, overtimeMin: overtime, pendingSync: events.some(e => e.state === "pending"),
      location: events.at(-1)?.location ? shift.place : events.at(-1)?.method === "qr" ? "QR محل کار" : "تأیید نشده",
      state: open ? (date === today ? "open" : "missingPunch") : overtime > 0 ? "overtime" : late > 0 ? "late" : "complete",
      note: open && date !== today ? "خروج ثبت نشده است." : undefined,
    };
  } else record = scheduled(date, today, salt);
  const returned = salt === 0 && requests.find(r => r.employeeCode === "RG-1042" && r.type === "correction" && r.status === "returned" && r.eventRef === date);
  if (returned) record = { ...record, state: "correction", note: "درخواست اصلاح برای ویرایش برگشت خورده است." };
  if (salt === 0 && record.state === "missingPunch" && requests.some(r => r.employeeCode === "RG-1042" && (r.type === "correction" || r.type === "missingPunch") && r.status === "pending" && r.eventRef === date))
    record = { ...record, note: "درخواست اصلاح در انتظار تأیید است." };
  if (date === today && !events.length && !isWeekend(date) && salt === 0) record = { ...record, state: "noPunch", note: "هنوز ورودی ثبت نشده است." };
  return record;
}

export type Period = { start: string; end: string; label: string; dates: string[] };
export function weekPeriod(offset: number, today = workplaceDateISO()): Period {
  const dow = new Date(today + "T12:00:00Z").getUTCDay();
  const sinceStart = (dow - organizationPolicy.calendarWeekStartsOn + 7) % 7;
  const start = addDays(today, -sinceStart + offset * 7), dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: dates[6], dates, label: "" };
}
export function monthPeriod(offset: number, today = workplaceDateISO()): Period & { year: number; month: number } {
  const p = jalaliParts(new Date(today + "T12:00:00Z"));
  const index = p.year * 12 + p.month - 1 + offset, year = Math.floor(index / 12), month = index % 12 + 1;
  const start = jalaliToISO(`${year}/${month}/1`)!, nextIndex = index + 1;
  const end = addDays(jalaliToISO(`${Math.floor(nextIndex / 12)}/${nextIndex % 12 + 1}/1`)!, -1);
  const dates: string[] = []; for (let d = start; d <= end; d = addDays(d, 1)) dates.push(d);
  return { start, end, dates, label: "", year, month };
}
export function totals(records: DayRecord[]) {
  const counted = records.filter(r => r.state !== "future" && r.state !== "off");
  return {
    worked: counted.reduce((n, r) => n + r.workedMin, 0), overtime: counted.reduce((n, r) => n + r.overtimeMin, 0),
    late: counted.reduce((n, r) => n + r.lateMin, 0),
    exceptions: counted.filter(r => ["late", "missingPunch", "correction", "noPunch"].includes(r.state) && !(r.state === "noPunch")).length,
    expected: records.filter(r => r.state !== "future" && r.state !== "off").length * (shift.endMin - shift.startMin - shift.breakMin),
  };
}
