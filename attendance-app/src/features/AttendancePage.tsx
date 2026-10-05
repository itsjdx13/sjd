import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon, FileTextIcon } from "@radix-ui/react-icons";
import { Badge } from "../design/components";
import type { StatusKey } from "../design/status";
import { jalaliParts } from "../design/locale";
import { monthPeriod, recordFor, totals, weekPeriod, type DayRecord, type DayState } from "./attendance";
import { safeLedger, shift, useLedgerVersion } from "./ledger";
import { requestStore } from "./store";
import { Banner, EmptyState, Sheet, Skeleton, Tabs, panelProps, dayMonth, fa, hhmm, longDate, shortDate, useOnline, weekdayOf } from "./ui";

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const stateBadge: Partial<Record<DayState, StatusKey>> = { complete: "onTime", late: "late", overtime: "overtime", missingPunch: "missingPunch", correction: "returned" };
const stateLabel: Partial<Record<DayState, string>> = { off: "تعطیل هفتگی", future: "برنامه‌ریزی‌شده", noPunch: "ثبت نشده", open: "در حال کار" };
const stateDetail: Record<DayState, string> = {
  complete: "ورود و خروج کامل ثبت شده است.", late: "ورود پس از شروع شیفت ثبت شده است.", overtime: "خروج پس از پایان شیفت ثبت شده است.",
  missingPunch: "برای این روز خروج ثبت نشده است. برای محاسبه کارکرد، درخواست اصلاح ثبت کنید.", correction: "مدیر درخواست اصلاح را برای ویرایش برگردانده است.",
  off: "تعطیل هفتگی؛ کارکردی انتظار نمی‌رود.", future: "این روز هنوز نرسیده است.", noPunch: "هنوز ورودی ثبت نشده است.", open: "ورود ثبت شده و منتظر ثبت خروج هستید.",
};

function Status({ record }: { record: DayRecord }) {
  const key = stateBadge[record.state];
  if (key) return <Badge status={key} />;
  return <span className={`ds-badge ds-tone-${record.state === "open" ? "success" : "neutral"}`}>{stateLabel[record.state]}</span>;
}

