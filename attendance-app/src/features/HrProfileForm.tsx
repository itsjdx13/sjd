import { useRef, useState, type FormEvent } from "react";
import { hrStore, profileOf, saveProfile, type HrProfile } from "./hr";
import { PersistenceFailure, persistenceMessage } from "./persistence";

type EditableKey = "role" | "contract" | "skill" | "document";
type Draft = Record<EditableKey, string>;
const fields: Array<[EditableKey, string]> = [["role", "عنوان شغلی"], ["contract", "قرارداد"], ["skill", "مهارت شاخص"], ["document", "یادداشت مدارک"]];
const MAX_LENGTH = 120;
const toDraft = (profile: Partial<HrProfile>): Draft => ({ role: profile.role ?? "", contract: profile.contract ?? "", skill: profile.skill ?? "", document: profile.document ?? "" });

/** Edits only the HR-owned profile text. Name, department, status, shift and the leave balance are never touched here. */
export function HrProfileForm({ code, onSaved, onCancel }: { code: string; onSaved: () => void; onCancel: () => void }) {
  const baseline = useRef<Partial<HrProfile>>(profileOf(hrStore.get(), code)); // the saved profile this edit started from
  const [draft, setDraft] = useState<Draft>(() => toDraft(baseline.current));
  const [touched, setTouched] = useState(false), [saving, setSaving] = useState(false), [saveError, setSaveError] = useState("");
  const errors: Partial<Record<EditableKey, string>> = {};
  for (const [key, label] of fields) if (draft[key].trim().length > MAX_LENGTH) errors[key] = `${label} حداکثر ${MAX_LENGTH} نویسه باشد.`;
  const submit = (event: FormEvent) => {
    event.preventDefault(); setTouched(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true); setSaveError("");
    const next = Object.fromEntries(fields.map(([key]) => [key, draft[key].trim() || undefined])) as Partial<Pick<HrProfile, EditableKey>>;
    try { saveProfile(code, next, baseline.current); onSaved(); }
    catch (error) {
      if (error instanceof PersistenceFailure && error.kind === "conflict") {
        // Keep only the fields this user changed; everything else follows the latest saved profile. The user saves again deliberately.
        const latest = profileOf(hrStore.get(), code), old = toDraft(baseline.current), fresh = toDraft(latest);
        setDraft(current => Object.fromEntries(fields.map(([key]) => [key, current[key] !== old[key] ? current[key] : fresh[key]])) as Draft);
        baseline.current = latest;
      }
      setSaveError(persistenceMessage(error)); setSaving(false);
    }
  };
  return <form className="request-form" onSubmit={submit} noValidate>
    <p className="muted-text">این جزئیات نمونه محلی‌اند و فقط در همین مرورگر ذخیره می‌شوند. نام، واحد، وضعیت و شیفت از فهرست مشترک کارکنان می‌آیند و در این فرم قابل ویرایش نیستند؛ مانده مرخصی هم تغییر نمی‌کند.</p>
    {fields.map(([key, label]) => <label key={key}>{label}
      <input value={draft[key]} aria-invalid={touched && !!errors[key]} aria-describedby={touched && errors[key] ? `hr-profile-${key}-error` : undefined} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
      {touched && errors[key] && <small className="ds-error" id={`hr-profile-${key}-error`} role="alert">{errors[key]}</small>}</label>)}
    {saveError && <p className="ds-error" role="alert">{saveError}</p>}
    <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>انصراف</button>
      <button className="primary-button" disabled={saving}>{saveError ? "تلاش دوباره برای ذخیره" : "ذخیره پرونده"}</button></div>
  </form>;
}
