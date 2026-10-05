import { useSyncExternalStore } from "react";
import { jalaliToISO } from "../design/locale";
import type { Role } from "../design/policy";
import { PersistenceFailure, readStrict, writeConfirmed } from "./persistence";

/* ---------- generic persisted store ---------- */
type Listener = () => void;
export function createStore<T>(key: string, seed: () => T, validate: (value: unknown) => value is T) {
  let cache: T | undefined;
  let lastGood: T | undefined;
  const listeners = new Set<Listener>();
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) { const parsed = JSON.parse(raw); if (validate(parsed)) { lastGood = parsed; return parsed; } }
    } catch { /* fall through to seed */ }
    return lastGood ?? seed();
  };
  const get = () => (cache ??= read());
  const set = (next: T) => {
    cache = next;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* quota or private mode: keep in memory */ }
    listeners.forEach(l => l());
  };
  // Opt-in durable operations: failed writes must not publish an in-memory success.
  // Existing demo callers keep their legacy best-effort behavior.
  const getPersisted = (): T => { const value = readStrict(key, seed, validate); lastGood = value; return value; };
  const refreshPersisted = () => {
    const next = getPersisted();
    cache = next;
    listeners.forEach(l => l());
    return next;
  };
  const setPersisted = (next: T) => {
    getPersisted(); // Preserve unreadable existing data rather than replacing it with seeds.
    if (!validate(next)) throw new PersistenceFailure("corrupt", "ساختار اطلاعات جدید معتبر نیست؛ ذخیره متوقف شد.");
    writeConfirmed(key, next);
    lastGood = next;
    cache = next;
    listeners.forEach(l => l());
  };
  const subscribe = (l: Listener) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => { if (e.key === key) { cache = undefined; l(); } };
    window.addEventListener("storage", onStorage);
    return () => { listeners.delete(l); window.removeEventListener("storage", onStorage); };
  };
  const problem = () => { try { getPersisted(); return ""; } catch (error) { return error instanceof Error ? error.message : "داده ذخیره‌شده قابل خواندن نیست."; } };
  return { get, set, getPersisted, refreshPersisted, setPersisted, subscribe, use: () => useSyncExternalStore(subscribe, get), useProblem: () => useSyncExternalStore(subscribe, problem) };
}

