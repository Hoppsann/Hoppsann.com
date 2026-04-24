import { PhotoGallery } from "@/components/photo-gallery"

export const metadata = {
  title: "Photography — Hoppsann",
  description: "A masonry gallery of photographs by Hoppsann.",
}

export default function PhotographyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-8 md:mb-12">
        <p className="inline-block border-[3px] border-foreground bg-accent px-3 py-1 font-display text-xs uppercase tracking-widest text-accent-foreground shadow-brutal-sm">
          01 / Photography
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
          FRAMES,
          <br />
          <span className="inline-block bg-foreground px-3 py-1 text-background">
            LOUD &amp; STILL.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-pretty leading-relaxed">
          A curated masonry wall of photographs. Filter by category to see
          exactly what you want.
        </p>
      </header>

      <PhotoGallery />
    </div>
  )
}
