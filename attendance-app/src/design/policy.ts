export type Role = "employee" | "manager" | "hr" | "admin";
export type Capability = "ownAttendance" | "approveRequests" | "teamAttendance" | "editAttendance" | "schedules" | "import" | "export" | "users";
export const organizationPolicy = {
  workplaceTimeZone: "Asia/Tehran",
  calendarWeekStartsOn: 6,
  weekendDays: [6,0] as readonly number[],
  offlinePunching: "pendingVerification",
  approvalRoute: ["manager"] as const,
  duplicateWindowSeconds: 30,
  owner: "Sajad",
} as const;
export const permissions: Record<Role, Record<Capability, "own" | "team" | "all" | false>> = {
  employee: {ownAttendance:"own",approveRequests:false,teamAttendance:false,editAttendance:false,schedules:false,import:false,export:false,users:false},
  manager: {ownAttendance:"own",approveRequests:"team",teamAttendance:"team",editAttendance:false,schedules:false,import:false,export:"team",users:false},
  hr: {ownAttendance:"own",approveRequests:"all",teamAttendance:"all",editAttendance:"all",schedules:"all",import:"all",export:"all",users:false},
  admin: {ownAttendance:"own",approveRequests:"all",teamAttendance:"all",editAttendance:"all",schedules:"all",import:"all",export:"all",users:"all"},
};
export const can = (role: Role, capability: Capability) => permissions[role][capability] !== false;
export const isRole = (value: unknown): value is Role => typeof value === "string" && Object.hasOwn(permissions,value);
export const glossary = {in:"ورود",out:"خروج",dailyLeave:"مرخصی روزانه",hourlyLeave:"مرخصی ساعتی",mission:"ماموریت",overtime:"اضافه‌کار"} as const;
