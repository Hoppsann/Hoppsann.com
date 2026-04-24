import Link from "next/link"
import { ArrowUpRight, Github, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

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

type Project = {
  title: string
  description: string
  stack: string[]
  live?: string
  repo?: string
  color: "yellow" | "pink" | "cyan" | "black"
}

const projects: Project[] = [
  {
    title: "Pixel Market",
    description:
      "An indie-friendly marketplace for pixel artists. Custom auth, Stripe payouts, and a CMS built from scratch.",
    stack: ["Next.js", "TypeScript", "Postgres", "Stripe"],
    live: "#",
    repo: "#",
    color: "pink",
  },
  {
    title: "Bleep Radio",
    description:
      "A weird little web radio that streams community-uploaded loops with a visualizer that reacts to the audio.",
    stack: ["React", "Web Audio API", "Canvas"],
    live: "#",
    repo: "#",
    color: "yellow",
  },
  {
    title: "Fjord CMS",
    description:
      "A minimalist headless CMS for photographers. Handles galleries, EXIF metadata and signed image URLs.",
    stack: ["Node.js", "Fastify", "S3", "Sharp"],
    repo: "#",
    color: "cyan",
  },
  {
    title: "Brutalist UI Kit",
    description:
      "A small open-source component library with chunky borders, offset shadows and accessible defaults.",
    stack: ["React", "Tailwind", "Radix"],
    live: "#",
    repo: "#",
    color: "black",
  },
  {
    title: "Lens Log",
    description:
      "Personal photography journal with map-based browsing, location clustering and private sharing.",
    stack: ["Next.js", "MapLibre", "Supabase"],
    live: "#",
    color: "pink",
  },
  {
    title: "Tinybench",
    description:
      "A CLI for running quick microbenchmarks across Node versions. Pretty output, JSON export, CI-friendly.",
    stack: ["Node.js", "TypeScript"],
    repo: "#",
    color: "yellow",
  },
]

const cardColorMap: Record<Project["color"], string> = {
  yellow: "bg-secondary text-secondary-foreground",
  pink: "bg-accent text-accent-foreground",
  cyan: "bg-[color:var(--brand-cyan)] text-foreground",
  black: "bg-foreground text-background",
}

export default function ITPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-10 md:mb-14">
        <p className="inline-block border-[3px] border-foreground bg-[color:var(--brand-cyan)] px-3 py-1 font-display text-xs uppercase tracking-widest shadow-brutal-sm">
          03 / IT &amp; Code
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
          I BUILD
          <br />
          <span className="inline-block bg-foreground px-3 py-1 text-background">
            ON THE WEB.
          </span>
        </h1>
      </header>

      {/* About blurb */}
      <section className="mb-12 grid grid-cols-1 gap-6 md:mb-16 md:grid-cols-3 md:gap-8">
        <div className="border-brutal bg-background p-6 shadow-brutal-sm md:col-span-2">
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
        <aside className="border-brutal bg-foreground p-6 text-background shadow-brutal-sm">
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
            className="mt-5 inline-flex items-center gap-2 border-[3px] border-background bg-[color:var(--brand-cyan)] px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground"
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
        <div className="border-brutal bg-background p-4 shadow-brutal-sm md:p-6">
          <ul className="flex flex-wrap gap-3">
            {skills.map((s) => (
              <li
                key={s.name}
                className={cn(
                  "inline-flex items-center gap-2 border-[3px] border-foreground px-3 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm",
                  levelStyles[s.level],
                )}
              >
                {s.name}
                <span className="border-[2px] border-foreground bg-background px-1.5 py-0.5 font-mono text-[10px] text-foreground">
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
            PROJECTS /
          </h2>
          <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground md:inline">
            {projects.length} / Shipped
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {projects.map((p) => (
            <article
              key={p.title}
              className={cn(
                "flex flex-col justify-between border-brutal-thick p-6 shadow-brutal shadow-brutal-hover md:p-7",
                cardColorMap[p.color],
              )}
            >
              <div>
                <h3 className="font-display text-2xl leading-tight md:text-3xl">
                  {p.title.toUpperCase()}
                </h3>
                <p className="mt-3 text-pretty leading-relaxed">{p.description}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.stack.map((t) => (
                    <li
                      key={t}
                      className="border-[2px] border-foreground bg-background px-2 py-1 font-mono text-xs text-foreground"
                    >
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {p.live && (
                  <Link
                    href={p.live}
                    className="inline-flex items-center gap-2 border-[3px] border-foreground bg-background px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground shadow-brutal-sm"
                  >
                    Live
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                )}
                {p.repo && (
                  <Link
                    href={p.repo}
                    className="inline-flex items-center gap-2 border-[3px] border-foreground bg-background px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground shadow-brutal-sm"
                  >
                    Code
                    <Github className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