/* ---------- session ---------- */
export type Session = { role: Role; expiresAt: number };
export const SESSION_KEY = "roco-session-v1";
export const SESSION_MS = 8 * 60 * 60 * 1000;
export type SessionState = { status: "none" } | { status: "active"; session: Session } | { status: "expired"; role: Role };
export function readSession(now = Date.now()): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Session;
      if (["employee", "manager", "hr", "admin"].includes(parsed.role) && Number.isFinite(parsed.expiresAt)) {
        return parsed.expiresAt > now ? { status: "active", session: parsed } : { status: "expired", role: parsed.role };
      }
    }
    // migrate the earlier unauthenticated role marker
    const legacy = localStorage.getItem("roco-role");
    if (legacy && ["employee", "manager", "hr", "admin"].includes(legacy)) {
      const session = { role: legacy as Role, expiresAt: now + SESSION_MS };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { status: "active", session };
    }
  } catch { /* treat as signed out */ }
  return { status: "none" };
}
export function writeSession(role: Role, now = Date.now()) {
  const session: Session = { role, expiresAt: now + SESSION_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("roco-role", role);
  return session;
}
export function clearSession() { localStorage.removeItem(SESSION_KEY); localStorage.removeItem("roco-role"); }

/* ---------- requests ---------- */
export type RequestType = "dailyLeave" | "hourlyLeave" | "mission" | "overtime" | "missingPunch" | "correction";
export type RequestStatus = "pending" | "approved" | "rejected" | "returned";
export const requestTypeLabels: Record<RequestType, string> = {
  dailyLeave: "مرخصی روزانه", hourlyLeave: "مرخصی ساعتی", mission: "ماموریت",
  overtime: "اضافه‌کار", missingPunch: "فراموشی ثبت", correction: "اصلاح حضور",
};
export type HistoryEntry = { at: string; actor: string; action: "submitted" | "approved" | "rejected" | "returned" | "resubmitted"; comment?: string };
export type RoRequest = {
  id: string; employee: string; employeeCode: string; type: RequestType; status: RequestStatus;
  createdAt: string; startDate: string; endDate: string; startTime?: string; endTime?: string;
  leaveKind?: "paid" | "unpaid"; destination?: string; eventRef?: string; reason: string;
  attachments: string[]; days: number; history: HistoryEntry[];
  submissionKey?: string;
};
export const CURRENT_USER = { name: "سارا احمدی", code: "RG-1042" };
export const LEAVE_BALANCE_DAYS = 12.5;
export const MANAGER_NAME = "نیما رضایی";

const entry = (at: string, actor: string, action: HistoryEntry["action"], comment?: string): HistoryEntry => ({ at, actor, action, comment });
const seedRequests = (): RoRequest[] => [
  { id: "REQ-1001", employee: "سارا احمدی", employeeCode: "RG-1042", type: "dailyLeave", status: "pending", createdAt: "2026-10-02T07:40:00Z", startDate: "2026-10-06", endDate: "2026-10-06", leaveKind: "paid", reason: "مراجعه به اداره ثبت احوال.", attachments: [], days: 1, history: [entry("2026-10-02T07:40:00Z", "سارا احمدی", "submitted")] },
  { id: "REQ-1000", employee: "سارا احمدی", employeeCode: "RG-1042", type: "mission", status: "approved", createdAt: "2026-09-24T06:10:00Z", startDate: "2026-09-29", endDate: "2026-09-29", startTime: "09:00", endTime: "15:00", destination: "دفتر مشتری", reason: "جلسه نهایی‌سازی قرارداد.", attachments: [], days: 0, history: [entry("2026-09-24T06:10:00Z", "سارا احمدی", "submitted"), entry("2026-09-24T09:30:00Z", MANAGER_NAME, "approved", "موفق باشید.")] },
  { id: "REQ-0999", employee: "سارا احمدی", employeeCode: "RG-1042", type: "correction", status: "returned", createdAt: "2026-09-28T08:00:00Z", startDate: "2026-09-28", endDate: "2026-09-28", eventRef: "2026-09-28", reason: "خروج را فراموش کردم.", attachments: [], days: 0, history: [entry("2026-09-28T08:00:00Z", "سارا احمدی", "submitted"), entry("2026-09-28T10:15:00Z", MANAGER_NAME, "returned", "ساعت دقیق خروج را بنویسید.")] },
  { id: "REQ-1002", employee: "علی مرادی", employeeCode: "RG-1048", type: "dailyLeave", status: "pending", createdAt: "2026-10-02T05:20:00Z", startDate: "2026-10-07", endDate: "2026-10-08", leaveKind: "paid", reason: "سفر خانوادگی برنامه‌ریزی‌شده.", attachments: ["برنامه-سفر.pdf"], days: 2, history: [entry("2026-10-02T05:20:00Z", "علی مرادی", "submitted")] },
  { id: "REQ-1003", employee: "مریم کریمی", employeeCode: "RG-1051", type: "correction", status: "pending", createdAt: "2026-10-02T14:00:00Z", startDate: "2026-09-30", endDate: "2026-09-30", eventRef: "2026-09-30", reason: "ورود در اثر قطعی اینترنت ثبت نشد؛ ساعت حضور ۰۸:۴۰ بود.", attachments: [], days: 0, history: [entry("2026-10-02T14:00:00Z", "مریم کریمی", "submitted")] },
  { id: "REQ-1004", employee: "رضا نادری", employeeCode: "RG-1060", type: "overtime", status: "pending", createdAt: "2026-10-02T12:00:00Z", startDate: "2026-10-04", endDate: "2026-10-04", startTime: "17:00", endTime: "19:30", reason: "تحویل نسخه آزمایشی به مشتری.", attachments: [], days: 0, history: [entry("2026-10-02T12:00:00Z", "رضا نادری", "submitted")] },
];
const isRequestList = (v: unknown): v is RoRequest[] => Array.isArray(v) && v.every(r =>
  r && typeof r.id === "string" && typeof r.employee === "string" && typeof r.employeeCode === "string"
  && Object.hasOwn(requestTypeLabels, r.type) && ["pending", "approved", "rejected", "returned"].includes(r.status)
  && typeof r.reason === "string" && typeof r.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.startDate)
  && typeof r.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.endDate)
  && typeof r.createdAt === "string" && Number.isFinite(Date.parse(r.createdAt)) && Number.isFinite(r.days) && r.days >= 0
  && [r.startTime, r.endTime, r.destination, r.eventRef, r.submissionKey].every(value => value === undefined || typeof value === "string")
  && (r.leaveKind === undefined || ["paid", "unpaid"].includes(r.leaveKind))
  && Array.isArray(r.attachments) && r.attachments.every((a: unknown) => typeof a === "string")
  && Array.isArray(r.history) && r.history.every((h: HistoryEntry) => h && typeof h.at === "string" && Number.isFinite(Date.parse(h.at)) && typeof h.actor === "string" && ["submitted", "resubmitted", "approved", "rejected", "returned"].includes(h.action) && (h.comment === undefined || typeof h.comment === "string")));
