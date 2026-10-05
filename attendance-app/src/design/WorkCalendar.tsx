import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "./components";
import { isoToJalali, jalaliParts, jalaliToISO, persianDigits } from "./locale";
import { organizationPolicy } from "./policy";
import { requestStore, requestTypeLabels, CURRENT_USER } from "../features/store";
import { recordFor } from "../features/attendance";
import { safeLedger } from "../features/ledger";
import { Badge } from "./components";

const months=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const weekdays=["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه"];
function workplaceToday() {
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:organizationPolicy.workplaceTimeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(name:string)=>parts.find(p=>p.type===name)!.value;
  return get("year")+"-"+get("month")+"-"+get("day");
}
export default function WorkCalendar() {
  const requests=requestStore.use();
  const today=workplaceToday();
  const initial=jalaliParts(new Date(today+"T12:00:00Z"));
  const [month,setMonth]=useState(initial.month),[year,setYear]=useState(initial.year),[selected,setSelected]=useState(today);
  const first=jalaliToISO(year+"/"+month+"/1")!;
  const nextMonth=month===12?1:month+1, nextYear=month===12?year+1:year;
  const next=jalaliToISO(nextYear+"/"+nextMonth+"/1")!;
  const days=(Date.parse(next)-Date.parse(first))/86400000;
  const offset=(new Date(first+"T12:00:00Z").getUTCDay()-organizationPolicy.calendarWeekStartsOn+7)%7;
  const isoFor=(day:number)=>new Date(Date.parse(first)+(day-1)*86400000).toISOString().slice(0,10);
  const requestsOn=(iso:string)=>requests.filter(r=>r.employeeCode===CURRENT_USER.code&&r.status!=="rejected"&&r.startDate<=iso&&iso<=r.endDate);
  const dayOff=(iso:string)=>organizationPolicy.weekendDays.includes(new Date(iso+"T12:00:00Z").getUTCDay());
  function changeMonth(delta:number) {
    const index=year*12+month-1+delta,newYear=Math.floor(index/12),newMonth=index%12+1;
    if(newYear<1200||newYear>1599)return;
    setYear(newYear);setMonth(newMonth);setSelected(jalaliToISO(newYear+"/"+newMonth+"/1")!);
  }
  return <><header className="page-header"><div><h1 tabIndex={-1}>تقویم کاری</h1><p>تعطیلات هفتگی شما: شنبه و یکشنبه</p></div></header><section className="calendar-layout"><div className="card calendar-card"><div className="calendar-head"><div><Button variant="ghost" aria-label="ماه قبل" onClick={()=>changeMonth(-1)}><ChevronRightIcon/></Button><h2 aria-live="polite">{months[month-1]} {persianDigits(year)}</h2><Button variant="ghost" aria-label="ماه بعد" onClick={()=>changeMonth(1)}><ChevronLeftIcon/></Button></div><Button variant="secondary" onClick={()=>{setYear(initial.year);setMonth(initial.month);setSelected(today);}}>امروز</Button></div><div className="weekdays">{weekdays.map(day=><span key={day}><span className="sr-only">{day}</span><span className="wd-full" aria-hidden="true">{day}</span><span className="wd-short" aria-hidden="true">{day[0]}</span></span>)}</div><div className="month-grid">{Array.from({length:offset},(_,i)=><span key={"empty"+i} aria-hidden="true"/>)}{Array.from({length:days},(_,i)=>i+1).map(day=>{const iso=isoFor(day);return <button key={iso} className={[(selected===iso?"selected":""),(dayOff(iso)?"holiday":"")].join(" ")} aria-label={isoToJalali(iso)+(dayOff(iso)?"، تعطیل هفتگی":"")+(requestsOn(iso).length?"، دارای درخواست":"")} aria-pressed={selected===iso} aria-current={iso===today?"date":undefined} onClick={()=>setSelected(iso)}><span>{persianDigits(day)}</span>{iso===today&&<small>امروز</small>}{requestsOn(iso).length>0&&<i className="day-dot" aria-hidden="true"/>}</button>;})}</div></div><aside className="card day-detail" aria-live="polite"><span className="overline">روز انتخاب‌شده</span><h2><bdi>{isoToJalali(selected)}</bdi></h2><p>{dayOff(selected)?"تعطیل هفتگی؛ شیفت عادی برنامه‌ریزی نشده است.":"روز کاری؛ شیفت نمونه ۰۸:۳۰ تا ۱۷:۰۰"}</p>{(()=>{const rec=!dayOff(selected)&&selected<=today?recordFor(selected,safeLedger(),requests):null;const list=requestsOn(selected);return <>{rec&&rec.state!=="noPunch"&&<p><strong>حضور:</strong> {rec.in??"—"} تا {rec.out??"—"}</p>}{list.length>0&&<div className="day-requests"><strong>درخواست‌های این روز</strong>{list.map(r=><div key={r.id}><span>{requestTypeLabels[r.type]}</span><Badge status={r.status}/></div>)}</div>}{list.length===0&&<p className="muted-text">درخواستی برای این روز ثبت نشده است.</p>}</>})()}<p className="empty-inline">برنامه واقعی شیفت و تعطیلات رسمی هنوز به این تقویم متصل نشده است.</p></aside></section></>;
}
