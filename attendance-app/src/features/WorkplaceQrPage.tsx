import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { getWorkplace, makeQrPayload } from "./qr";
import { fa } from "./ui";

/** Shown on a screen at the workplace entrance (not on employee phones). The code rotates every window. */
export default function WorkplaceQrPage() {
  const wp = getWorkplace();
  const [state, setState] = useState<{ image: string; window: number; expiresAt: number } | null>(null);
  const [left, setLeft] = useState(wp.qrWindowSeconds);
  useEffect(() => {
    let alive = true, current = -1;
    const tick = async () => {
      const now = Date.now(), { payload, window, expiresAt } = await makeQrPayload(now, wp);
      if (!alive) return;
      if (window !== current) { current = window; const image = await QRCode.toDataURL(payload, { margin: 2, width: 360, errorCorrectionLevel: "M" }); if (alive) setState({ image, window, expiresAt }); }
      setLeft(Math.max(0, Math.ceil((expiresAt - now) / 1000)));
    };
    void tick(); const id = window.setInterval(() => void tick(), 500);
    return () => { alive = false; window.clearInterval(id); };
  }, []);
  return <>
    <header className="page-header"><div><h1 tabIndex={-1}>نمایشگر QR محل کار</h1><p>این صفحه را روی نمایشگر ورودی باز کنید؛ کارکنان با دوربین گوشی آن را اسکن می‌کنند.</p></div></header>
    <section className="card qr-display">
      {state ? <img src={state.image} width={360} height={360} alt="کد QR چرخان ثبت حضور" /> : <div className="qr-placeholder" role="status">در حال ساخت کد…</div>}
      <div className="qr-meta"><strong>{wp.name}</strong><span aria-live="off">کد بعدی تا {fa(left)} ثانیه دیگر</span>
        <div className="progress" aria-hidden="true"><span style={{ width: `${left / wp.qrWindowSeconds * 100}%` }} /></div></div>
      <p className="muted-text">در این نسخه نمایشی، امضای کد در مرورگر ساخته می‌شود. در نسخه واقعی، سرور هر کد را امضا و هنگام ثبت بررسی می‌کند.</p>
    </section></>;
}
