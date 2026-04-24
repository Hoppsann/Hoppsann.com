import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t-[4px] border-foreground bg-foreground text-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <p className="font-display text-2xl">HOPPSANN<span className="text-[color:var(--brand-cyan)]">.</span>COM</p>
          <p className="mt-1 text-sm opacity-80">
            Photography · Videography · IT — made with noise &amp; intent.
          </p>
        </div>
        <ul className="flex flex-wrap gap-3">
          <li>
            <Link
              href="/photography"
              className="inline-block border-[3px] border-background bg-accent px-3 py-2 font-display text-xs uppercase tracking-wider text-accent-foreground"
            >
              Photography
            </Link>
          </li>
          <li>
            <Link
              href="/videography"
              className="inline-block border-[3px] border-background bg-secondary px-3 py-2 font-display text-xs uppercase tracking-wider text-secondary-foreground"
            >
              Videography
            </Link>
          </li>
          <li>
            <Link
              href="/it"
              className="inline-block border-[3px] border-background bg-[color:var(--brand-cyan)] px-3 py-2 font-display text-xs uppercase tracking-wider text-foreground"
            >
              IT
            </Link>
          </li>
        </ul>
      </div>
      <div className="border-t-[2px] border-background/30 px-4 py-3 text-center text-xs opacity-70 md:px-8">
        © {new Date().getFullYear()} Hoppsann — All work made with heavy hands.
      </div>
    </footer>
  )
}
