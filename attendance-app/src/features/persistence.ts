export type PersistenceFailureKind = "unavailable" | "corrupt" | "write" | "verification" | "conflict";
export class PersistenceFailure extends Error {
  constructor(public kind: PersistenceFailureKind, message: string) { super(message); this.name = "PersistenceFailure"; }
}
export function readStrict<T>(key: string, seed: () => T, validate: (value: unknown) => value is T): T {
  let raw: string | null;
  try { raw = localStorage.getItem(key); }
  catch { throw new PersistenceFailure("unavailable", "خواندن حافظه مرورگر ممکن نیست؛ دسترسی ذخیره‌سازی را بررسی کنید."); }
  if (raw === null) return seed();
  try { const value: unknown = JSON.parse(raw); if (validate(value)) return value; }
  catch { /* Keep unreadable bytes untouched. */ }
  throw new PersistenceFailure("corrupt", "داده ذخیره‌شده قابل خواندن نیست؛ برای جلوگیری از حذف اطلاعات، ذخیره متوقف شد.");
}
export function writeConfirmed(key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  try { localStorage.setItem(key, serialized); }
  catch { throw new PersistenceFailure("write", "ذخیره انجام نشد؛ فضای مرورگر یا مجوز ذخیره‌سازی را بررسی و دوباره تلاش کنید."); }
  let saved: string | null;
  try { saved = localStorage.getItem(key); }
  catch { throw new PersistenceFailure("verification", "نتیجه ذخیره قابل تأیید نیست؛ پس از بازگشت دسترسی، وضعیت ذخیره‌شده را بررسی و دوباره تلاش کنید."); }
  if (saved !== serialized) throw new PersistenceFailure("verification", "ذخیره تأیید نشد؛ داده جدید جایگزین نمای فعلی نشده است. دوباره تلاش کنید.");
}
export const persistenceMessage = (error: unknown) => error instanceof PersistenceFailure ? error.message : "ذخیره انجام نشد؛ دوباره تلاش کنید.";
