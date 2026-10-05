export const ROSTER_KEY = "roco-roster-2026-10-03-v1";
export type ShiftCode = "morning" | "evening" | "leave" | "off";
export type Roster = { version: 1; cells: ShiftCode[][]; publishedAt: string | null; codes?: string[] };
export const defaultRosterCodes = ["RG-1042", "RG-1048", "RG-1051", "RG-1060"];
export const defaultRoster = (): Roster => ({version:1,publishedAt:null,codes:[...defaultRosterCodes],cells:Array.from({length:4},(_,row)=>Array.from({length:5},(_,day)=>row===2&&day===1?"leave":row===3&&day===4?"evening":"morning"))});
export function readRoster(): Roster {
  const raw=localStorage.getItem(ROSTER_KEY);
  if(!raw)return defaultRoster();
  const value=JSON.parse(raw);
  if(value?.version!==1 || !Array.isArray(value.cells) || value.cells.length!==4 || value.cells.some((row:unknown)=>!Array.isArray(row)||row.length!==5||row.some(cell=>!["morning","evening","leave","off"].includes(cell))) || !(value.publishedAt===null||typeof value.publishedAt==="string"&&Number.isFinite(Date.parse(value.publishedAt)))) throw new Error("Invalid saved roster");
  return value;
}
export function saveRoster(value:Roster) { localStorage.setItem(ROSTER_KEY,JSON.stringify(value)); }
