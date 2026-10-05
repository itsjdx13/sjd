import { useCallback, useEffect, useRef, useState } from "react";
import { CameraIcon, CheckCircledIcon, ClockIcon, CrossCircledIcon, LockClosedIcon, ReloadIcon, TargetIcon } from "@radix-ui/react-icons";
import jsQR from "jsqr";
import { organizationPolicy } from "../design/policy";
import { ledgerKey, readClockLedger, shift, todayStatus, writeClockLedger, eventDate, eventTime, type ClockEvent, type ClockLedger, type ClockMethod, useLedgerVersion } from "./ledger";
import { distanceMeters, getWorkplace, qrErrorText, verifyQrPayload } from "./qr";
import { Banner, Sheet, fa, useOnline } from "./ui";

type Flow =
  | { s: "idle" } | { s: "gps-permission" } | { s: "gps-accuracy" }
  | { s: "gps-low"; accuracy: number } | { s: "gps-outside"; distance: number; accuracy: number }
  | { s: "gps-denied" } | { s: "gps-unavailable"; timeout: boolean }
  | { s: "qr-starting" } | { s: "qr-scanning"; message?: string } | { s: "qr-denied" } | { s: "qr-unavailable" }
  | { s: "confirm"; method: "gps" | "qr"; location?: ClockEvent["location"]; qr?: ClockEvent["qr"] }
  | { s: "duplicate" };

const methodLabel: Record<ClockMethod, string> = { gps: "موقعیت مکانی", qr: "اسکن QR محل کار", offline: "ثبت موقت آفلاین" };
const fmtMeters = (m: number) => `${fa(Math.round(m))} متر`;

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id); }, []);
  return now;
}

export function Receipt({ event, onClose }: { event: ClockEvent; onClose?: () => void }) {
  const wp = getWorkplace();
  const place = event.method === "offline" ? "تأیید نشده — پس از اتصال بررسی می‌شود" : event.method === "qr" ? `${wp.name} • از طریق کد QR` : event.location ? `${wp.name} • ${fmtMeters(event.location.distance)} از مرکز محل کار` : "—";
  return <div className="receipt" role="status"><span className="receipt-check"><CheckCircledIcon /></span>
    <h2>{event.action === "in" ? "ورود ثبت شد" : "خروج ثبت شد"}</h2>
    <p>{event.state === "pending" ? "این ثبت روی همین دستگاه ذخیره شده و منتظر تأیید سازمان است." : "رسید نمایشی روی همین مرورگر ذخیره شد؛ به سازمان ارسال نشده است."}</p>
    <dl>
      <div><dt>زمان رویداد</dt><dd>{eventDate(event.time)} • {eventTime(event.time)}</dd></div>
      <div><dt>روش</dt><dd>{methodLabel[event.method]}</dd></div>
      <div><dt>محل</dt><dd>{place}</dd></div>
      {event.location && <div><dt>دقت موقعیت</dt><dd>±{fmtMeters(event.location.accuracy)}</dd></div>}
      <div><dt>شیفت</dt><dd>{shift.name} • <bdi>{fa(shift.start)} تا {fa(shift.end)}</bdi></dd></div>
      <div><dt>شناسه رویداد</dt><dd dir="ltr" style={{ overflowWrap: "anywhere" }}>{event.id}</dd></div>
    </dl>{onClose && <button type="button" className="secondary-button" onClick={onClose}>بازگشت به ثبت حضور</button>}</div>;
}

