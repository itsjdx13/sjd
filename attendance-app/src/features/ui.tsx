import { useEffect, useId, useRef, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { isoToJalali, persianDigits } from "../design/locale";

export const fa = (value: string | number) => persianDigits(value).replace(/([۰-۹])[.]([۰-۹])/g, "$1٫$2");
const jalaliLong = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const jalaliDayMonth = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", day: "numeric", month: "long" });
const jalaliWeekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { timeZone: "UTC", weekday: "long" });
const noon = (iso: string) => new Date(iso + "T12:00:00Z");
export const weekdayOf = (iso: string) => jalaliWeekday.format(noon(iso));
export const longDate = (iso: string) => jalaliLong.format(noon(iso));
export const dayMonth = (iso: string) => jalaliDayMonth.format(noon(iso));
export const shortDate = (iso: string) => isoToJalali(iso);
export const dateTimeLabel = (iso: string) => new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export const hhmm = (minutes: number) => fa(`${Math.floor(minutes / 60)}:${String(Math.round(minutes % 60)).padStart(2, "0")}`);

/** Modal bottom sheet (mobile) / centered dialog or side drawer (wide). Closes via button, Escape, backdrop and a downward swipe on the handle. */
export function Sheet({ open, onClose, title, eyebrow, children, triggerRef, variant = "sheet" }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode;
  triggerRef?: RefObject<HTMLElement | null>; variant?: "sheet" | "drawer";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const drag = useRef<{ y: number; sheet: HTMLElement } | null>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  const close = () => { onClose(); window.setTimeout(() => triggerRef?.current?.focus(), 0); };
  const down = (e: PointerEvent<HTMLElement>) => {
    const sheet = e.currentTarget.closest<HTMLElement>(".dialog-sheet");
    if (!sheet) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, sheet };
  };
  const move = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const delta = Math.max(0, e.clientY - drag.current.y);
    drag.current.sheet.style.setProperty("--sheet-drag", `${delta}px`);
  };
  const up = (e: PointerEvent<HTMLElement>) => {
    if (!drag.current) return;
    const delta = e.clientY - drag.current.y;
    drag.current.sheet.style.removeProperty("--sheet-drag");
    drag.current = null;
    if (delta > 80) close();
  };
  const trapFocus = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab" || !open) return;
    const dialog = e.currentTarget;
    const controls = [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]')]
      .filter(element => element.tabIndex >= 0 && !element.matches(":disabled") && !element.closest("[inert]") && element.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { e.preventDefault(); dialog.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!dialog.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
  };
  return <dialog ref={ref} className={`app-dialog ${variant === "drawer" ? "as-drawer" : ""}`} aria-labelledby={titleId}
    onKeyDown={trapFocus}
    onCancel={e => { e.preventDefault(); close(); }}
    onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="dialog-sheet">
      <span className="sheet-handle" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current?.sheet.style.removeProperty("--sheet-drag"); drag.current = null; }} />
      <header><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2 id={titleId}>{title}</h2></div>
        <button type="button" className="icon-button" aria-label="بستن" onClick={close}><Cross2Icon /></button></header>
      {open && children}
    </div>
  </dialog>;
}

/** WAI-ARIA tabs with roving tabindex and arrow-key support (RTL aware). Pair with panelProps() on the controlled region. */
export function Tabs<T extends string>({ tabs, value, onChange, label, idBase, className = "" }: {
  tabs: ReadonlyArray<readonly [T, string]>; value: T; onChange: (v: T) => void; label: string; idBase: string; className?: string;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex(t => t[0] === value);
    const rtl = document.documentElement.dir === "rtl";
    let n = i;
    if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) n = (i + 1) % tabs.length;
    else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") n = 0; else if (e.key === "End") n = tabs.length - 1; else return;
    e.preventDefault(); onChange(tabs[n][0]);
    requestAnimationFrame(() => document.getElementById(`${idBase}-tab-${tabs[n][0]}`)?.focus());
  };
  return <div role="tablist" aria-label={label} className={`tabs ${className}`} onKeyDown={onKey}>
    {tabs.map(([key, text]) => <button type="button" role="tab" key={key} id={`${idBase}-tab-${key}`} aria-selected={value === key}
      aria-controls={`${idBase}-panel`} tabIndex={value === key ? 0 : -1} className={value === key ? "active" : ""} onClick={() => onChange(key)}>{text}</button>)}
  </div>;
}
export const panelProps = (idBase: string, value: string) => ({ role: "tabpanel" as const, id: `${idBase}-panel`, "aria-labelledby": `${idBase}-tab-${value}`, tabIndex: 0 });

/** Mutually exclusive filter buttons (not tabs: they change what is shown, not which panel is active). */
export function Segmented<T extends string>({ options, value, onChange, label, className = "" }: { options: ReadonlyArray<readonly [T, string]>; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return <div role="group" aria-label={label} className={`segment ${className}`}>{options.map(([k, text]) => <button type="button" key={k} aria-pressed={value === k} className={value === k ? "active" : ""} onClick={() => onChange(k)}>{text}</button>)}</div>;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty-state">{icon}<h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return <div className="skeleton-list" role="status" aria-label="در حال بارگذاری"><span className="sr-only">در حال بارگذاری…</span>
    {Array.from({ length: rows }, (_, i) => <span key={i} className="skeleton-row" aria-hidden="true" />)}</div>;
}
export function Banner({ tone, title, children, role = "status" }: { tone: "good" | "warn" | "bad" | "neutral"; title?: string; children?: ReactNode; role?: "status" | "alert" }) {
  return <div className={`state-banner ${tone}`} role={role}><div>{title && <strong>{title}</strong>}{children && <p>{children}</p>}</div></div>;
}
const subscribeOnline = (cb: () => void) => { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; };
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine);
export function useMedia(query: string) {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(query); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches);
}