export const requestStore = createStore<RoRequest[]>("roco-requests-v1", seedRequests, isRequestList);

export function nextRequestId(list: RoRequest[]) {
  const max = list.reduce((n, r) => Math.max(n, Number(r.id.replace(/\D/g, "")) || 0), 1000);
  return `REQ-${max + 1}`;
}
export function submitRequest(draft: Omit<RoRequest, "id" | "status" | "createdAt" | "history" | "employee" | "employeeCode">, replacingId?: string, submissionKey?: string, expected?: RoRequest) {
  const list = requestStore.refreshPersisted(); const at = new Date().toISOString();
  const existing = submissionKey ? list.find(r => r.submissionKey === submissionKey && r.employeeCode === CURRENT_USER.code) : undefined;
  if (existing) return existing.id; // Retry after an uncertain read-back: one form, one request.
  if (replacingId) {
    const current = list.find(r => r.id === replacingId);
    if (!current || current.status !== "returned" || current.employeeCode !== CURRENT_USER.code || expected && JSON.stringify(current) !== JSON.stringify(expected)) throw new PersistenceFailure("conflict", "این درخواست تغییر کرده یا دیگر قابل ویرایش نیست؛ وضعیت تازه را بررسی کنید.");
    requestStore.setPersisted(list.map(r => r.id === replacingId ? { ...r, ...draft, submissionKey, status: "pending" as const, history: [...r.history, entry(at, CURRENT_USER.name, "resubmitted")] } : r));
    return replacingId;
  }
  const id = nextRequestId(list);
  requestStore.setPersisted([{ id, employee: CURRENT_USER.name, employeeCode: CURRENT_USER.code, ...draft, submissionKey, status: "pending", createdAt: at, history: [entry(at, CURRENT_USER.name, "submitted")] }, ...list]);
  return id;
}
export function decideRequest(id: string, decision: Exclude<RequestStatus, "pending">, actor: string, comment: string, expected?: RoRequest) {
  const at = new Date().toISOString();
  const list = requestStore.refreshPersisted(), current = list.find(r => r.id === id);
  if (!current || current.status !== "pending" || current.employeeCode === CURRENT_USER.code || expected && JSON.stringify(current) !== JSON.stringify(expected)) throw new PersistenceFailure("conflict", "درخواست تغییر کرده یا قبلاً بررسی شده است؛ وضعیت تازه را بررسی کنید. تصمیم جدید ثبت نشد.");
  if (decision !== "approved" && !comment.trim()) throw new PersistenceFailure("conflict", "برای رد یا بازگشت درخواست، دلیل لازم است.");
  requestStore.setPersisted(list.map(r => r.id === id && r.status === "pending"
    ? { ...r, status: decision, history: [...r.history, entry(at, actor, decision, comment.trim() || undefined)] } : r));
}

/* ---------- request rules ---------- */
export const dayCount = (startISO: string, endISO: string, weekend: readonly number[]) => {
  let n = 0;
  for (let t = Date.parse(startISO + "T12:00:00Z"); t <= Date.parse(endISO + "T12:00:00Z"); t += 86400000) if (!weekend.includes(new Date(t).getUTCDay())) n++;
  return n;
};
const toMinutes = (t?: string) => { if (!t) return NaN; const [h, m] = t.split(":").map(Number); return h * 60 + m; };
export function overlaps(a: Pick<RoRequest, "type" | "startDate" | "endDate" | "startTime" | "endTime">, b: Pick<RoRequest, "type" | "startDate" | "endDate" | "startTime" | "endTime">) {
  if (a.endDate < b.startDate || b.endDate < a.startDate) return false;
  const aTimed = !!a.startTime && a.type !== "dailyLeave", bTimed = !!b.startTime && b.type !== "dailyLeave";
  if (a.startDate === a.endDate && b.startDate === b.endDate && aTimed && bTimed) {
    return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
  }
  return true;
}
export function findOverlaps(draft: Pick<RoRequest, "type" | "startDate" | "endDate" | "startTime" | "endTime">, list: RoRequest[], ignoreId?: string) {
  const leaveLike = (t: RequestType) => t === "dailyLeave" || t === "hourlyLeave" || t === "mission";
  return list.filter(r => r.employeeCode === CURRENT_USER.code && r.id !== ignoreId && (r.status === "pending" || r.status === "approved")
    && leaveLike(r.type) === leaveLike(draft.type) && (r.type === draft.type || leaveLike(draft.type)) && overlaps(draft, r));
}
export function leaveBalance(list: RoRequest[]) {
  const pendingDays = list.filter(r => r.employeeCode === CURRENT_USER.code && r.type === "dailyLeave" && r.leaveKind !== "unpaid" && r.status === "pending").reduce((n, r) => n + r.days, 0);
  return { available: LEAVE_BALANCE_DAYS, pendingDays, afterPending: LEAVE_BALANCE_DAYS - pendingDays };
}
export const isoFromField = (value: string) => jalaliToISO(value);