export default function ClockPage() {
  const version = useLedgerVersion(); void version;
  const online = useOnline();
  const now = useNow();
  const wp = getWorkplace();
  const [ledger, setLedger] = useState<ClockLedger>(() => { try { return readClockLedger(); } catch { return { events: [] }; } });
  const [error, setError] = useState(() => { try { readClockLedger(); return ""; } catch (err) { return (err as Error).message; } });
  const [flow, setFlow] = useState<Flow>({ s: "idle" });
  const [receipt, setReceipt] = useState<ClockEvent | null>(null);
  const [viewReceipt, setViewReceipt] = useState<ClockEvent | null>(null);
  const [announce, setAnnounce] = useState("");
  const lock = useRef(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);
  const receiptTrigger = useRef<HTMLElement | null>(null);

  const today = todayStatus(ledger);
  const pending = ledger.events.filter(e => e.state === "pending");
  const last = ledger.events.at(-1);
  const action: "in" | "out" = today.last ? (today.last.action === "in" ? "out" : "in") : "in";
  const actionText = action === "in" ? "ورود" : "خروج";

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);
  useEffect(() => stopCamera, [stopCamera]);
  useEffect(() => {
    const update = (event: StorageEvent) => { if (event.key !== ledgerKey) return; try { setLedger(readClockLedger()); } catch (err) { setError((err as Error).message); } };
    window.addEventListener("storage", update); return () => window.removeEventListener("storage", update);
  }, []);
  useEffect(() => { setAnnounce(online ? "" : "اتصال قطع شد؛ ثبت موقت آفلاین در دسترس است."); }, [online]);
  const reset = () => { stopCamera(); setFlow({ s: "idle" }); };

  const save = (next: ClockLedger) => {
    try { writeClockLedger(next); setLedger(next); return true; }
    catch { setError("فضای ذخیره‌سازی در دسترس نیست. ثبت انجام نشد؛ دوباره تلاش کنید."); return false; }
  };
  const record = (method: ClockMethod, extra: Partial<ClockEvent> = {}) => {
    if (error || lock.current) return;
    lock.current = true;
    try {
      const current = readClockLedger(); const latest = current.events.at(-1);
      if (latest && Date.now() - Date.parse(latest.time) < organizationPolicy.duplicateWindowSeconds * 1000) {
        stopCamera(); setFlow({ s: "duplicate" }); setAnnounce("برای جلوگیری از ثبت تکراری، حداقل ۳۰ ثانیه صبر کنید."); return;
      }
      const currentToday = todayStatus(current);
      const nextAction: "in" | "out" = currentToday.last ? (currentToday.last.action === "in" ? "out" : "in") : "in";
      const event: ClockEvent = { id: crypto.randomUUID(), action: nextAction, time: new Date().toISOString(), method, state: method === "offline" ? "pending" : "local", ...extra };
      if (save({ events: [...current.events, event] })) {
        stopCamera();
        if (method === "offline") { setFlow({ s: "idle" }); setAnnounce("ثبت موقت روی همین مرورگر ذخیره شد؛ هنوز به سازمان ارسال نشده است."); }
        else { setReceipt(event); setFlow({ s: "idle" }); setAnnounce(`${nextAction === "in" ? "ورود" : "خروج"} ثبت شد.`); }
      }
    } catch (err) { setError((err as Error).message); }
    finally { lock.current = false; }
  };

  /* ---- GPS: nothing is requested until this runs ---- */
  const startGps = async () => {
    stopCamera(); setReceipt(null);
    if (!("geolocation" in navigator)) { setFlow({ s: "gps-unavailable", timeout: false }); return; }
    try { const status = await navigator.permissions?.query({ name: "geolocation" }); if (status?.state === "denied") { setFlow({ s: "gps-denied" }); return; } } catch { /* permission query unsupported */ }
    setFlow({ s: "gps-permission" });
    navigator.geolocation.getCurrentPosition(pos => {
      setFlow({ s: "gps-accuracy" });
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      window.setTimeout(() => {
        if (accuracy > wp.maxAccuracy) { setFlow({ s: "gps-low", accuracy }); return; }
        const distance = distanceMeters({ lat, lng }, wp);
        if (distance > wp.radius) { setFlow({ s: "gps-outside", distance, accuracy }); return; }
        setFlow({ s: "confirm", method: "gps", location: { lat, lng, accuracy, distance } });
      }, 350);
    }, err => setFlow(err.code === err.PERMISSION_DENIED ? { s: "gps-denied" } : { s: "gps-unavailable", timeout: err.code === err.TIMEOUT }),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  /* ---- QR: scans the rotating code shown on the workplace display ---- */
  const startQr = async () => {
    stopCamera(); setReceipt(null);
    if (!navigator.mediaDevices?.getUserMedia) { setFlow({ s: "qr-unavailable" }); return; }
    setFlow({ s: "qr-starting" });
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      stream.current = media; setFlow({ s: "qr-scanning" });
    } catch (err) {
      const name = (err as DOMException).name;
      setFlow(name === "NotAllowedError" || name === "SecurityError" ? { s: "qr-denied" } : { s: "qr-unavailable" });
    }
  };
  useEffect(() => {
    if (flow.s !== "qr-scanning" || !stream.current || !video.current) return;
    const el = video.current; el.srcObject = stream.current; void el.play().catch(() => {});
    const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let busy = false, lastTick = 0;
    const tick = (t: number) => {
      raf.current = requestAnimationFrame(tick);
      if (busy || t - lastTick < 150 || el.readyState < 2 || !el.videoWidth) return;
      lastTick = t; busy = true;
      const scale = Math.min(1, 640 / el.videoWidth); canvas.width = el.videoWidth * scale; canvas.height = el.videoHeight * scale;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "dontInvert" });
      if (!code) { busy = false; return; }
      verifyQrPayload(code.data).then(result => {
        if (result.ok) { stopCamera(); setFlow({ s: "confirm", method: "qr", qr: { site: result.site, window: result.window } }); }
        else { setFlow({ s: "qr-scanning", message: qrErrorText[result.reason] }); setAnnounce(qrErrorText[result.reason]); busy = false; }
      });
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [flow.s]);

  const reviewLocally = () => {
    if (!online || error || lock.current) return; lock.current = true;
    try {
      const current = readClockLedger(); const items = current.events.filter(e => e.state === "pending"); if (!items.length) { setLedger(current); return; }
      const next = { events: current.events.map(e => e.state === "pending" ? { ...e, state: "local" as const } : e) };
      if (save(next)) { setReceipt(next.events.find(e => e.id === items.at(-1)!.id)!); setAnnounce("ثبت‌ها در سابقه نمایشی ذخیره شدند؛ به سرور ارسال نشده‌اند."); }
    } catch (err) { setError((err as Error).message); } finally { lock.current = false; }
  };

  const clockNow = new Intl.DateTimeFormat("fa-IR", { timeZone: organizationPolicy.workplaceTimeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  const dateNow = new Intl.DateTimeFormat("fa-IR", { timeZone: organizationPolicy.workplaceTimeZone, dateStyle: "full" }).format(now);
  const blocked = !!error || pending.length > 0;
  const busyFlow = ["gps-permission", "gps-accuracy", "qr-starting"].includes(flow.s);

  const primaryChoices = <div className="method-choices">
    <button type="button" className="primary-button large" onClick={startGps} disabled={blocked || busyFlow || !online}><TargetIcon /> ثبت {actionText} با موقعیت مکانی</button>
    <button type="button" className="secondary-button large" onClick={startQr} disabled={blocked || busyFlow || !online}><CameraIcon /> ثبت {actionText} با اسکن QR محل کار</button>
    <small>دسترسی به موقعیت یا دوربین فقط پس از انتخاب شما درخواست می‌شود.</small>
  </div>;

  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>{receipt ? "رسید ثبت حضور" : `ثبت ${actionText}`}</h1><p>{receipt ? "ثبت شما ذخیره شد" : "روش ثبت را انتخاب و اطلاعات را قبل از ثبت بررسی کنید"}</p></div></header>
    <div className="clock-layout">
      <section className="card clock-main">
        <div className="clock-time"><span>{dateNow}</span><strong aria-hidden="true">{clockNow}</strong><small>{wp.name} • {shift.name} <bdi>{fa(shift.start)} تا {fa(shift.end)}</bdi></small></div>
        <div className="empty-inline">نسخه نمایشی شخصی • ثبت‌ها فقط در این مرورگر نگهداری می‌شوند و هنوز به سرور سازمان ارسال نمی‌شوند.</div>
        {error && <div className="state-banner bad" role="alert"><CrossCircledIcon /><p>{error}</p></div>}

        {receipt ? <><Receipt event={receipt} />
          <p className="next-action"><ClockIcon /> اقدام بعدی شما: <strong>ثبت {receipt.action === "in" ? "خروج" : "ورود"}</strong>{receipt.action === "in" ? ` (پایان شیفت ${fa(shift.end)})` : ""}</p>
          <button type="button" className="secondary-button" onClick={() => setReceipt(null)}>بازگشت به ثبت حضور</button></> : <>
          {pending.length > 0 && <section className="offline-queue" aria-label="ثبت‌های منتظر">
            <h2>{fa(pending.length)} رویداد در صف همگام‌سازی</h2>
            <p>ارسال به سازمان هنوز انجام نشده است. در این نسخه می‌توانید ثبت‌ها را به سابقه نمایشی منتقل کنید.</p>
            {pending.map(e => <div key={e.id}><ClockIcon /><span><strong>{e.action === "in" ? "ورود" : "خروج"} • {eventTime(e.time)}</strong><small>{eventDate(e.time)} • موقعیت تأیید نشده</small></span></div>)}
            <button type="button" className="primary-button large" onClick={reviewLocally} disabled={!online || !!error}>انتقال به سابقه نمایشی</button>
            {!online && <small role="status">اتصال قطع است؛ ثبت‌ها در صف باقی می‌مانند.</small>}
          </section>}
          {flow.s === "duplicate" && <Banner tone="warn" title="ثبت تکراری متوقف شد">برای ثبت بعدی حداقل ۳۰ ثانیه صبر کنید.</Banner>}

          {!online ? <div className="offline-actions"><Banner tone="warn" title="اتصال قطع است">می‌توانید زمان دستگاه را موقتاً ذخیره کنید؛ موقعیت و QR بررسی نمی‌شود و پس از اتصال باید تأیید شود.</Banner>
            <button type="button" className="primary-button large" onClick={() => record("offline")} disabled={!!error}>ذخیره ثبت آفلاین</button></div>

          : flow.s === "idle" || flow.s === "duplicate" ? primaryChoices

          : flow.s === "gps-permission" ? <Banner tone="neutral" title="در حال درخواست دسترسی به موقعیت…">اگر مرورگر پرسید، اجازه دسترسی را تأیید کنید.</Banner>
          : flow.s === "gps-accuracy" ? <Banner tone="neutral" title="در حال بررسی دقت موقعیت…">لطفاً چند لحظه صبر کنید.</Banner>
          : flow.s === "gps-low" ? <><Banner tone="warn" title="دقت موقعیت کافی نیست" role="alert">دقت فعلی ±{fmtMeters(flow.accuracy)} است؛ حداکثر دقت مجاز {fmtMeters(wp.maxAccuracy)} است. به فضای بازتر بروید و دوباره تلاش کنید.</Banner><button type="button" className="primary-button" onClick={startGps}><ReloadIcon /> تلاش دوباره</button></>
          : flow.s === "gps-outside" ? <><Banner tone="bad" title="خارج از محدوده محل کار هستید" role="alert">فاصله شما از {wp.name} حدود {fmtMeters(flow.distance)} است؛ محدوده مجاز {fmtMeters(wp.radius)} است (دقت ±{fmtMeters(flow.accuracy)}).</Banner>
            <div className="form-actions"><button type="button" className="primary-button" onClick={startGps}><ReloadIcon /> بررسی دوباره</button><button type="button" className="secondary-button" onClick={startQr}><CameraIcon /> اسکن QR</button></div></>
          : flow.s === "gps-denied" ? <><Banner tone="bad" title="دسترسی به موقعیت داده نشده" role="alert">در تنظیمات مرورگر یا دستگاه، دسترسی موقعیت این سایت را فعال کنید یا از اسکن QR استفاده کنید.</Banner>
            <div className="form-actions"><button type="button" className="primary-button" onClick={startGps}><ReloadIcon /> تلاش دوباره</button><button type="button" className="secondary-button" onClick={startQr}><CameraIcon /> اسکن QR</button></div></>
          : flow.s === "gps-unavailable" ? <><Banner tone="warn" title="سرویس موقعیت‌یابی در دسترس نیست" role="alert">{flow.timeout ? "دریافت موقعیت بیش از حد طول کشید." : "این دستگاه یا مرورگر موقعیت را ارائه نمی‌دهد."} دوباره تلاش کنید یا از اسکن QR استفاده کنید.</Banner>
            <div className="form-actions"><button type="button" className="primary-button" onClick={startGps}><ReloadIcon /> تلاش دوباره</button><button type="button" className="secondary-button" onClick={startQr}><CameraIcon /> اسکن QR</button></div></>

          : flow.s === "qr-starting" ? <Banner tone="neutral" title="در حال باز کردن دوربین…">اگر مرورگر پرسید، اجازه دسترسی به دوربین را تأیید کنید.</Banner>
          : flow.s === "qr-scanning" ? <div className="qr-scanner"><div className="qr-viewport"><video ref={video} muted playsInline aria-label="پیش‌نمایش دوربین" /><span className="qr-frame" aria-hidden="true" /></div>
            <p role="status">{flow.message ?? "کد QR نمایش‌داده‌شده در محل کار را داخل کادر بگیرید."}</p>
            <button type="button" className="secondary-button" onClick={reset}>انصراف و بستن دوربین</button></div>
          : flow.s === "qr-denied" ? <><Banner tone="bad" title="دسترسی به دوربین داده نشده" role="alert">برای اسکن QR دسترسی دوربین لازم است. آن را در تنظیمات مرورگر فعال کنید یا از موقعیت مکانی استفاده کنید.</Banner>
            <div className="form-actions"><button type="button" className="primary-button" onClick={startQr}><ReloadIcon /> تلاش دوباره</button><button type="button" className="secondary-button" onClick={startGps}><TargetIcon /> موقعیت مکانی</button></div></>
          : flow.s === "qr-unavailable" ? <><Banner tone="warn" title="دوربین در دسترس نیست" role="alert">دوربینی پیدا نشد یا این مرورگر اجازه استفاده از آن را نمی‌دهد.</Banner>
            <div className="form-actions"><button type="button" className="primary-button" onClick={startGps}><TargetIcon /> موقعیت مکانی</button></div></>

          : <section className="confirm-card" aria-label="بررسی پیش از ثبت"><h2>بررسی پیش از ثبت {actionText}</h2>
            <dl>
              <div><dt>اقدام</dt><dd><strong>{actionText}</strong></dd></div>
              <div><dt>روش</dt><dd>{methodLabel[flow.method]}</dd></div>
              <div><dt>محل</dt><dd>{wp.name}{flow.location ? ` • ${fmtMeters(flow.location.distance)} از مرکز` : " • تأیید با کد QR"}</dd></div>
              {flow.location && <div><dt>دقت موقعیت</dt><dd>±{fmtMeters(flow.location.accuracy)} (داخل محدوده {fmtMeters(wp.radius)})</dd></div>}
              <div><dt>شیفت</dt><dd>{shift.name} • <bdi>{fa(shift.start)} تا {fa(shift.end)}</bdi></dd></div>
              <div><dt>زمان فعلی</dt><dd>{clockNow}</dd></div>
            </dl>
            <div className="form-actions"><button type="button" className="secondary-button" onClick={reset}>انصراف</button>
              <button type="button" className="primary-button large" onClick={() => record(flow.method, { location: flow.location, qr: flow.qr })} disabled={!!error}>تأیید و ثبت {actionText}</button></div></section>}
        </>}
      </section>
      <aside className="card clock-help"><LockClosedIcon /><h2>ثبت‌های شما محفوظ می‌مانند</h2><p>بستن صفحه یا قطع اتصال، صف ثبت‌ها را پاک نمی‌کند. پاک‌کردن داده‌های مرورگر، این سابقه محلی را حذف می‌کند.</p><hr />
        <h3>آخرین رسید</h3>
        {last ? <button type="button" className="queue-badge receipt-link" onClick={e => { receiptTrigger.current = e.currentTarget; setViewReceipt(last); }}><CheckCircledIcon /><span><strong>{last.action === "in" ? "ورود" : "خروج"} • {eventTime(last.time)}</strong><small>{last.state === "pending" ? "منتظر ارسال" : "مشاهده رسید"}</small></span></button> : <p>هنوز رویدادی ذخیره نشده است.</p>}
        <h3>سابقه همین دستگاه</h3>{ledger.events.length === 0 ? <p>هنوز رویدادی ذخیره نشده است.</p> : ledger.events.slice(-5).reverse().map(e => <div className="queue-badge" key={e.id}><ClockIcon /><span><strong>{e.action === "in" ? "ورود" : "خروج"} • {eventTime(e.time)}</strong><small>{e.state === "pending" ? "منتظر ارسال" : `${methodLabel[e.method]} • ذخیره در سابقه نمایشی`}</small></span></div>)}
      </aside>
    </div>
    <Sheet open={!!viewReceipt} onClose={() => setViewReceipt(null)} title="رسید ثبت حضور" triggerRef={receiptTrigger}>{viewReceipt && <Receipt event={viewReceipt} />}</Sheet>
    <div className="sr-live" aria-live="polite">{announce}</div>
  </>;
}
