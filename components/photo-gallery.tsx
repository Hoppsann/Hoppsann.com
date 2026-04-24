"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type Photo = {
  id: string
  src: string
  alt: string
  category: "Animals" | "Architecture" | "Nature" | "Portraits" | "Street"
  width: number
  height: number
}

const photos: Photo[] = [
  {
    id: "p1",
    src: "/placeholder.svg?height=900&width=700",
    alt: "Red fox sitting in tall grass at dusk",
    category: "Animals",
    width: 700,
    height: 900,
  },
  {
    id: "p2",
    src: "/placeholder.svg?height=600&width=800",
    alt: "Concrete brutalist facade with dramatic shadows",
    category: "Architecture",
    width: 800,
    height: 600,
  },
  {
    id: "p3",
    src: "/placeholder.svg?height=1000&width=700",
    alt: "Misty pine forest at sunrise",
    category: "Nature",
    width: 700,
    height: 1000,
  },
  {
    id: "p4",
    src: "/placeholder.svg?height=800&width=800",
    alt: "Close-up portrait with harsh studio light",
    category: "Portraits",
    width: 800,
    height: 800,
  },
  {
    id: "p5",
    src: "/placeholder.svg?height=700&width=900",
    alt: "Neon-lit street at night, pedestrians crossing",
    category: "Street",
    width: 900,
    height: 700,
  },
  {
    id: "p6",
    src: "/placeholder.svg?height=1100&width=800",
    alt: "Bald eagle mid-flight over water",
    category: "Animals",
    width: 800,
    height: 1100,
  },
  {
    id: "p7",
    src: "/placeholder.svg?height=900&width=900",
    alt: "Sharp architectural lines of a museum",
    category: "Architecture",
    width: 900,
    height: 900,
  },
  {
    id: "p8",
    src: "/placeholder.svg?height=800&width=1200",
    alt: "Mountain ridge at golden hour",
    category: "Nature",
    width: 1200,
    height: 800,
  },
  {
    id: "p9",
    src: "/placeholder.svg?height=1200&width=800",
    alt: "Black and white portrait of an older man",
    category: "Portraits",
    width: 800,
    height: 1200,
  },
  {
    id: "p10",
    src: "/placeholder.svg?height=900&width=700",
    alt: "Cat perched on a windowsill",
    category: "Animals",
    width: 700,
    height: 900,
  },
  {
    id: "p11",
    src: "/placeholder.svg?height=700&width=1000",
    alt: "Cyclist blurring past a brick wall",
    category: "Street",
    width: 1000,
    height: 700,
  },
  {
    id: "p12",
    src: "/placeholder.svg?height=1000&width=800",
    alt: "Reflective skyscraper against clouds",
    category: "Architecture",
    width: 800,
    height: 1000,
  },
  {
    id: "p13",
    src: "/placeholder.svg?height=800&width=800",
    alt: "Waterfall cascading through green moss",
    category: "Nature",
    width: 800,
    height: 800,
  },
  {
    id: "p14",
    src: "/placeholder.svg?height=1100&width=700",
    alt: "Young woman with colorful backdrop",
    category: "Portraits",
    width: 700,
    height: 1100,
  },
  {
    id: "p15",
    src: "/placeholder.svg?height=700&width=900",
    alt: "Rainy market with yellow umbrellas",
    category: "Street",
    width: 900,
    height: 700,
  },
  {
    id: "p16",
    src: "/placeholder.svg?height=900&width=800",
    alt: "Dog jumping into a lake",
    category: "Animals",
    width: 800,
    height: 900,
  },
]

const categories = ["All", "Animals", "Architecture", "Nature", "Portraits", "Street"] as const
type Category = (typeof categories)[number]

const categoryColors: Record<Category, string> = {
  All: "bg-foreground text-background",
  Animals: "bg-accent text-accent-foreground",
  Architecture: "bg-secondary text-secondary-foreground",
  Nature: "bg-[color:var(--brand-cyan)] text-foreground",
  Portraits: "bg-accent text-accent-foreground",
  Street: "bg-secondary text-secondary-foreground",
}

export function PhotoGallery() {
  const [active, setActive] = useState<Category>("All")

  const filtered = useMemo(
    () => (active === "All" ? photos : photos.filter((p) => p.category === active)),
    [active],
  )

  return (
    <div>
      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Photo categories"
        className="mb-8 flex flex-wrap gap-3 rounded-xl border-brutal bg-background p-3 shadow-brutal-sm"
      >
        {categories.map((cat) => {
          const isActive = active === cat
          return (
            <button
              key={cat}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(cat)}
              className={cn(
                "inline-flex items-center rounded-md border-[3px] border-foreground px-4 py-2 font-display text-sm uppercase tracking-wider shadow-brutal-sm transition-transform",
                "hover:-translate-x-0.5 hover:-translate-y-0.5",
                isActive ? "bg-foreground text-background" : "bg-background text-foreground",
              )}
            >
              {cat}
              <span
                className={cn(
                  "ml-2 inline-block rounded-sm border-[2px] border-current px-1.5 text-[10px]",
                  isActive ? "bg-background text-foreground" : "bg-foreground text-background",
                )}
              >
                {cat === "All" ? photos.length : photos.filter((p) => p.category === cat).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Masonry using CSS columns */}
      <div className="columns-1 gap-4 sm:columns-2 md:gap-6 lg:columns-3 xl:columns-4">
        {filtered.map((p) => (
          <figure
            key={p.id}
            className="mb-4 break-inside-avoid overflow-hidden rounded-xl border-brutal bg-background shadow-brutal-sm transition-transform duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal md:mb-6"
          >
            <div className="relative w-full" style={{ aspectRatio: `${p.width} / ${p.height}` }}>
              <Image
                src={p.src || "/placeholder.svg"}
                alt={p.alt}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="flex items-center justify-between border-t-[3px] border-foreground px-3 py-2">
              <span className="truncate font-mono text-xs">{p.alt}</span>
              <span
                className={cn(
                  "ml-2 shrink-0 rounded-sm border-[2px] border-foreground px-2 py-0.5 font-display text-[10px] uppercase tracking-wider",
                  categoryColors[p.category],
                )}
              >
                {p.category}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border-brutal bg-background p-10 text-center shadow-brutal-sm">
          <p className="font-display text-2xl">NO PHOTOS HERE YET.</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Try another category.
          </p>
        </div>
      )}
    </div>
  )
}
