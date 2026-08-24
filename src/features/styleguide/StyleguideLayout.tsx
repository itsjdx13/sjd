import type { ReactNode } from "react"
import { ArrowLeft, Sparkles } from "lucide-react"

import { cn } from "@/lib/utils"
import { navigation } from "./navigation"

export function StyleguideLayout({ children }: { children: ReactNode }) {
  const pathname = window.location.pathname

  return (
    <div className="styleguide-root min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground lg:flex">
        <a href="/styleguide" className="mb-10 flex items-center gap-3 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-sidebar-accent text-primary">
            <Sparkles className="size-4" />
          </span>
          Northstar System
        </a>

        <nav className="flex flex-col gap-7" aria-label="Styleguide navigation">
          {navigation.map((section) => (
            <div key={section.title}>
              <h2 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                {section.title}
              </h2>
              {section.items.length ? (
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        className={cn(
                          "block rounded-lg px-3 py-2.5 text-xs transition-colors",
                          pathname === item.href
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 text-[10px] leading-5 text-sidebar-foreground/35">Ready for component documentation.</p>
              )}
            </div>
          ))}
        </nav>

        <a href="/" className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <ArrowLeft className="size-3.5" /> Back to dashboard
        </a>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-5 backdrop-blur lg:px-10">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Northstar / Foundation</p>
            <p className="text-sm font-semibold">Design tokens</p>
          </div>
          <a href="/" className="text-xs text-muted-foreground hover:text-foreground lg:hidden">Dashboard →</a>
        </header>
        <div role="main">{children}</div>
      </div>
    </div>
  )
}
