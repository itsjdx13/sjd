import { normalizeDigits } from "../design/locale";
import { departments, type Employee } from "./store";

/** RFC-4180-style parser: quotes, escaped quotes, CRLF, BOM, and comma/semicolon/tab delimiters. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = [",", ";", "\t"].map(d => [d, first.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => cell.trim() !== ""));
}
export const csvCell = (v: string | number) => { const s = String(v); const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? "'" + s : s; return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe; };
export const toCsv = (rows: Array<Array<string | number>>) => "﻿" + rows.map(r => r.map(csvCell).join(",")).join("\r\n");

export type ImportField = "code" | "name" | "department" | "email" | "shift";
export const importFields: Array<{ key: ImportField; label: string; required: boolean; aliases: string[] }> = [
  { key: "code", label: "کد پرسنلی", required: true, aliases: ["code", "employee_code", "کد پرسنلی", "کد", "شماره پرسنلی"] },
  { key: "name", label: "نام و نام خانوادگی", required: true, aliases: ["name", "full_name", "نام", "نام و نام خانوادگی"] },
  { key: "department", label: "واحد", required: true, aliases: ["department", "unit", "واحد", "دپارتمان"] },
  { key: "email", label: "ایمیل", required: false, aliases: ["email", "mail", "ایمیل", "پست الکترونیک"] },
  { key: "shift", label: "شیفت", required: false, aliases: ["shift", "شیفت"] },
];
export function autoMap(headers: string[]): Record<ImportField, number> {
  const map = {} as Record<ImportField, number>;
  for (const f of importFields) map[f.key] = headers.findIndex(h => f.aliases.includes(h.trim().toLowerCase()));
  return map;
}
export type ImportRow = { line: number; values: Record<ImportField, string>; errors: string[] };
export const validShifts = ["صبح", "عصر", "شب"];
export function validateImport(rows: string[][], map: Record<ImportField, number>, existing: Employee[]): ImportRow[] {
  const seen = new Set<string>(), have = new Set(existing.map(e => e.code.toLowerCase()));
  return rows.map((r, i) => {
    const get = (k: ImportField) => map[k] >= 0 ? (r[map[k]] ?? "").trim() : "";
    const values = { code: normalizeDigits(get("code")).toUpperCase(), name: get("name"), department: get("department"), email: get("email"), shift: get("shift") || "صبح" };
    const errors: string[] = [];
    if (!values.name) errors.push("نام خالی است");
    if (!/^RG-\d{3,6}$/.test(values.code)) errors.push("کد پرسنلی باید مانند RG-1090 باشد");
    else if (seen.has(values.code.toLowerCase())) errors.push("کد پرسنلی در فایل تکراری است");
    else if (have.has(values.code.toLowerCase())) errors.push("کد پرسنلی از قبل وجود دارد");
    seen.add(values.code.toLowerCase());
    if (!values.department) errors.push("واحد خالی است"); else if (!departments.includes(values.department)) errors.push(`واحد «${values.department}» تعریف نشده است`);
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.push("ایمیل نامعتبر است");
    if (!validShifts.includes(values.shift)) errors.push("شیفت باید صبح، عصر یا شب باشد");
    return { line: i + 2, values, errors };
  });
}
export function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type: typeof content === "string" ? `${type};charset=utf-8` : type }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
