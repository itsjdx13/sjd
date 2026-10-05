import type { ReactNode } from "react";
import { CheckCircledIcon, ClockIcon, ExclamationTriangleIcon, FileTextIcon, MixIcon } from "@radix-ui/react-icons";
import { Badge } from "../design/components";
import { statusDefinitions, type StatusKey } from "../design/status";

export function Brand() {
  return <div className="brand" aria-label="روکو گایز"><span className="brand-mark" aria-hidden="true"><MixIcon /></span><span><strong>روکو گایز</strong><small>با هم، جلوتر</small></span></div>;
}
export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <header className="page-header"><div><h1 tabIndex={-1}>{title}</h1><p>{subtitle}</p></div>{action}</header>;
}
export function StatusPill({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const key = (Object.keys(statusDefinitions) as StatusKey[]).find(k => statusDefinitions[k].label === children);
  if (key) return <Badge status={key} />;
  const Icon = tone === "good" ? CheckCircledIcon : tone === "warn" ? ClockIcon : tone === "bad" ? ExclamationTriangleIcon : FileTextIcon;
  return <span className={`status-pill ${tone}`}><Icon aria-hidden="true" />{children}</span>;
}
