import { useId, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { isoToJalali, jalaliToISO, normalizeDigits, todayJalali } from "./locale";
import { statusDefinitions, type StatusKey } from "./status";

export function Button({variant="primary",busy=false,children,disabled,...props}: ButtonHTMLAttributes<HTMLButtonElement> & {variant?:"primary"|"secondary"|"ghost"|"danger";busy?:boolean}) {
  return <button type="button" {...props} disabled={disabled||busy} aria-busy={busy||undefined} className={`ds-button ds-${variant} ${props.className||""}`}>{busy&&<span className="spinner" aria-hidden="true"/>}{children}</button>;
}
export function Badge({status}:{status:StatusKey}) {
  const {label,tone,Icon}=statusDefinitions[status];
  return <span className={`ds-badge ds-tone-${tone}`}><Icon aria-hidden="true"/>{label}</span>;
}
export function Field({label,hint,error,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;hint?:string;error?:string}) {
  const generated=useId(),id=props.id||generated;
  const description=[props["aria-describedby"],error||hint?`${id}-description`:undefined].filter(Boolean).join(" ")||undefined;
  return <div className="ds-field"><label htmlFor={id}>{label}</label><input {...props} id={id} aria-invalid={!!error||props["aria-invalid"]} aria-describedby={description}/>{(error||hint)&&<small id={`${id}-description`} className={error?"ds-error":""}>{error||hint}</small>}</div>;
}
export function JalaliField({label,value,onChange,min,max,error}:{label:string;value:string;onChange:(value:string)=>void;min?:string;max?:string;error?:string}) {
  const iso=jalaliToISO(value);
  const invalid=!!value&&(!iso||!!min&&iso<min||!!max&&iso>max);
  return <div className="ds-date"><Field label={label} value={value} onChange={e=>onChange(e.target.value)} inputMode="numeric" dir="ltr" placeholder="۱۴۰۵/۰۷/۰۹" hint="سال/ماه/روز؛ ارقام فارسی، عربی یا انگلیسی" error={error||(invalid?"تاریخ معتبر و در بازه مجاز وارد کنید.":undefined)}/><div className="ds-actions"><Button variant="ghost" onClick={()=>onChange(todayJalali())}>امروز</Button><label className="ds-native-date">انتخاب از تقویم<input aria-label={`انتخاب ${label} از تقویم`} type="date" min={min} max={max} value={iso||""} onChange={e=>onChange(isoToJalali(e.target.value))}/></label></div></div>;
}
export function TimeField({label,value,onChange,error}:{label:string;value:string;onChange:(value:string)=>void;error?:string}) {
  const normalized=normalizeDigits(value);
  return <Field label={label} value={value} dir="ltr" inputMode="numeric" placeholder="۰۸:۳۰" onChange={e=>onChange(e.target.value)} error={error||(value&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)?"ساعت معتبر از ۰۰:۰۰ تا ۲۳:۵۹ وارد کنید.":undefined)}/>;
}
export function Modal({trigger,title,description,children}:{trigger:ReactNode;title:string;description:string;children:ReactNode}) {
  return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="ds-overlay"/><Dialog.Content className="ds-dialog"><div className="ds-dialog-head"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" aria-label="بستن پنجره"><Cross2Icon/></Button></Dialog.Close></div><Dialog.Description>{description}</Dialog.Description>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function UploadField() {
  const [file,setFile]=useState<File|null>(null),[error,setError]=useState("");
  function choose(next:File|undefined) {
    if(!next)return;
    if(next.size>5*1024*1024||!/[.](pdf|png|jpe?g)$/i.test(next.name)){setError("فقط PDF، PNG یا JPG تا ۵ مگابایت مجاز است.");return;}
    setError("");setFile(next);
  }
  return <div className="ds-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files[0]);}}><Field label="پیوست" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>choose(e.target.files?.[0])} hint="فایل را اینجا رها کنید یا انتخاب کنید؛ فقط پیش‌نمایش محلی، بدون بارگذاری سرور." error={error}/>{file&&<div className="ds-actions"><bdi>{file.name}</bdi><Button variant="ghost" onClick={()=>setFile(null)}>حذف پیوست</Button></div>}<span className="sr-live" aria-live="polite">{error|| (file?`پیوست ${file.name} انتخاب شد`:"")}</span></div>;
}
