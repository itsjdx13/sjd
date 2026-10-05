import { createStore, employeeStore } from "./store";
import { PersistenceFailure } from "./persistence";

/* HR-owned profile details that sit next to the shared employee list (browser-local demo data).
   Name, department, status and shift always come from the shared employee store; they are never copied here. */
export type HrProfile = { role: string; contract: string; skill: string; document: string; balanceBase: number };
export type HrData = { version: 1; profiles: Record<string, Partial<HrProfile>> };

/** Sample values carried over from the earlier hardcoded HR screen. They are labeled as sample data in the UI. */
const seedHr = (): HrData => ({
  version: 1,
  profiles: {
    "RG-1042": { role: "کارشناس محصول", contract: "تمام‌وقت • تا اسفند ۱۴۰۵", skill: "تحقیق محصول", document: "همه مدارک معتبر", balanceBase: 12.5 },
    "RG-1048": { role: "کارشناس عملیات", contract: "تمام‌وقت • تا دی ۱۴۰۵", skill: "عملیات میدانی", document: "مدرک هویتی تا ۲۱ روز دیگر", balanceBase: 8 },
    "RG-1051": { role: "کارشناس مالی", contract: "تمام‌وقت • تا خرداد ۱۴۰۶", skill: "حسابداری", document: "همه مدارک معتبر", balanceBase: 15 },
    "RG-1060": { role: "کارشناس فروش", contract: "آزمایشی • تا ۳۰ مهر", skill: "فروش سازمانی", document: "قرارداد تا ۲۴ روز دیگر", balanceBase: 6.5 },
  },
});
const textKeys = ["role", "contract", "skill", "document"] as const;
const isHrData = (v: unknown): v is HrData => {
  const d = v as HrData;
  return !!d && d.version === 1 && !!d.profiles && typeof d.profiles === "object" && !Array.isArray(d.profiles)
    && Object.values(d.profiles).every(p => !!p && typeof p === "object"
      && textKeys.every(k => p[k] === undefined || typeof p[k] === "string")
      && (p.balanceBase === undefined || Number.isFinite(p.balanceBase)));
};
export const hrStore = createStore<HrData>("roco-hr-v1", seedHr, isHrData);

export const profileOf = (data: HrData, code: string): Partial<HrProfile> => data.profiles[code] ?? {};
/** Undefined means no balance was ever recorded for this employee; the UI says so instead of inventing a number. */
export const leaveBalanceOf = (data: HrData, code: string): number | undefined => profileOf(data, code).balanceBase;

/** Strict profile save: the employee must still exist and the profile must be unchanged since it was read. */
export function saveProfile(code: string, next: Partial<Pick<HrProfile, "role" | "contract" | "skill" | "document">>, expected: Partial<HrProfile>) {
  if (!employeeStore.refreshPersisted().some(e => e.code === code)) throw new PersistenceFailure("conflict", "این کارمند دیگر در فهرست کارکنان نیست.");
  const data = hrStore.refreshPersisted();
  if (JSON.stringify(profileOf(data, code)) !== JSON.stringify(expected)) throw new PersistenceFailure("conflict", "پرونده در این فاصله تغییر کرده است؛ وضعیت تازه نمایش داده شد. تغییر شما ذخیره نشد.");
  hrStore.setPersisted({ ...data, profiles: { ...data.profiles, [code]: { ...profileOf(data, code), ...next } } });
}
