import { useId, useRef, useState, type FormEvent } from "react";
import { announcementFields, announcementStore, saveAnnouncementDraft, type AnnouncementDraft, type AnnouncementFields } from "./announcements";
import { employeeStore } from "./store";
import { PersistenceFailure, persistenceMessage } from "./persistence";
import { dateTimeLabel, fa } from "./ui";

export function AnnouncementPreview() {
  const employees = employeeStore.use(), employeeProblem = employeeStore.useProblem();
  const stored = announcementStore.use(), storageProblem = announcementStore.useProblem();
  const baseline = useRef<AnnouncementDraft | null>(null);
  const initialized = useRef(false);
  if (!initialized.current) {
    initialized.current = true;
    try { baseline.current = announcementStore.getPersisted(); } catch { /* unreadable data remains untouched */ }
  }
  const [draft, setDraft] = useState<AnnouncementFields>(() => announcementFields(baseline.current ?? stored));
  const [touched, setTouched] = useState(false), [saveError, setSaveError] = useState(""), [notice, setNotice] = useState("");
  const form = useRef<HTMLFormElement>(null), id = useId();
  const departments = [...new Set(employees.map(e => e.department))];
  const recipients = employees.filter(e => e.status === "active" && (!draft.department || e.department === draft.department));
  const errors = {
    title: !draft.title.trim() || draft.title.trim().length > 120 ? "عنوان را بین ۱ تا ۱۲۰ نویسه بنویسید." : "",
    body: !draft.body.trim() || draft.body.trim().length > 3000 ? "متن را بین ۱ تا ۳۰۰۰ نویسه بنویسید." : "",
    department: draft.department && !departments.includes(draft.department) ? "واحد انتخاب‌شده دیگر در فهرست کارکنان نیست؛ مخاطب دیگری انتخاب کنید." : "",
  };
  const edit = (key: keyof AnnouncementFields, value: string) => { setDraft(d => ({ ...d, [key]: value })); setNotice(""); };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setTouched(true); setNotice("");
    if (Object.values(errors).some(Boolean)) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    try {
      // Refresh audience records too, so a stale tab cannot silently use a removed department.
      const latestEmployees = employeeStore.refreshPersisted();
      if (draft.department && !latestEmployees.some(e => e.department === draft.department))
        throw new PersistenceFailure("conflict", "واحد انتخاب‌شده دیگر در فهرست کارکنان نیست؛ مخاطب دیگری انتخاب کنید.");
      baseline.current = saveAnnouncementDraft(draft, baseline.current);
      setSaveError(""); setNotice("پیش‌نویس فقط در همین مرورگر ذخیره شد؛ اطلاعیه ارسال نشده است.");
    } catch (error) {
      if (error instanceof PersistenceFailure && error.kind === "conflict") {
        try {
          const latest = announcementStore.getPersisted(), old = baseline.current;
          if (old) setDraft(current => ({
            title: current.title !== old.title ? current.title : latest.title,
            body: current.body !== old.body ? current.body : latest.body,
            department: current.department !== old.department ? current.department : latest.department,
          }));
          baseline.current = latest;
        } catch { /* retain all input if even the latest draft cannot be read */ }
      }
      setSaveError(persistenceMessage(error));
    }
  };
  return <div className="announcement-workspace">
    <form className="request-form" ref={form} onSubmit={submit} noValidate>
      <p className="muted-text">فقط پیش‌نویس و پیش‌نمایش محلی است. هیچ پیام، اعلان یا ایمیلی برای کارکنان ارسال نمی‌شود.</p>
      <label>عنوان اطلاعیه<input aria-label="عنوان اطلاعیه" value={draft.title} aria-invalid={touched && !!errors.title} aria-describedby={touched && errors.title ? `${id}-title` : undefined} onChange={e => edit("title", e.target.value)} />
        {touched && errors.title && <small id={`${id}-title`} className="ds-error" role="alert">{errors.title}</small>}</label>
      <label>متن اطلاعیه<textarea aria-label="متن اطلاعیه" rows={5} value={draft.body} aria-invalid={touched && !!errors.body} aria-describedby={touched && errors.body ? `${id}-body` : undefined} onChange={e => edit("body", e.target.value)} />
        {touched && errors.body && <small id={`${id}-body`} className="ds-error" role="alert">{errors.body}</small>}</label>
      <label>مخاطب پیشنهادی<select aria-label="مخاطب پیشنهادی" value={draft.department} aria-invalid={touched && !!errors.department} aria-describedby={touched && errors.department ? `${id}-department` : undefined} onChange={e => edit("department", e.target.value)}>
        <option value="">همه کارکنان فعال</option>{departments.map(d => <option key={d} value={d}>واحد {d}</option>)}
        {draft.department && !departments.includes(draft.department) && <option value={draft.department}>واحد حذف‌شده: {draft.department}</option>}</select>
        {touched && errors.department && <small id={`${id}-department`} className="ds-error" role="alert">{errors.department}</small>}</label>
      {(saveError || storageProblem || employeeProblem) && <p className="ds-error" role="alert">{saveError || storageProblem || employeeProblem}</p>}
      <button className="primary-button">{saveError ? "تلاش دوباره برای ذخیره پیش‌نویس" : "ذخیره پیش‌نویس محلی"}</button>
      {stored.savedAt && <p className="muted-text">آخرین ذخیره محلی: {dateTimeLabel(stored.savedAt)}</p>}
      <div className="sr-live" aria-live="polite">{notice}</div>
    </form>
    <section className="card announcement-preview" aria-label="پیش‌نمایش محلی اطلاعیه">
      <span className="status-pill warn">ارسال نشده</span>
      <h3>{draft.title.trim() || "عنوان اطلاعیه شما"}</h3>
      <p className="announcement-body">{draft.body.trim() || "متن اطلاعیه اینجا نمایش داده می‌شود."}</p>
      <p className="muted-text">مخاطب پیشنهادی: {draft.department ? `واحد ${draft.department}` : "همه کارکنان فعال"} • {employeeProblem ? "تعداد قابل خواندن نیست" : `${fa(recipients.length)} نفر`}</p>
      {!employeeProblem && recipients.length === 0 && <p className="muted-text">کارمند فعالی در این گروه وجود ندارد.</p>}
      <p className="muted-text">این نمای محلی، رسید ارسال یا آمار مشاهده نیست.</p>
    </section>
  </div>;
}
