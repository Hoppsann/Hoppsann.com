"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import type { PortfolioPhoto } from "@/lib/portfolio-store"

type PhotoGalleryProps = {
  photos: PortfolioPhoto[]
}

const filterStyles = [
  "bg-foreground text-background",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-[color:var(--brand-cyan)] text-foreground",
] as const

function getFilterStyle(index: number) {
  return filterStyles[index % filterStyles.length]
}

export function PhotoGallery({ photos }: PhotoGalleryProps) {
  const availableFilters = useMemo(
    () =>
      Array.from(
        new Set(
          photos.flatMap((photo) => photo.filters).filter(Boolean),
        ),
      ),
    [photos],
  )
  const [activeFilter, setActiveFilter] = useState("All")

  useEffect(() => {
    if (activeFilter !== "All" && !availableFilters.includes(activeFilter)) {
      setActiveFilter("All")
    }
  }, [activeFilter, availableFilters])

  const filteredPhotos = useMemo(
    () =>
      activeFilter === "All"
        ? photos
        : photos.filter((photo) => photo.filters.includes(activeFilter)),
    [activeFilter, photos],
  )

  return (
    <div>
      {availableFilters.length > 0 && (
        <div
          role="tablist"
          aria-label="Photo filters"
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
              {photos.length}
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
                  isActive ? getFilterStyle(index + 1) : "bg-background text-foreground",
                )}
              >
                {filter}
                <span className="ml-2 rounded-sm border-[2px] border-current px-1.5 text-[10px]">
                  {photos.filter((photo) => photo.filters.includes(filter)).length}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {filteredPhotos.length > 0 ? (
        <div className="columns-1 gap-4 sm:columns-2 md:gap-6 lg:columns-3 xl:columns-4">
          {filteredPhotos.map((photo) => (
            <figure
              key={photo.id}
              className="mb-4 break-inside-avoid overflow-hidden rounded-xl border-brutal bg-background shadow-brutal-sm transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal md:mb-6"
            >
              <img
                src={photo.src}
                alt={photo.description || photo.name}
                className="h-auto w-full object-cover"
              />

              <figcaption className="border-t-[3px] border-foreground px-4 py-3">
                <p className="font-display text-xl leading-none">{photo.name.toUpperCase()}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {photo.description}
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {photo.filters.map((filter, index) => (
                    <li
                      key={`${photo.id}-${filter}`}
                      className={cn(
                        "rounded-sm border-[2px] border-foreground px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em]",
                        getFilterStyle(index + 1),
                      )}
                    >
                      {filter}
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-brutal bg-background p-10 text-center shadow-brutal-sm">
          <p className="font-display text-2xl">NO PHOTOS HERE YET.</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Upload some work from the admin page to fill this wall.
          </p>
        </div>
      )}
    </div>
  )
}
