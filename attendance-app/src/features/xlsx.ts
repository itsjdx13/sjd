import type { CellValue } from "exceljs";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export type WorkbookSheet = { name: string; headers: string[]; rows: string[][] };

// Bound decompression before loading an untrusted workbook into memory.
function inspectArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  let end = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new Error("پرونده Excel معتبر نیست یا آسیب دیده است.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true), total = 0;
  if (count > 2000 || offset === 0xffffffff) throw new Error("ساختار یا حجم پرونده Excel پشتیبانی نمی‌شود.");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error("ساختار پرونده Excel معتبر نیست.");
    const size = view.getUint32(offset + 24, true);
    total += size;
    if (size === 0xffffffff || total > 50 * 1024 * 1024 || (view.getUint16(offset + 8, true) & 1)) throw new Error("پرونده رمزدار یا بیش از حد بزرگ پشتیبانی نمی‌شود.");
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
}

function cellText(value: CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) throw new Error("فرمول‌ها وارد نمی‌شوند؛ ابتدا سلول‌ها را در Excel به مقدار ثابت تبدیل کنید.");
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ("richText" in value) return value.richText.map(part => part.text).join("");
    if ("text" in value) return value.text;
    throw new Error("سلول دارای خطای Excel است؛ آن را اصلاح و دوباره بارگذاری کنید.");
  }
  return String(value);
}

export async function readWorkbook(buffer: ArrayBuffer): Promise<WorkbookSheet[]> {
  inspectArchive(buffer);
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer); }
  catch { throw new Error("خواندن Excel ممکن نشد؛ پرونده آسیب‌دیده یا رمزدار نباشد."); }
  if (workbook.worksheets.length > 20) throw new Error("حداکثر ۲۰ برگه در هر پرونده مجاز است.");
  const sheets: WorkbookSheet[] = [];
  for (const sheet of workbook.worksheets) {
    if (sheet.state !== "visible") continue;
    if (sheet.rowCount > 5001 || sheet.columnCount > 100) throw new Error("حداکثر ۵۰۰۰ ردیف داده و ۱۰۰ ستون در هر برگه مجاز است.");
    const rows: string[][] = [];
    sheet.eachRow(row => {
      const cells = Array.from({ length: sheet.columnCount }, (_, i) => cellText(row.getCell(i + 1).value));
      if (cells.some(cell => cell.length > 10000)) throw new Error("متن یک سلول بیش از حد طولانی است.");
      if (cells.some(cell => cell.trim())) rows.push(cells);
    });
    if (rows.length >= 2) sheets.push({ name: sheet.name, headers: rows[0], rows: rows.slice(1) });
  }
  if (!sheets.length) throw new Error("یک برگه قابل نمایش با عنوان ستون‌ها و دست‌کم یک ردیف داده لازم است.");
  return sheets;
}

export async function writeWorkbook(headers: string[], rows: Array<Array<string | number>>): Promise<Uint8Array<ArrayBuffer>> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("حضور کارکنان", { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row.map((value, i) => i === 7 ? Number(value) : value)));
  sheet.columns.forEach((column, i) => { column.width = i === 1 ? 26 : 20; });
  sheet.getRow(1).font = { bold: true, color: { argb: "FF4338CA" } };
  sheet.autoFilter = { from: "A1", to: "K1" };
  sheet.getColumn(8).numFmt = "0.00";
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export function encodeWorkbook(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}
export function decodeWorkbook(content: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(content), c => c.charCodeAt(0));
}
