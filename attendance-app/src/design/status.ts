import {CheckCircledIcon,ClockIcon,CrossCircledIcon,ExclamationTriangleIcon,FileTextIcon,InfoCircledIcon,ReloadIcon} from "@radix-ui/react-icons";
export const statusDefinitions = {
  onTime: {label:"به‌موقع",tone:"success",Icon:CheckCircledIcon,domain:"حضور"},
  late: {label:"تأخیر",tone:"warning",Icon:ClockIcon,domain:"حضور"},
  missingPunch: {label:"ثبت ناقص",tone:"danger",Icon:ExclamationTriangleIcon,domain:"حضور"},
  overtime: {label:"اضافه‌کار",tone:"info",Icon:ClockIcon,domain:"حضور"},
  onLeave: {label:"مرخصی",tone:"neutral",Icon:FileTextIcon,domain:"حضور"},
  mission: {label:"ماموریت",tone:"neutral",Icon:FileTextIcon,domain:"حضور"},
  draft: {label:"پیش‌نویس",tone:"neutral",Icon:FileTextIcon,domain:"درخواست"},
  pending: {label:"در انتظار تأیید",tone:"warning",Icon:ClockIcon,domain:"درخواست"},
  returned: {label:"نیازمند ویرایش",tone:"info",Icon:ReloadIcon,domain:"درخواست"},
  approved: {label:"تأیید شده",tone:"success",Icon:CheckCircledIcon,domain:"درخواست"},
  rejected: {label:"رد شده",tone:"danger",Icon:CrossCircledIcon,domain:"درخواست"},
  cancelled: {label:"لغو شده",tone:"neutral",Icon:InfoCircledIcon,domain:"درخواست"},
} as const;
export type StatusKey = keyof typeof statusDefinitions;
export type Tone = "success"|"warning"|"danger"|"info"|"neutral";
