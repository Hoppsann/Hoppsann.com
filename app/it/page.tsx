import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { RepositoryGallery } from "@/components/repository-gallery"
import { cn } from "@/lib/utils"
import { getPortfolioContent } from "@/lib/portfolio-store"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "IT — Hoppsann",
  description: "Code, tooling and product work by Hoppsann.",
}

type Skill = { name: string; level: "Core" | "Strong" | "Comfortable" }

const skills: Skill[] = [
  { name: "HTML", level: "Core" },
  { name: "CSS", level: "Core" },
  { name: "JavaScript", level: "Core" },
  { name: "TypeScript", level: "Strong" },
  { name: "React", level: "Strong" },
  { name: "Next.js", level: "Strong" },
  { name: "Tailwind CSS", level: "Strong" },
  { name: "Node.js", level: "Strong" },
  { name: "PostgreSQL", level: "Comfortable" },
  { name: "Python", level: "Comfortable" },
  { name: "Git / GitHub", level: "Strong" },
  { name: "Figma", level: "Comfortable" },
]

const levelStyles: Record<Skill["level"], string> = {
  Core: "bg-accent text-accent-foreground",
  Strong: "bg-secondary text-secondary-foreground",
  Comfortable: "bg-[color:var(--brand-cyan)] text-foreground",
}

export default async function ITPage() {
  const content = await getPortfolioContent()

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-10 md:mb-14">
        <p className="inline-block rounded-md border-[3px] border-foreground bg-[color:var(--brand-cyan)] px-3 py-1 font-display text-xs uppercase tracking-widest shadow-brutal-sm">
          03 / IT &amp; Code
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
          I BUILD
          <br />
          <span className="inline-block rounded-lg bg-foreground px-3 py-1 text-background">
            ON THE WEB.
          </span>
        </h1>
      </header>

      {/* About blurb */}
      <section className="mb-12 grid grid-cols-1 gap-6 md:mb-16 md:grid-cols-3 md:gap-8">
        <div className="rounded-xl border-brutal bg-background p-6 shadow-brutal-sm md:col-span-2">
          <h2 className="font-display text-2xl md:text-3xl">ABOUT MY WORK</h2>
          <p className="mt-3 text-pretty leading-relaxed">
            I build opinionated web apps — mostly with TypeScript, React and
            Postgres. I care about craft: strong fundamentals, accessible
            interfaces, fast pages and code that&apos;s kind to whoever reads
            it next. I&apos;m happiest somewhere between product design and
            backend plumbing.
          </p>
          <p className="mt-3 text-pretty leading-relaxed">
            Lately I&apos;ve been making tools for creative people —
            photographers, musicians, small studios — and the occasional weird
            side project just for fun.
          </p>
        </div>
        <aside className="rounded-xl border-brutal bg-foreground p-6 text-background shadow-brutal-sm">
          <p className="font-mono text-xs uppercase tracking-widest opacity-70">
            Available for
          </p>
          <ul className="mt-3 space-y-2 font-display text-lg leading-tight">
            <li>· Freelance builds</li>
            <li>· Short consults</li>
            <li>· Interesting chats</li>
          </ul>
          <Link
            href="mailto:hello@hoppsann.com"
            className="mt-5 inline-flex items-center gap-2 rounded-md border-[3px] border-background bg-[color:var(--brand-cyan)] px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground"
          >
            Get in touch
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>

      {/* Skills */}
      <section aria-labelledby="skills-heading" className="mb-12 md:mb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="skills-heading" className="font-display text-3xl md:text-4xl">
            SKILLS /
          </h2>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground md:inline">
            {skills.length} / Tech
          </span>
        </div>
        <div className="rounded-xl border-brutal bg-background p-4 shadow-brutal-sm md:p-6">
          <ul className="flex flex-wrap gap-3">
            {skills.map((s) => (
              <li
                key={s.name}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border-[3px] border-foreground px-3 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm",
                  levelStyles[s.level],
                )}
              >
                {s.name}
                <span className="rounded-sm border-[2px] border-foreground bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {s.level}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Projects */}
      <section aria-labelledby="projects-heading">
        <div className="mb-6 flex items-end justify-between">
          <h2 id="projects-heading" className="font-display text-3xl md:text-4xl">
            REPOSITORIES /
          </h2>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground md:inline">
            {content.repositories.length} / Added
          </span>
        </div>

        <RepositoryGallery repositories={content.repositories} />
      </section>
    </div>
  )
}
