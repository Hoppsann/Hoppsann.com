import { VideoGallery } from "@/components/video-gallery"

export const metadata = {
  title: "Videography — Hoppsann",
  description: "Video work by Hoppsann — click any thumbnail to play.",
}

export default function VideographyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
      <header className="mb-8 md:mb-12">
        <p className="inline-block rounded-md border-[3px] border-foreground bg-secondary px-3 py-1 font-display text-xs uppercase tracking-widest text-secondary-foreground shadow-brutal-sm">
          02 / Videography
        </p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
          MOTION
          <br />
          <span className="inline-block rounded-lg bg-foreground px-3 py-1 text-background">
            PICTURES.
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-pretty leading-relaxed">
          Short films, music videos, commercial cuts, and experiments. Click a
          tile to play.
        </p>
      </header>

      <VideoGallery />
    </div>
  )
}
