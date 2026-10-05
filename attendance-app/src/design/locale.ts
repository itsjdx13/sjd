export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, digit => String(digit.charCodeAt(0) - (digit >= "۰" ? 1776 : 1632))).replace(/٫/g,".");
}
export function persianDigits(value: string | number): string {
  return normalizeDigits(String(value)).replace(/\d/g,digit=>"۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}
const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {timeZone:"UTC",year:"numeric",month:"numeric",day:"numeric"});
export function jalaliParts(date: Date): {year:number;month:number;day:number} {
  const parts = formatter.formatToParts(date);
  const get = (type:string) => Number(parts.find(part=>part.type===type)!.value);
  return {year:get("year"),month:get("month"),day:get("day")};
}
export function jalaliToISO(value: string): string | null {
  const match = normalizeDigits(value).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;
  const [year,month,day] = match.slice(1).map(Number);
  if (year < 1200 || year > 1600 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const target = year*10000 + month*100 + day;
  let low = Math.floor(Date.UTC(year+621,0,1)/86400000);
  let high = Math.ceil(Date.UTC(year+622,11,31)/86400000);
  while (low <= high) {
    const middle = Math.floor((low+high)/2);
    const date = new Date(middle*86400000);
    const parts = jalaliParts(date);
    const key = parts.year*10000 + parts.month*100 + parts.day;
    if (key===target) return date.toISOString().slice(0,10);
    if (key<target) low=middle+1; else high=middle-1;
  }
  return null;
}
export function isoToJalali(iso:string): string {
  const date = new Date(iso.length===10 ? iso+"T12:00:00Z" : iso);
  if (!Number.isFinite(date.getTime())) return "";
  const {year,month,day}=jalaliParts(date);
  return persianDigits(year+"/"+String(month).padStart(2,"0")+"/"+String(day).padStart(2,"0"));
}
export function todayJalali(zone="Asia/Tehran"):string {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
export function validTime(value:string):boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizeDigits(value));
}