/* ---------- employees ---------- */
export type Employee = { code: string; name: string; department: string; status: "active" | "leave" | "inactive"; email?: string; shift: string };
export const employeeStatusLabel: Record<Employee["status"], string> = { active: "فعال", leave: "مرخصی", inactive: "غیرفعال" };
const seedEmployees = (): Employee[] => {
  const base: Employee[] = [
    { code: "RG-1042", name: "سارا احمدی", department: "محصول", status: "active", email: "sara@rocoguys.ir", shift: "صبح" },
    { code: "RG-1048", name: "علی مرادی", department: "عملیات", status: "active", email: "ali@rocoguys.ir", shift: "صبح" },
    { code: "RG-1051", name: "مریم کریمی", department: "مالی", status: "leave", email: "maryam@rocoguys.ir", shift: "صبح" },
    { code: "RG-1060", name: "رضا نادری", department: "فروش", status: "active", email: "reza@rocoguys.ir", shift: "عصر" },
    { code: "RG-1064", name: "نگار رستمی", department: "منابع انسانی", status: "active", email: "negar@rocoguys.ir", shift: "صبح" },
    { code: "RG-1067", name: "کیان صالحی", department: "عملیات", status: "active", email: "kian@rocoguys.ir", shift: "عصر" },
    { code: "RG-1070", name: "هانیه فرجی", department: "محصول", status: "active", email: "haniyeh@rocoguys.ir", shift: "صبح" },
    { code: "RG-1073", name: "پوریا شمس", department: "فروش", status: "leave", email: "pouria@rocoguys.ir", shift: "صبح" },
    { code: "RG-1075", name: "آزاده کاظمی", department: "مالی", status: "active", email: "azadeh@rocoguys.ir", shift: "صبح" },
    { code: "RG-1080", name: "سینا بهرامی", department: "عملیات", status: "inactive", email: "sina@rocoguys.ir", shift: "شب" },
    { code: "RG-1082", name: "نازنین یگانه", department: "محصول", status: "active", email: "nazanin@rocoguys.ir", shift: "صبح" },
    { code: "RG-1085", name: "امیر عطایی", department: "منابع انسانی", status: "active", email: "amir@rocoguys.ir", shift: "عصر" },
  ];
  return base;
};
const isEmployeeList = (v: unknown): v is Employee[] => Array.isArray(v) && v.every(e => e && typeof e.code === "string" && typeof e.name === "string" && typeof e.department === "string" && ["active", "leave", "inactive"].includes(e.status) && typeof e.shift === "string");
export const employeeStore = createStore<Employee[]>("roco-employees-v1", seedEmployees, isEmployeeList);
export const departments = ["محصول", "عملیات", "مالی", "فروش", "منابع انسانی"];

/* ---------- export history ---------- */
export type ExportRecord = { id: string; name: string; createdAt: string; rows: number; format: "csv" | "json" | "xlsx"; content: string; encoding?: "base64"; filters?: {employeeCodes:string[];departments:string[];from:string;to:string} };
const isExportList = (v: unknown): v is ExportRecord[] => Array.isArray(v) && v.every(e => e && typeof e.id === "string" && typeof e.name === "string" && typeof e.content === "string" && typeof e.createdAt === "string" && Number.isFinite(Date.parse(e.createdAt)) && Number.isInteger(e.rows) && e.rows >= 0 && ["csv", "json", "xlsx"].includes(e.format) && (e.encoding === undefined || e.encoding === "base64") && (e.format !== "xlsx" || e.encoding === "base64") && (e.filters === undefined || e.filters && Array.isArray(e.filters.employeeCodes) && e.filters.employeeCodes.every((code: unknown) => typeof code === "string") && Array.isArray(e.filters.departments) && e.filters.departments.every((department: unknown) => typeof department === "string") && typeof e.filters.from === "string" && typeof e.filters.to === "string"));
export const exportStore = createStore<ExportRecord[]>("roco-exports-v1", () => [], isExportList);

export const decisionCounts = (list: RoRequest[]) => ({
  pending: list.filter(r => r.status === "pending" && r.employeeCode !== CURRENT_USER.code).length,
  mine: list.filter(r => r.employeeCode === CURRENT_USER.code && r.status === "pending").length,
});
