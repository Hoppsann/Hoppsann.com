import Link from "next/link"
import { ArrowUpRight, Camera, Film, Code2 } from "lucide-react"

const cards = [
  {
    href: "/photography",
    title: "Photography",
    subtitle: "Frozen moments. Loud frames.",
    bg: "bg-accent",
    text: "text-accent-foreground",
    Icon: Camera,
    tag: "01",
  },
  {
    href: "/videography",
    title: "Videography",
    subtitle: "Motion with attitude.",
    bg: "bg-secondary",
    text: "text-secondary-foreground",
    Icon: Film,
    tag: "02",
  },
  {
    href: "/it",
    title: "IT & Code",
    subtitle: "Build. Break. Rebuild.",
    bg: "bg-[color:var(--brand-cyan)]",
    text: "text-foreground",
    Icon: Code2,
    tag: "03",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      {/* Hero */}
      <section className="mb-12 md:mb-16">
        <div className="inline-block border-[3px] border-foreground bg-secondary px-3 py-1 font-display text-xs uppercase tracking-widest shadow-brutal-sm">
          Portfolio / 2026
        </div>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          HELLO, I&apos;M
          <br />
          <span className="inline-block bg-foreground px-3 py-1 text-background">
            HOPPSANN
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed md:text-lg">
          I shoot photos, cut video, and write code. Three crafts, one loud and
          deliberate aesthetic. Pick a door below and step inside.
        </p>
      </section>

      {/* 3 big cards */}
      <section aria-labelledby="work-heading">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="work-heading" className="font-display text-2xl md:text-3xl">
            PICK A DOOR →
          </h2>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground md:inline">
            3 / Disciplines
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {cards.map(({ href, title, subtitle, bg, text, Icon, tag }) => (
            <Link
              key={href}
              href={href}
              className={`group relative flex min-h-[320px] flex-col justify-between border-brutal-thick ${bg} ${text} p-6 shadow-brutal shadow-brutal-hover md:min-h-[420px] md:p-8`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs uppercase tracking-widest">
                  / {tag}
                </span>
                <div className="grid size-12 place-items-center border-[3px] border-foreground bg-background text-foreground md:size-14">
                  <Icon className="size-6 md:size-7" aria-hidden="true" />
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="break-words font-display text-4xl leading-[0.95] md:text-3xl lg:text-5xl">
                  {title.toUpperCase()}
                </h3>
                <p className="mt-2 font-mono text-sm md:text-xs lg:text-base">
                  {subtitle}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 border-[3px] border-foreground bg-background px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground">
                  Enter
                  <ArrowUpRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Mini about strip */}
      <section className="mt-16 grid grid-cols-1 gap-6 md:mt-24 md:grid-cols-3 md:gap-8">
        <div className="border-brutal bg-background p-6 shadow-brutal-sm md:col-span-2">
          <h2 className="font-display text-2xl md:text-3xl">WHY THIS SITE?</h2>
          <p className="mt-3 text-pretty leading-relaxed">
            Because portfolios shouldn&apos;t whisper. This is a collection of
            the work I&apos;m proud of and the tools I use to make it. If
            something catches your eye — reach out.
          </p>
        </div>
        <div className="border-brutal bg-foreground p-6 text-background shadow-brutal-sm">
          <p className="font-mono text-xs uppercase tracking-widest opacity-70">
            Let&apos;s talk
          </p>
          <p className="mt-2 font-display text-xl leading-tight md:text-2xl">
            hello@
            <br />
            hoppsann.com
          </p>
        </div>
      </section>
    </div>
  )
}
