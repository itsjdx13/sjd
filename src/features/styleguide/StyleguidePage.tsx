import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info, Moon, Radio, Sun, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { StyleguideLayout } from "./StyleguideLayout"

const primary = [
  ["50", "#f8ffe8"], ["100", "#efffc8"], ["200", "#e1ff98"], ["300", "#d4fb72"], ["400", "#c9f35b"],
  ["500", "#a9d82f"], ["600", "#84ad18"], ["700", "#668517"], ["800", "#526a1a"], ["900", "#45591b"],
] as const

const neutral = [
  ["50", "#f7f8f5"], ["100", "#f0f2ed"], ["200", "#dfe3dc"], ["300", "#c9cec8"], ["400", "#a1a8a4"],
  ["500", "#7a827f"], ["600", "#5e6664"], ["700", "#444b4a"], ["800", "#292f31"], ["900", "#171b1d"],
] as const

const semantic = [
  ["Success", "--success", "#177a56", "bg-success"],
  ["Warning", "--warning", "#d6a949", "bg-warning"],
  ["Destructive", "--destructive", "#c94343", "bg-destructive"],
  ["Information", "--info", "#3473c7", "bg-info"],
] as const

const charts = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"]

function Section({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="border-t border-border py-12 first:border-0 first:pt-0"><div className="mb-7 max-w-2xl"><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p><h2 className="mb-2 text-2xl font-semibold tracking-[-0.04em]">{title}</h2><p className="text-xs leading-6 text-muted-foreground">{description}</p></div>{children}</section>
}

function Scale({ name, values }: { name: string; values: ReadonlyArray<readonly [string, string]> }) {
  return <div><div className="mb-3 flex items-end justify-between"><h3 className="text-sm font-semibold">{name}</h3><code className="text-[10px] text-muted-foreground">50—900</code></div><div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border sm:grid-cols-5 lg:grid-cols-10">{values.map(([step, hex]) => <div key={step} className="min-h-24 p-3" style={{ background: `var(--${name.toLowerCase()}-${step})`, color: Number(step) >= 600 ? "#fff" : "#171a1d" }}><strong className="block text-[10px]">{step}</strong><span className="text-[8px] opacity-70">{hex}</span></div>)}</div></div>
}

export default function StyleguidePage() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark" || (document.documentElement.dataset.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches))

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light"
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  return <StyleguideLayout><div className="mx-auto max-w-6xl px-5 py-10 lg:px-10 lg:py-14">
    <div className="mb-14 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div className="max-w-3xl"><Badge className="mb-5">v1.0 foundation</Badge><h1 className="mb-4 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Quiet structure.<br />High-signal finance.</h1><p className="max-w-xl text-sm leading-7 text-muted-foreground">A compact token system extracted from the Northstar interface: graphite surfaces, acid-lime actions, disciplined spacing, and just enough color to reveal financial meaning.</p></div>
      <Button variant="outline" size="lg" onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>{dark ? <Sun /> : <Moon />} {dark ? "Light preview" : "Dark preview"}</Button>
    </div>

    <Section eyebrow="01 / Color" title="Core palettes" description="The lime scale carries interaction and focus. Neutral graphite values do the structural work so portfolio data stays dominant.">
      <div className="grid gap-8"><Scale name="Primary" values={primary} /><Scale name="Neutral" values={neutral} /></div>
    </Section>

    <Section eyebrow="02 / Roles" title="Semantic colors" description="Status colors remain distinguishable without becoming decorative. Text and icons use foreground partners that meet accessible contrast targets.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{semantic.map(([name, token, hex, colorClass]) => <Card key={token} size="sm"><CardContent className="flex items-center gap-3"><span className={`size-9 rounded-lg ${colorClass}`} /><span><strong className="block text-xs">{name}</strong><code className="text-[9px] text-muted-foreground">{token} · {hex}</code></span></CardContent></Card>)}</div>
      <div className="mt-6 grid grid-cols-5 overflow-hidden rounded-xl border border-border">{charts.map((token, index) => <div key={token} className="h-20 p-3" style={{ background: `var(${token})` }}><span className="text-[9px] font-semibold text-neutral-900">0{index + 1}</span></div>)}</div>
    </Section>

    <Section eyebrow="03 / Type" title="Typography" description="Estedad is the product typeface. Its variable weights support Latin, Persian, and financial notation without introducing another font request.">
      <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border"><div className="bg-card p-7"><span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Display / 48 / 650</span><p className="mt-4 text-5xl font-semibold tracking-[-0.055em]">$193,840</p></div><div className="grid bg-card sm:grid-cols-2"><div className="p-7"><span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Heading / 24 / 650</span><h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Asset allocation</h3></div><div className="p-7"><span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Body / 14 / 400</span><p className="mt-4 text-sm leading-6">Portfolio values load locally first, then refresh quietly in the background.</p></div></div><div className="bg-card p-7" dir="rtl"><span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Persian / RTL / Estedad</span><p className="mt-4 text-xl font-medium">همیشه راهی هست.</p></div></div>
    </Section>

    <Section eyebrow="04 / Shape" title="Radius and elevation" description="Corners are controlled rather than soft. Shadows appear only when hierarchy cannot be communicated with surface and border alone.">
      <div className="grid gap-5 md:grid-cols-2"><div className="grid grid-cols-4 gap-4">{[["sm", "rounded-sm"], ["md", "rounded-md"], ["lg", "rounded-lg"], ["xl", "rounded-xl"]].map(([name, radius]) => <div key={name}><div className={`aspect-square border border-border bg-muted ${radius}`} /><code className="mt-2 block text-center text-[9px] text-muted-foreground">{name}</code></div>)}</div><div className="grid grid-cols-3 gap-4">{[["Subtle", "shadow-sm"], ["Raised", "shadow-md"], ["Overlay", "shadow-lg"]].map(([name, shadow]) => <div key={name} className={`grid min-h-28 place-items-center rounded-xl border border-border bg-card ${shadow}`}><span className="text-[9px] text-muted-foreground">{name}</span></div>)}</div></div>
    </Section>

    <Section eyebrow="05 / Components" title="shadcn primitives" description="The initial primitives consume the same tokens as the dashboard and are ready to be composed into product-specific patterns.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Buttons and badges</CardTitle><CardDescription>Primary actions are unmistakable; secondary actions stay quiet.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button>Primary action</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button></CardContent><CardFooter className="flex flex-wrap gap-2"><Badge>Live</Badge><Badge variant="secondary">Cached</Badge><Badge variant="outline">Manual</Badge><Badge variant="destructive">Failed</Badge></CardFooter></Card>
        <Card><CardHeader><CardTitle>Radio group</CardTitle><CardDescription>A compact control for portfolio preferences.</CardDescription></CardHeader><CardContent><RadioGroup defaultValue="usd" className="gap-3"><label className="flex items-center gap-3 text-xs"><RadioGroupItem value="usd" /> USD base currency</label><label className="flex items-center gap-3 text-xs"><RadioGroupItem value="irr" /> IRR base currency</label><label className="flex items-center gap-3 text-xs"><RadioGroupItem value="irt" /> IRT base currency</label></RadioGroup></CardContent></Card>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><Alert><Info /><AlertTitle>Cached market data</AlertTitle><AlertDescription>Last successful quote remains visible while providers recover.</AlertDescription></Alert><Alert variant="destructive"><AlertCircle /><AlertTitle>Provider unavailable</AlertTitle><AlertDescription>No portfolio data was lost. Try refreshing later.</AlertDescription></Alert><Alert className="border-success/35 bg-success/10 text-success"><CheckCircle2 /><AlertTitle>Backup complete</AlertTitle><AlertDescription className="text-success/80">Your JSON snapshot was downloaded locally.</AlertDescription></Alert><Alert className="border-warning/40 bg-warning/10 text-warning-foreground"><TriangleAlert /><AlertTitle>Delayed quote</AlertTitle><AlertDescription className="text-warning-foreground/70">Verify the market timestamp before making a decision.</AlertDescription></Alert></div>
    </Section>

    <footer className="flex flex-col gap-2 border-t border-border pt-7 text-[9px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><span>Northstar design system · Estedad</span><span className="flex items-center gap-1.5"><Radio className="size-3" /> Local-first foundation</span></footer>
  </div></StyleguideLayout>
}
