"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Play, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Video = {
  id: string
  title: string
  client: string
  year: string
  duration: string
  category: "Commercial" | "Music Video" | "Short Film" | "Doc"
  thumbnail: string
  // Using a public MP4 from Google's sample storage. Replace with real sources.
  src: string
  accent: "yellow" | "pink" | "cyan"
}

const videos: Video[] = [
  {
    id: "v1",
    title: "Neon District",
    client: "Self-initiated",
    year: "2026",
    duration: "01:32",
    category: "Short Film",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    accent: "pink",
  },
  {
    id: "v2",
    title: "Sunroom",
    client: "Local Brewery",
    year: "2025",
    duration: "00:45",
    category: "Commercial",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    accent: "yellow",
  },
  {
    id: "v3",
    title: "Rooftop Signal",
    client: "Band: KOI",
    year: "2025",
    duration: "03:12",
    category: "Music Video",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    accent: "cyan",
  },
  {
    id: "v4",
    title: "Slow Coast",
    client: "Travel Board",
    year: "2025",
    duration: "02:05",
    category: "Doc",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    accent: "pink",
  },
  {
    id: "v5",
    title: "Static Bloom",
    client: "Self-initiated",
    year: "2024",
    duration: "01:10",
    category: "Short Film",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    accent: "yellow",
  },
  {
    id: "v6",
    title: "Night Run",
    client: "Atletic Co.",
    year: "2024",
    duration: "00:30",
    category: "Commercial",
    thumbnail: "/placeholder.svg?height=900&width=1600",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    accent: "cyan",
  },
]

const accentMap = {
  yellow: "bg-secondary text-secondary-foreground",
  pink: "bg-accent text-accent-foreground",
  cyan: "bg-[color:var(--brand-cyan)] text-foreground",
} as const

export function VideoGallery() {
  const [active, setActive] = useState<Video | null>(null)

  // Close modal on Escape
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null)
    }
    document.addEventListener("keydown", onKey)
    // Lock body scroll
    const original = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = original
    }
  }, [active])

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setActive(v)}
            className="group flex flex-col overflow-hidden rounded-2xl border-brutal-thick bg-background text-left shadow-brutal shadow-brutal-hover"
            aria-label={`Play ${v.title}`}
          >
            <div className="relative aspect-video w-full overflow-hidden border-b-[3px] border-foreground">
              <Image
                src={v.thumbnail || "/placeholder.svg"}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors group-hover:bg-foreground/10">
                <span
                  className={cn(
                    "grid size-16 place-items-center rounded-full border-[4px] border-foreground shadow-brutal-sm transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5",
                    accentMap[v.accent],
                  )}
                >
                  <Play className="size-6" fill="currentColor" aria-hidden="true" />
                </span>
              </div>
              <span className="absolute right-2 top-2 rounded-md border-[3px] border-foreground bg-background px-2 py-0.5 font-mono text-xs">
                {v.duration}
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-sm border-[2px] border-foreground px-2 py-0.5 font-display text-[10px] uppercase tracking-wider",
                      accentMap[v.accent],
                    )}
                  >
                    {v.category}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {v.year}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-xl leading-tight">
                  {v.title.toUpperCase()}
                </h3>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {v.client}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.title} video player`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/70 p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-2xl border-brutal-thick bg-background shadow-brutal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[3px] border-foreground px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "shrink-0 rounded-sm border-[2px] border-foreground px-2 py-0.5 font-display text-[10px] uppercase tracking-wider",
                    accentMap[active.accent],
                  )}
                >
                  {active.category}
                </span>
                <p className="truncate font-display text-lg md:text-xl">
                  {active.title.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setActive(null)}
                aria-label="Close video"
                className="grid size-10 shrink-0 place-items-center rounded-md border-[3px] border-foreground bg-accent shadow-brutal-sm transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-foreground">
              <video
                key={active.id}
                src={active.src}
                controls
                autoPlay
                playsInline
                className="size-full"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-[3px] border-foreground px-4 py-3 font-mono text-xs">
              <span>
                {active.client} · {active.year}
              </span>
              <span className="text-muted-foreground">
                ESC or click outside to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
