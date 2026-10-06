import { jalaliToISO, normalizeDigits, validTime } from "../design/locale";
import { organizationPolicy } from "../design/policy";
import { workplaceDateISO, shift } from "./ledger";
import { dayCount, findOverlaps, type RequestType, type RoRequest } from "./store";

export type Draft = {
  type: RequestType; startDate: string; endDate: string; startTime: string; endTime: string;
  leaveKind: "paid" | "unpaid"; destination: string; eventRef: string; reason: string; attachments: string[];
};
export const requiredFields: Record<RequestType, ReadonlyArray<keyof Draft>> = {
  dailyLeave: ["startDate", "endDate", "leaveKind", "reason"],
  hourlyLeave: ["startDate", "startTime", "endTime", "reason"],
  mission: ["startDate", "startTime", "endTime", "destination", "reason"],
  overtime: ["startDate", "startTime", "endTime", "reason"],
  missingPunch: ["eventRef", "startTime", "reason"],
  correction: ["eventRef", "startTime", "endTime", "reason"],
};
export const typeHelp: Record<RequestType, string> = {
  dailyLeave: "برای یک یا چند روز کاری کامل.", hourlyLeave: "برای بخشی از ساعت شیفت در یک روز.",
  mission: "برای کار بیرون از محل با مقصد مشخص.", overtime: "برای کار خارج از ساعت شیفت.",
  missingPunch: "وقتی ورود یا خروج را ثبت نکرده‌اید.", correction: "وقتی ساعت ثبت‌شده نادرست است.",
};
const minutes = (t: string) => { const [h, m] = normalizeDigits(t).split(":").map(Number); return h * 60 + m; };
export const norm = (t: string) => normalizeDigits(t);

export type Checked = {
  errors: Partial<Record<keyof Draft | "balance", string>>;
  iso: { start: string | null; end: string | null };
  days: number; paidDays: number; overlapping: RoRequest[]; balanceAfter: number | undefined;
};
export function checkDraft(d: Draft, existing: RoRequest[], pendingDays: number, replacingId?: string, available?: number): Checked {
  const errors: Checked["errors"] = {};
  const today = workplaceDateISO();
  const need = requiredFields[d.type];
  const start = need.includes("startDate") ? jalaliToISO(d.startDate) : need.includes("eventRef") ? d.eventRef || null : null;
  const end = d.type === "dailyLeave" ? jalaliToISO(d.endDate) : start;
  const weekend = (iso: string) => organizationPolicy.weekendDays.includes(new Date(iso + "T12:00:00Z").getUTCDay());

  if (need.includes("startDate")) {
    if (!start) errors.startDate = "تاریخ معتبر وارد کنید؛ مثل ۱۴۰۵/۰۷/۱۴.";
    else if (start < today && d.type !== "overtime") errors.startDate = "تاریخ نمی‌تواند گذشته باشد.";
    else if (start < addDaysISO(today, -7) && d.type === "overtime") errors.startDate = "اضافه‌کار فقط تا ۷ روز گذشته قابل ثبت است.";
  }
  if (d.type === "dailyLeave") {
    if (!end) errors.endDate = "تاریخ پایان معتبر وارد کنید.";
    else if (start && end < start) errors.endDate = "تاریخ پایان باید بعد از شروع باشد.";
  }
  if (need.includes("eventRef")) {
    if (!d.eventRef) errors.eventRef = "روز مورد نظر را انتخاب کنید.";
    else if (d.eventRef > today) errors.eventRef = "روز آینده را نمی‌توان اصلاح کرد.";
  }
  const timed = need.includes("startTime");
  if (timed) {
    if (!validTime(d.startTime)) errors.startTime = "ساعت معتبر وارد کنید؛ مثل ۰۸:۳۰.";
    if (need.includes("endTime") && !validTime(d.endTime)) errors.endTime = "ساعت معتبر وارد کنید؛ مثل ۱۷:۰۰.";
    if (!errors.startTime && !errors.endTime && need.includes("endTime") && minutes(d.endTime) <= minutes(d.startTime)) errors.endTime = "ساعت پایان باید بعد از شروع باشد.";
  }
  if (d.type === "hourlyLeave" && !errors.startTime && !errors.endTime) {
    if (minutes(d.startTime) < shift.startMin || minutes(d.endTime) > shift.endMin) errors.startTime = `مرخصی ساعتی باید در بازه شیفت (${shift.start} تا ${shift.end}) باشد.`;
    if (start && weekend(start)) errors.startDate = "این روز تعطیل هفتگی است.";
  }
  if (d.type === "overtime" && !errors.startTime && !errors.endTime && minutes(d.endTime) - minutes(d.startTime) > 240) errors.endTime = "اضافه‌کار در هر روز حداکثر ۴ ساعت قابل ثبت است.";
  if (d.type === "mission" && !d.destination.trim()) errors.destination = "مقصد ماموریت را بنویسید.";
  if (d.reason.trim().length < 10) errors.reason = "توضیح را دست‌کم در ۱۰ نویسه بنویسید.";

  const days = d.type === "dailyLeave" && start && end && end >= start ? dayCount(start, end, organizationPolicy.weekendDays) : 0;
  if (d.type === "dailyLeave" && start && end && end >= start && days === 0) errors.endDate = "بازه انتخابی فقط شامل تعطیل هفتگی است.";
  const paidDays = d.type === "dailyLeave" && d.leaveKind === "paid" ? days : 0;
  const balanceAfter = available === undefined ? undefined : available - pendingDays - paidDays;
  if (paidDays > 0 && available === undefined) errors.balance = "مانده مرخصی ثبت نشده یا قابل خواندن نیست؛ برای ثبت مانده با منابع انسانی هماهنگ کنید یا مرخصی بدون حقوق را انتخاب کنید.";
  else if (paidDays > 0 && balanceAfter !== undefined && balanceAfter < 0) errors.balance = "مانده مرخصی کافی نیست. نوع مرخصی را «بدون حقوق» انتخاب یا بازه را کوتاه‌تر کنید.";

  const overlapping = start && end && !errors.startDate && !errors.endDate
    ? findOverlaps({ type: d.type, startDate: start, endDate: end, startTime: timed ? norm(d.startTime) : undefined, endTime: need.includes("endTime") ? norm(d.endTime) : undefined }, existing, replacingId) : [];
  return { errors, iso: { start, end }, days, paidDays, overlapping, balanceAfter };
}
export function addDaysISO(iso: string, n: number) { return new Date(Date.parse(iso + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10); }
export const ATTACHMENT_LIMIT = 5 * 1024 * 1024;
export const attachmentOk = (f: { name: string; size: number }) => /\.(pdf|png|jpe?g)$/i.test(f.name) && f.size <= ATTACHMENT_LIMIT;
