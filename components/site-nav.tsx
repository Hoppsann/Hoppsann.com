"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const links = [
  { href: "/", label: "Home" },
  { href: "/photography", label: "Photography" },
  { href: "/videography", label: "Videography" },
  { href: "/it", label: "IT" },
]

export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b-[4px] border-foreground bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl tracking-tight md:text-3xl"
          aria-label="Hoppsann home"
        >
          HOPPSANN<span className="text-accent">.</span>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-2">
              {links.map((l) => {
                const active = pathname === l.href
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        "inline-flex items-center rounded-md border-[3px] border-foreground px-4 py-2 font-display text-sm uppercase tracking-wider",
                        "shadow-brutal-sm shadow-brutal-hover bg-background",
                        active && "bg-secondary",
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <Link
            href="/admin"
            className={cn(
              "inline-flex items-center rounded-md border-[3px] border-foreground px-4 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm shadow-brutal-hover",
              pathname === "/admin" ? "bg-accent text-accent-foreground" : "bg-[color:var(--brand-cyan)] text-foreground",
            )}
          >
            Admin
          </Link>
        </div>

        <button
          className="md:hidden rounded-md border-[3px] border-foreground bg-secondary p-2 shadow-brutal-sm"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          className="md:hidden border-t-[3px] border-foreground bg-background"
          aria-label="Mobile"
        >
          <ul className="flex flex-col">
            {links.map((l) => {
              const active = pathname === l.href
              return (
                <li key={l.href} className="border-b-[3px] border-foreground">
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block px-4 py-3 font-display text-base uppercase tracking-wider",
                      active && "bg-secondary",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              )
            })}
            <li className="last:border-b-0">
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-3 font-display text-base uppercase tracking-wider",
                  pathname === "/admin"
                    ? "bg-accent text-accent-foreground"
                    : "bg-[color:var(--brand-cyan)] text-foreground",
                )}
              >
                Admin
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
