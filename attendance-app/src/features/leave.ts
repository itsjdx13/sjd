import { useSyncExternalStore } from "react";
import { PersistenceFailure, persistenceMessage, readStrict, writeConfirmed } from "./persistence";

/** Daily paid-leave accounting only. No invented annual entitlement or hourly conversion. */
export const LEAVE_KEY = "roco-leave-v1";
export const sampleBalances: Record<string, number> = { "RG-1042": 12.5, "RG-1048": 8, "RG-1051": 15, "RG-1060": 6.5 };
type LeaveRequest = { id: string; employeeCode: string; type: string; status: string; leaveKind?: string; days: number };
type Account = { opening: number; includedApprovedIds: string[] };
export type LeaveCorrection = { id: string; employeeCode: string; at: string; actor: string; reason: string; target: number; delta: number; before: number | null; after: number };
export type LeaveData = { version: 1; initializedAt: string; accounts: Record<string, Account>; corrections: LeaveCorrection[] };
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string") && new Set(v).size === v.length;
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isData = (v: unknown): v is LeaveData => {
  if (!isRecord(v) || v.version !== 1 || typeof v.initializedAt !== "string" || !Number.isFinite(Date.parse(v.initializedAt)) || !isRecord(v.accounts) || !Array.isArray(v.corrections)) return false;
  return Object.values(v.accounts).every(a => isRecord(a) && finite(a.opening) && a.opening >= 0 && strings(a.includedApprovedIds))
    && v.corrections.every(c => isRecord(c) && ["id", "employeeCode", "at", "actor", "reason"].every(k => typeof c[k] === "string" && !!c[k])
      && Number.isFinite(Date.parse(c.at as string)) && finite(c.target) && c.target >= 0 && finite(c.delta)
      && (c.before === null || finite(c.before)) && finite(c.after) && c.after === c.target
      && (c.before === null ? c.delta === 0 : Math.abs(c.delta - round(c.after - (c.before as number))) < 0.000001)
      && Object.hasOwn(v.accounts as object, c.employeeCode as string))
    && new Set(v.corrections.map(c => c.id)).size === v.corrections.length;
};
const paidDaily = (r: LeaveRequest) => r.type === "dailyLeave" && r.leaveKind !== "unpaid";
const round = (n: number) => Math.round(n * 100) / 100;
function seedData(requests: LeaveRequest[]): LeaveData {
  // Old HR values are remaining-balance snapshots, not annual allocations.
  const legacy = readStrict<{ version: 1; profiles: Record<string, { balanceBase?: number }> }>("roco-hr-v1", () => ({ version: 1, profiles: Object.fromEntries(Object.entries(sampleBalances).map(([code, balanceBase]) => [code, { balanceBase }])) }),
    (v: unknown): v is { version: 1; profiles: Record<string, { balanceBase?: number }> } => isRecord(v) && v.version === 1 && isRecord(v.profiles)
      && Object.values(v.profiles).every(p => isRecord(p) && ["role","contract","skill","document"].every(k => p[k] === undefined || typeof p[k] === "string") && (p.balanceBase === undefined || finite(p.balanceBase) && p.balanceBase >= 0)));
  const accounts: Record<string, Account> = Object.create(null);
  for (const [code, profile] of Object.entries(legacy.profiles)) if (profile.balanceBase !== undefined) accounts[code] = {
    opening: profile.balanceBase, includedApprovedIds: requests.filter(r => r.employeeCode === code && paidDaily(r) && r.status === "approved").map(r => r.id),
  };
  return { version: 1, initializedAt: new Date().toISOString(), accounts, corrections: [] };
}
export const readLeaveData = (requests: LeaveRequest[]): LeaveData => readStrict(LEAVE_KEY, () => seedData(requests), isData);
const listeners = new Set<() => void>();
let revision = 0;
const changed = () => { revision++; listeners.forEach(l => l()); };
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === null || [LEAVE_KEY, "roco-hr-v1", "roco-requests-v1"].includes(e.key)) changed(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
};
export const useLeaveRevision = () => useSyncExternalStore(subscribe, () => revision);
export function ensureLeaveData(requests: LeaveRequest[]): LeaveData {
  const data = readLeaveData(requests);
  // Persist the migration before any request mutation; otherwise each approval could
  // accidentally become part of a newly inferred starting snapshot.
  if (localStorage.getItem(LEAVE_KEY) === null) { writeConfirmed(LEAVE_KEY, data); changed(); }
  return data;
}
function calculate(data: LeaveData, requests: LeaveRequest[], code: string) {
  const account = Object.hasOwn(data.accounts, code) ? data.accounts[code] : undefined;
  const mine = requests.filter(r => r.employeeCode === code && paidDaily(r));
  const pendingDays = round(mine.filter(r => r.status === "pending").reduce((sum, r) => sum + r.days, 0));
  if (!account) return { available: undefined, afterPending: undefined, pendingDays, problem: "" };
  const corrections = data.corrections.filter(c => c.employeeCode === code).reduce((sum, c) => sum + c.delta, 0);
  const approvedDays = mine.filter(r => r.status === "approved" && !account.includedApprovedIds.includes(r.id)).reduce((sum, r) => sum + r.days, 0);
  const available = round(account.opening + corrections - approvedDays);
  return { available, afterPending: round(available - pendingDays), pendingDays, problem: "" };
}
export function balanceFor(requests: LeaveRequest[], code: string) {
  try { return calculate(readLeaveData(requests), requests, code); }
  catch (error) { return { available: undefined, afterPending: undefined, pendingDays: 0, problem: persistenceMessage(error) }; }
}
export function strictBalanceFor(requests: LeaveRequest[], code: string) { return calculate(ensureLeaveData(requests), requests, code); }
export function leaveFingerprint(requests: LeaveRequest[], code: string): string {
  const data = readLeaveData(requests);
  return JSON.stringify({ account: Object.hasOwn(data.accounts, code) ? data.accounts[code] : undefined, corrections: data.corrections.filter(c => c.employeeCode === code), requests: requests.filter(r => r.employeeCode === code && paidDaily(r)).map(r => ({ id: r.id, status: r.status, days: r.days })) });
}
export function saveLeaveCorrection(input: { id: string; code: string; target: number; reason: string; actor: string; expected: string }, requests: LeaveRequest[]) {
  const reason = input.reason.trim(), target = round(input.target);
  if (!Number.isFinite(input.target) || !Number.isSafeInteger(Math.round(input.target * 100)) || target < 0 || Math.abs(input.target - target) > 0.000001 || reason.length < 10 || reason.length > 500) throw new PersistenceFailure("conflict", "مانده باید عدد غیرمنفی با حداکثر دو رقم اعشار باشد و دلیل بین ۱۰ تا ۵۰۰ نویسه داشته باشد.");
  const data = ensureLeaveData(requests);
  const saved = data.corrections.find(c => c.id === input.id);
  if (saved) {
    if (saved.employeeCode !== input.code || saved.target !== target || saved.reason !== reason || saved.actor !== input.actor) throw new PersistenceFailure("conflict", "نسخه قبلی همین اصلاح ذخیره شده است؛ آن را در تاریخچه بررسی کنید. تغییر تازه ثبت نشد.");
    return saved; // Exact retry after a write succeeded but read-back failed.
  }
  if (leaveFingerprint(requests, input.code) !== input.expected) throw new PersistenceFailure("conflict", "مانده یا درخواست‌ها در این فاصله تغییر کرده‌اند؛ مقدار تازه را بررسی و دوباره ذخیره کنید.");
  const before = calculate(data, requests, input.code);
  if (target < before.pendingDays) throw new PersistenceFailure("conflict", "مانده جدید کمتر از روزهای رزروشده درخواست‌های در انتظار است؛ ابتدا درخواست‌ها را بررسی کنید.");
  const correction: LeaveCorrection = { id: input.id, employeeCode: input.code, at: new Date().toISOString(), actor: input.actor, reason, target,
    before: before.available ?? null, after: target, delta: before.available === undefined ? 0 : round(target - before.available) };
  const accounts = before.available === undefined ? { ...data.accounts, [input.code]: { opening: target, includedApprovedIds: requests.filter(r => r.employeeCode === input.code && paidDaily(r) && r.status === "approved").map(r => r.id) } } : data.accounts;
  writeConfirmed(LEAVE_KEY, { ...data, accounts, corrections: [...data.corrections, correction] });
  changed();
  return correction;
}
