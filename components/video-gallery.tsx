"use client"

import { useEffect, useMemo, useState } from "react"
import { Play, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PortfolioVideo } from "@/lib/portfolio-store"

type VideoGalleryProps = {
  videos: PortfolioVideo[]
}

const accentMap = [
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-[color:var(--brand-cyan)] text-foreground",
] as const

function getAccent(index: number) {
  return accentMap[index % accentMap.length]
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const availableFilters = useMemo(
    () =>
      Array.from(
        new Set(
          videos.flatMap((video) => video.filters).filter(Boolean),
        ),
      ),
    [videos],
  )
  const [activeFilter, setActiveFilter] = useState("All")
  const [activeVideo, setActiveVideo] = useState<PortfolioVideo | null>(null)

  useEffect(() => {
    if (activeFilter !== "All" && !availableFilters.includes(activeFilter)) {
      setActiveFilter("All")
    }
  }, [activeFilter, availableFilters])

  const filteredVideos = useMemo(
    () =>
      activeFilter === "All"
        ? videos
        : videos.filter((video) => video.filters.includes(activeFilter)),
    [activeFilter, videos],
  )

  useEffect(() => {
    if (!activeVideo) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveVideo(null)
      }
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [activeVideo])

  return (
    <>
      {availableFilters.length > 0 && (
        <div
          role="tablist"
          aria-label="Video filters"
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
              {videos.length}
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
                  isActive ? getAccent(index) : "bg-background text-foreground",
                )}
              >
                {filter}
                <span className="ml-2 rounded-sm border-[2px] border-current px-1.5 text-[10px]">
                  {videos.filter((video) => video.filters.includes(filter)).length}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {filteredVideos.map((video, index) => (
            <button
              key={video.id}
              type="button"
              onClick={() => setActiveVideo(video)}
              className="group flex flex-col overflow-hidden rounded-2xl border-brutal-thick bg-background text-left shadow-brutal shadow-brutal-hover"
              aria-label={`Play ${video.name}`}
            >
              <div className="relative aspect-video w-full overflow-hidden border-b-[3px] border-foreground bg-foreground">
                <video
                  src={video.src}
                  preload="metadata"
                  muted
                  playsInline
                  className="size-full object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-foreground/25 transition-colors group-hover:bg-foreground/10">
                  <span
                    className={cn(
                      "grid size-16 place-items-center rounded-full border-[4px] border-foreground shadow-brutal-sm transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5",
                      getAccent(index),
                    )}
                  >
                    <Play className="size-6" fill="currentColor" aria-hidden="true" />
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                <div>
                  <h3 className="font-display text-2xl leading-tight">
                    {video.name.toUpperCase()}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {video.description}
                  </p>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {video.filters.map((filter, filterIndex) => (
                    <li
                      key={`${video.id}-${filter}`}
                      className={cn(
                        "rounded-sm border-[2px] border-foreground px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em]",
                        getAccent(filterIndex),
                      )}
                    >
                      {filter}
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-brutal bg-background p-10 text-center shadow-brutal-sm">
          <p className="font-display text-2xl">NO VIDEOS HERE YET.</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Upload some clips from the admin page to populate this section.
          </p>
        </div>
      )}

      {activeVideo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${activeVideo.name} video player`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border-brutal-thick bg-background shadow-brutal-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-foreground px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-display text-lg md:text-xl">
                  {activeVideo.name.toUpperCase()}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {activeVideo.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video"
                className="grid size-10 shrink-0 place-items-center rounded-md border-[3px] border-foreground bg-accent shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="aspect-video w-full bg-foreground">
              <video
                key={activeVideo.id}
                src={activeVideo.src}
                controls
                autoPlay
                playsInline
                className="size-full"
              />
            </div>

            <div className="border-t-[3px] border-foreground px-4 py-3">
              <ul className="flex flex-wrap gap-2">
                {activeVideo.filters.map((filter, index) => (
                  <li
                    key={`${activeVideo.id}-${filter}`}
                    className={cn(
                      "rounded-sm border-[2px] border-foreground px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em]",
                      getAccent(index),
                    )}
                  >
                    {filter}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