export default function AttendancePage({ go }: { go: (p: string) => void }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  // Each mode keeps its own range so switching tabs never changes the other view.
  const [offsets, setOffsets] = useState({ week: 0, month: 0 });
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const online = useOnline();
  const version = useLedgerVersion(); void version;
  const requests = requestStore.use();
  const ledger = safeLedger();
  const offset = offsets[mode];
  const period = mode === "week" ? weekPeriod(offset) : monthPeriod(offset);
  const records = period.dates.map(d => recordFor(d, ledger, requests));
  const t = totals(records);
  const none = records.every(r => r.state === "future");
  const label = mode === "week"
    ? `${dayMonth(period.start)} تا ${dayMonth(period.end)}`
    : (() => { const p = jalaliParts(new Date(period.start + "T12:00:00Z")); return `${monthNames[p.month - 1]} ${fa(p.year)}`; })();

  useEffect(() => { setLoading(true); const id = window.setTimeout(() => setLoading(false), 220); return () => window.clearTimeout(id); }, [mode, offset]);
  const move = (delta: number) => setOffsets(o => ({ ...o, [mode]: o[mode] + delta }));
  const open = (date: string, el: HTMLElement) => { trigger.current = el; setDetail(date); };
  const current = detail ? records.find(r => r.date === detail) ?? recordFor(detail, ledger, requests) : null;

  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>کارکرد من</h1><p>تاریخچه ورود، خروج و استثناهای حضور</p></div>
      <button type="button" className="primary-button compact" onClick={() => go("/clock")}><ClockIcon /> ثبت ورود و خروج</button></header>
    <section className="card attendance-card">
      <div className="toolbar">
        <Tabs idBase="att" label="بازه گزارش" value={mode} onChange={setMode} tabs={[["week", "هفتگی"], ["month", "ماهانه"]] as const} className="segment" />
        <div className="period-nav">
          <button type="button" aria-label={mode === "week" ? "هفته قبل" : "ماه قبل"} onClick={() => move(-1)}><ChevronRightIcon /></button>
          <strong aria-live="polite">{label}</strong>
          <button type="button" aria-label={mode === "week" ? "هفته بعد" : "ماه بعد"} onClick={() => move(1)}><ChevronLeftIcon /></button>
          <button type="button" className="link-button" disabled={offset === 0} onClick={() => setOffsets(o => ({ ...o, [mode]: 0 }))}>{mode === "week" ? "این هفته" : "این ماه"}</button>
        </div>
      </div>
      <div {...panelProps("att", mode)} className="tab-panel">
      {!online && <Banner tone="warn" title="اتصال قطع است">رکوردها از آخرین داده ذخیره‌شده در این دستگاه نمایش داده می‌شوند؛ ثبت‌های آفلاین در صف می‌مانند.</Banner>}
      <div className="summary-cards" aria-label={`خلاصه ${mode === "week" ? "هفته" : "ماه"}`}>
        <div><strong>{hhmm(t.worked)}</strong><span>کارکرد از {hhmm(t.expected)}</span></div>
        <div><strong>{hhmm(t.overtime)}</strong><span>اضافه‌کار</span></div>
        <div><strong>{hhmm(t.late)}</strong><span>تأخیر</span></div>
        <div><strong>{fa(t.exceptions)}</strong><span>نیازمند اقدام</span></div>
      </div>
      {loading ? <Skeleton rows={mode === "week" ? 5 : 8} />
        : none ? <EmptyState icon={<FileTextIcon />} title="هنوز رکوردی وجود ندارد">این بازه در آینده است و پس از رسیدن آن، ورود و خروج‌ها اینجا نمایش داده می‌شوند.</EmptyState>
        : <div className="attendance-table" role="table" aria-label={`رکوردهای حضور ${label}`}>
          <div className="table-row table-head" role="row"><span role="columnheader">تاریخ</span><span role="columnheader">ورود</span><span role="columnheader">خروج</span><span role="columnheader">وضعیت</span><span role="columnheader"><span className="sr-only">جزئیات</span></span></div>
          {records.map(r => <div className={`table-row ${r.state === "off" || r.state === "future" ? "muted" : ""}`} role="row" key={r.date} onClick={e => open(r.date, e.currentTarget.querySelector("button")!)}>
            <span role="cell"><button type="button" className="row-button" onClick={e => { e.stopPropagation(); open(r.date, e.currentTarget); }} aria-label={`جزئیات ${longDate(r.date)}`}>
              {mode === "week" ? longDate(r.date).replace(/ d{4}$/, "").replace(/ [۰-۹]{4}$/, "") : `${weekdayOf(r.date)} ${dayMonth(r.date)}`}</button></span>
            <span role="cell" data-label="ورود"><bdi dir="ltr">{r.in ? fa(r.in) : "—"}</bdi></span><span role="cell" data-label="خروج"><bdi dir="ltr">{r.out ? fa(r.out) : "—"}</bdi></span>
            <span role="cell"><Status record={r} />{r.pendingSync && <small className="inline-note"> • منتظر همگام‌سازی</small>}</span><ChevronLeftIcon aria-hidden="true" /></div>)}
        </div>}
      </div>
    </section>
    <Sheet open={!!current} onClose={() => setDetail(null)} title={current ? longDate(current.date) : ""} eyebrow="جزئیات حضور" triggerRef={trigger} variant="drawer">
      {current && <>
        <div className="drawer-status"><Status record={current} /></div>
        <p className="muted-text">{stateDetail[current.state]}</p>
        <dl className="details-list">
          <div><dt>شیفت</dt><dd>{shift.name} • <bdi>{fa(shift.start)} تا {fa(shift.end)}</bdi></dd></div>
          <div><dt>ورود</dt><dd dir="ltr">{current.in ?? "—"}</dd></div>
          <div><dt>خروج</dt><dd dir="ltr">{current.out ?? "—"}</dd></div>
          <div><dt>کارکرد</dt><dd>{hhmm(current.workedMin)} ساعت</dd></div>
          <div><dt>تأخیر</dt><dd>{current.lateMin ? `${fa(current.lateMin)} دقیقه` : "ندارد"}</dd></div>
          <div><dt>اضافه‌کار</dt><dd>{current.overtimeMin ? `${fa(current.overtimeMin)} دقیقه` : "ندارد"}</dd></div>
          <div><dt>محل</dt><dd>{current.location ?? "—"}</dd></div>
          <div><dt>منبع</dt><dd>{current.source === "ledger" ? "ثبت‌شده روی این دستگاه" : "نمونه برنامه‌ریزی‌شده"}</dd></div>
          {current.note && <div><dt>یادداشت</dt><dd>{current.note}</dd></div>}
        </dl>
        {["missingPunch", "correction", "late"].includes(current.state) && <button type="button" className="primary-button" onClick={() => go(`/requests?new=correction&date=${current.date}`)}>
          {current.state === "correction" ? "ویرایش درخواست اصلاح" : "ثبت درخواست اصلاح"}</button>}
        <p className="muted-text small">{shortDate(current.date)}</p>
      </>}
    </Sheet>
  </>;
}
