import { createStore } from "./store";
import { PersistenceFailure } from "./persistence";

export const ANNOUNCEMENT_KEY = "roco-announcement-draft-v1";
export type AnnouncementFields = { title: string; body: string; department: string };
export type AnnouncementDraft = AnnouncementFields & { version: 1; status: "draft"; savedAt: string | null };
const emptyDraft = (): AnnouncementDraft => ({ version: 1, status: "draft", title: "", body: "", department: "", savedAt: null });
const isDraft = (v: unknown): v is AnnouncementDraft => {
  const d = v as AnnouncementDraft;
  return !!d && d.version === 1 && d.status === "draft" && typeof d.title === "string" && d.title.length <= 120
    && typeof d.body === "string" && d.body.length <= 3000 && typeof d.department === "string" && d.department.length <= 120
    && (d.savedAt === null || typeof d.savedAt === "string" && Number.isFinite(Date.parse(d.savedAt)));
};
export const announcementStore = createStore(ANNOUNCEMENT_KEY, emptyDraft, isDraft);
export const announcementFields = (draft: AnnouncementDraft): AnnouncementFields => ({ title: draft.title, body: draft.body, department: draft.department });

/** Local draft only. There is no publication, notification or delivery operation. */
export function saveAnnouncementDraft(fields: AnnouncementFields, expected: AnnouncementDraft | null): AnnouncementDraft {
  const next = { title: fields.title.trim(), body: fields.body.trim(), department: fields.department };
  if (!next.title || next.title.length > 120 || !next.body || next.body.length > 3000 || next.department.length > 120)
    throw new PersistenceFailure("conflict", "عنوان و متن معتبر وارد کنید؛ پیش‌نویس ذخیره نشد.");
  const latest = announcementStore.refreshPersisted();
  // A write may have succeeded while read-back failed. An exact retry confirms the
  // existing draft without adding another write or inventing a send operation.
  if (latest.savedAt && JSON.stringify(announcementFields(latest)) === JSON.stringify(next)) return latest;
  if (JSON.stringify(latest) !== JSON.stringify(expected))
    throw new PersistenceFailure("conflict", "پیش‌نویس در این فاصله تغییر کرده است؛ تغییرهای شما نگه داشته شد. نسخه تازه را بررسی و دوباره ذخیره کنید.");
  const saved: AnnouncementDraft = { ...next, version: 1, status: "draft", savedAt: new Date().toISOString() };
  announcementStore.setPersisted(saved);
  return saved;
}
