"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, Github } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RepositoryCard } from "@/lib/portfolio-store"

type RepositoryGalleryProps = {
  repositories: RepositoryCard[]
}

const cardColors = [
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-[color:var(--brand-cyan)] text-foreground",
  "bg-foreground text-background",
] as const

function getCardColor(index: number) {
  return cardColors[index % cardColors.length]
}

export function RepositoryGallery({ repositories }: RepositoryGalleryProps) {
  const availableFilters = useMemo(
    () =>
      Array.from(
        new Set(
          repositories.flatMap((repository) => repository.filters).filter(Boolean),
        ),
      ),
    [repositories],
  )
  const [activeFilter, setActiveFilter] = useState("All")

  useEffect(() => {
    if (activeFilter !== "All" && !availableFilters.includes(activeFilter)) {
      setActiveFilter("All")
    }
  }, [activeFilter, availableFilters])

  const filteredRepositories = useMemo(
    () =>
      activeFilter === "All"
        ? repositories
        : repositories.filter((repository) => repository.filters.includes(activeFilter)),
    [activeFilter, repositories],
  )

  return (
    <div>
      {availableFilters.length > 0 && (
        <div
          role="tablist"
          aria-label="Repository filters"
          className="mb-8 flex flex-wrap gap-3 rounded-xl border-brutal bg-background p-3 shadow-brutal-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === "All"}
            onClick={() => setActiveFilter("All")}
            className={cn(
              "inline-flex items-center rounded-md border-[3px] border-foreground px-4 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5",
              activeFilter === "All" ? "bg-foreground text-background" : "bg-background text-foreground",
            )}
          >
            All
            <span className="ml-2 rounded-sm border-[2px] border-current px-1.5 text-[10px]">
              {repositories.length}
            </span>
          </button>

          {availableFilters.map((filter, index) => {
            const isActive = activeFilter === filter

            return (
              <button
                key={filter}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "inline-flex items-center rounded-md border-[3px] border-foreground px-4 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5",
                  isActive ? getCardColor(index) : "bg-background text-foreground",
                )}
              >
                {filter}
                <span className="ml-2 rounded-sm border-[2px] border-current px-1.5 text-[10px]">
                  {repositories.filter((repository) => repository.filters.includes(filter)).length}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {filteredRepositories.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {filteredRepositories.map((repository, index) => (
            <article
              key={repository.id}
              className={cn(
                "flex flex-col justify-between rounded-2xl border-brutal-thick p-6 shadow-brutal shadow-brutal-hover md:p-7",
                getCardColor(index),
              )}
            >
              <div>
                <h3 className="font-display text-2xl leading-tight md:text-3xl">
                  {repository.name.toUpperCase()}
                </h3>
                <p className="mt-3 text-pretty leading-relaxed">{repository.description}</p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {repository.filters.map((filter) => (
                    <li
                      key={`${repository.id}-${filter}`}
                      className="rounded-sm border-[2px] border-foreground bg-background px-2 py-1 font-mono text-xs text-foreground"
                    >
                      {filter}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={repository.repoUrl}
                  className="inline-flex items-center gap-2 rounded-md border-[3px] border-foreground bg-background px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground shadow-brutal-sm"
                >
                  Code
                  <Github className="size-4" aria-hidden="true" />
                </Link>
                {repository.liveUrl && (
                  <Link
                    href={repository.liveUrl}
                    className="inline-flex items-center gap-2 rounded-md border-[3px] border-foreground bg-background px-3 py-2 font-display text-xs uppercase tracking-widest text-foreground shadow-brutal-sm"
                  >
                    Live
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-brutal bg-background p-10 text-center shadow-brutal-sm">
          <p className="font-display text-2xl">NO REPOSITORIES HERE YET.</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Add repository cards from the admin page to show them here.
          </p>
        </div>
      )}
    </div>
  )
}
