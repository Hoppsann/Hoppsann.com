"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ExternalLink,
  Film,
  Github,
  LogOut,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BulkUploadManager } from "@/components/admin/bulk-upload-manager"
import type { AdminApiResponse } from "@/lib/admin-api"
import type {
  PortfolioContent,
  PortfolioEntryKind,
  PortfolioPhoto,
  PortfolioVideo,
  RepositoryCard,
} from "@/lib/portfolio-store"

type AdminDashboardProps = {
  content: PortfolioContent
}

type MessageState = {
  status: "idle" | "success" | "error"
  message: string
}

type SectionCardProps = {
  title: string
  kicker: string
  description: string
  count: number
  children: React.ReactNode
}

type SectionListProps = {
  kind: PortfolioEntryKind
  entries: Array<PortfolioPhoto | PortfolioVideo | RepositoryCard>
  onDelete: (kind: PortfolioEntryKind, id: string) => Promise<void>
}

const IDLE_MESSAGE: MessageState = {
  status: "idle",
  message: "",
}

async function postForm(endpoint: string, formData: FormData) {
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  })

  return (await response.json()) as AdminApiResponse
}

function SectionCard({ title, kicker, description, count, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border-brutal-thick bg-background p-6 shadow-brutal">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {kicker}
          </p>
          <h2 className="mt-2 font-display text-3xl leading-none">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="rounded-xl border-[3px] border-foreground bg-secondary px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-secondary-foreground shadow-brutal-sm">
          {count} items
        </div>
      </div>

      <div className="mt-6">{children}</div>
    </section>
  )
}

function StatusMessage({ state }: { state: MessageState }) {
  if (state.status === "idle") {
    return null
  }

  return (
    <p
      className={`rounded-xl border-[3px] px-4 py-3 text-sm shadow-brutal-sm ${
        state.status === "error"
          ? "border-foreground bg-accent text-accent-foreground"
          : "border-foreground bg-[color:var(--brand-cyan)] text-foreground"
      }`}
    >
      {state.message}
    </p>
  )
}

function ItemFilters({ filters }: { filters: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {filters.map((filter) => (
        <li
          key={filter}
          className="rounded-md border-[2px] border-foreground bg-background px-2 py-1 font-display text-[10px] uppercase tracking-[0.15em]"
        >
          {filter}
        </li>
      ))}
    </ul>
  )
}

function DeleteEntryButton({
  kind,
  id,
  onDelete,
}: {
  kind: PortfolioEntryKind
  id: string
  onDelete: (kind: PortfolioEntryKind, id: string) => Promise<void>
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleDelete() {
    setIsPending(true)

    try {
      await onDelete(kind, id)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleDelete}
      className="h-10 rounded-xl border-[3px] border-foreground bg-accent px-3 font-display text-[11px] uppercase tracking-[0.2em] text-accent-foreground shadow-brutal-sm hover:bg-accent/90"
    >
      <Trash2 className="size-4" aria-hidden="true" />
      {isPending ? "Removing..." : "Remove"}
    </Button>
  )
}

function SectionList({ kind, entries, onDelete }: SectionListProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border-[3px] border-dashed border-foreground/60 bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
        Nothing added here yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <article
          key={entry.id}
          className="flex flex-col gap-4 rounded-xl border-[3px] border-foreground bg-muted/30 p-4 shadow-brutal-sm lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="min-w-0 flex-1">
            {"src" in entry && kind === "photo" && (
              <img
                src={entry.src}
                alt={entry.name}
                className="mb-4 h-28 w-full rounded-xl border-[3px] border-foreground object-cover sm:w-48"
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl leading-none">{entry.name}</p>
              <span className="rounded-md border-[2px] border-foreground bg-background px-2 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {kind}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {entry.description}
            </p>

            <ItemFilters filters={entry.filters} />

            {"repoUrl" in entry && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={entry.repoUrl}
                  className="inline-flex items-center gap-2 rounded-xl border-[3px] border-foreground bg-background px-3 py-2 font-display text-[11px] uppercase tracking-[0.2em] shadow-brutal-sm"
                >
                  Repo
                  <Github className="size-4" aria-hidden="true" />
                </Link>
                {entry.liveUrl && (
                  <Link
                    href={entry.liveUrl}
                    className="inline-flex items-center gap-2 rounded-xl border-[3px] border-foreground bg-background px-3 py-2 font-display text-[11px] uppercase tracking-[0.2em] shadow-brutal-sm"
                  >
                    Live
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
            )}

            {"src" in entry && kind === "video" && (
              <p className="mt-4 font-mono text-xs text-muted-foreground">{entry.src}</p>
            )}
          </div>

          <DeleteEntryButton kind={kind} id={entry.id} onDelete={onDelete} />
        </article>
      ))}
    </div>
  )
}

function PhotoManager({
  photos,
  onDelete,
}: {
  photos: PortfolioPhoto[]
  onDelete: (kind: PortfolioEntryKind, id: string) => Promise<void>
}) {
  const router = useRouter()
  const [state, setState] = useState<MessageState>(IDLE_MESSAGE)
  const [isPending, setIsPending] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setIsPending(true)
    setState(IDLE_MESSAGE)

    try {
      const payload = await postForm("/api/admin/photos", formData)

      setState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        form.reset()
        router.refresh()
      }
    } catch {
      setState({
        status: "error",
        message: "Photo upload failed. Try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <SectionCard
      title="Photos"
      kicker="01 / Upload"
      description="Upload image files and give each one a name, description and comma-separated filters."
      count={photos.length}
    >
      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => setBulkMode(false)}
          className={`rounded-lg border-[2px] px-3 py-2 font-display text-xs uppercase tracking-[0.2em] ${
            !bulkMode
              ? "border-foreground bg-foreground text-background shadow-brutal-xs"
              : "border-foreground bg-background text-foreground shadow-brutal-xs hover:bg-muted"
          }`}
        >
          Single
        </Button>
        <Button
          onClick={() => setBulkMode(true)}
          className={`rounded-lg border-[2px] px-3 py-2 font-display text-xs uppercase tracking-[0.2em] ${
            bulkMode
              ? "border-foreground bg-foreground text-background shadow-brutal-xs"
              : "border-foreground bg-background text-foreground shadow-brutal-xs hover:bg-muted"
          }`}
        >
          Bulk
        </Button>
      </div>

      {bulkMode ? (
        <BulkUploadManager kind="photo" endpoint="/api/admin/photos/bulk" />
      ) : (
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="photo-name" className="font-display text-xs uppercase tracking-[0.2em]">
                Name
              </label>
              <Input
                id="photo-name"
                name="name"
                placeholder="Midnight Portrait"
                className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="photo-filters"
                className="font-display text-xs uppercase tracking-[0.2em]"
              >
                Filters
              </label>
              <Input
                id="photo-filters"
                name="filters"
                placeholder="portrait, studio, neon"
                className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="photo-description"
              className="font-display text-xs uppercase tracking-[0.2em]"
            >
              Description
            </label>
            <Textarea
              id="photo-description"
              name="description"
              placeholder="What the image shows or why it matters."
              className="min-h-28 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="photo-file" className="font-display text-xs uppercase tracking-[0.2em]">
              Upload image
            </label>
            <Input
              id="photo-file"
              name="file"
              type="file"
              accept="image/*"
              className="h-12 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm file:font-display"
            />
          </div>

          <StatusMessage state={state} />

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90"
          >
            <Upload className="size-4" aria-hidden="true" />
            {isPending ? "Uploading..." : "Add photo"}
          </Button>
        </form>
      )}

      <div className="mt-8">
        <SectionList kind="photo" entries={photos} onDelete={onDelete} />
      </div>
    </SectionCard>
  )
}

function VideoManager({
  videos,
  onDelete,
}: {
  videos: PortfolioVideo[]
  onDelete: (kind: PortfolioEntryKind, id: string) => Promise<void>
}) {
  const router = useRouter()
  const [state, setState] = useState<MessageState>(IDLE_MESSAGE)
  const [isPending, setIsPending] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setIsPending(true)
    setState(IDLE_MESSAGE)

    try {
      const payload = await postForm("/api/admin/videos", formData)

      setState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        form.reset()
        router.refresh()
      }
    } catch {
      setState({
        status: "error",
        message: "Video upload failed. Try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <SectionCard
      title="Videos"
      kicker="02 / Upload"
      description="Upload a video file and assign the text metadata that will appear on the videography page."
      count={videos.length}
    >
      <div className="mb-4 flex gap-2">
        <Button
          onClick={() => setBulkMode(false)}
          className={`rounded-lg border-[2px] px-3 py-2 font-display text-xs uppercase tracking-[0.2em] ${
            !bulkMode
              ? "border-foreground bg-foreground text-background shadow-brutal-xs"
              : "border-foreground bg-background text-foreground shadow-brutal-xs hover:bg-muted"
          }`}
        >
          Single
        </Button>
        <Button
          onClick={() => setBulkMode(true)}
          className={`rounded-lg border-[2px] px-3 py-2 font-display text-xs uppercase tracking-[0.2em] ${
            bulkMode
              ? "border-foreground bg-foreground text-background shadow-brutal-xs"
              : "border-foreground bg-background text-foreground shadow-brutal-xs hover:bg-muted"
          }`}
        >
          Bulk
        </Button>
      </div>

      {bulkMode ? (
        <BulkUploadManager kind="video" endpoint="/api/admin/videos/bulk" />
      ) : (
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="video-name" className="font-display text-xs uppercase tracking-[0.2em]">
                Name
              </label>
              <Input
                id="video-name"
                name="name"
                placeholder="Live Session Cut"
                className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="video-filters"
                className="font-display text-xs uppercase tracking-[0.2em]"
              >
                Filters
              </label>
              <Input
                id="video-filters"
                name="filters"
                placeholder="music video, performance, edit"
                className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="video-description"
              className="font-display text-xs uppercase tracking-[0.2em]"
            >
              Description
            </label>
            <Textarea
              id="video-description"
              name="description"
              placeholder="What viewers should know before opening it."
              className="min-h-28 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="video-file" className="font-display text-xs uppercase tracking-[0.2em]">
              Upload video
            </label>
            <Input
              id="video-file"
              name="file"
              type="file"
              accept="video/*"
              className="h-12 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm file:font-display"
            />
          </div>

          <StatusMessage state={state} />

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90"
          >
            <Film className="size-4" aria-hidden="true" />
            {isPending ? "Uploading..." : "Add video"}
          </Button>
        </form>
      )}

      <div className="mt-8">
        <SectionList kind="video" entries={videos} onDelete={onDelete} />
      </div>
    </SectionCard>
  )
}

function RepositoryManager({
  repositories,
  onDelete,
}: {
  repositories: RepositoryCard[]
  onDelete: (kind: PortfolioEntryKind, id: string) => Promise<void>
}) {
  const router = useRouter()
  const [state, setState] = useState<MessageState>(IDLE_MESSAGE)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setIsPending(true)
    setState(IDLE_MESSAGE)

    try {
      const payload = await postForm("/api/admin/repositories", formData)

      setState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        form.reset()
        router.refresh()
      }
    } catch {
      setState({
        status: "error",
        message: "Repository card failed to save. Try again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <SectionCard
      title="Repository Cards"
      kicker="03 / Projects"
      description="Create the cards shown on the IT page with repository links, optional live links and your own filters."
      count={repositories.length}
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="repo-name" className="font-display text-xs uppercase tracking-[0.2em]">
              Name
            </label>
            <Input
              id="repo-name"
              name="name"
              placeholder="Portfolio CMS"
              className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="repo-filters"
              className="font-display text-xs uppercase tracking-[0.2em]"
            >
              Filters
            </label>
            <Input
              id="repo-filters"
              name="filters"
              placeholder="next.js, typescript, cms"
              className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="repo-description"
            className="font-display text-xs uppercase tracking-[0.2em]"
          >
            Description
          </label>
          <Textarea
            id="repo-description"
            name="description"
            placeholder="A short summary that explains the project and why it matters."
            className="min-h-28 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="repo-url"
              className="font-display text-xs uppercase tracking-[0.2em]"
            >
              Repository URL
            </label>
            <Input
              id="repo-url"
              name="repoUrl"
              type="url"
              placeholder="https://github.com/..."
              className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="live-url"
              className="font-display text-xs uppercase tracking-[0.2em]"
            >
              Live URL (optional)
            </label>
            <Input
              id="live-url"
              name="liveUrl"
              type="url"
              placeholder="https://example.com"
              className="h-11 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm"
            />
          </div>
        </div>

        <StatusMessage state={state} />

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90"
        >
          <Github className="size-4" aria-hidden="true" />
          {isPending ? "Saving..." : "Add repository card"}
        </Button>
      </form>

      <div className="mt-8">
        <SectionList kind="repository" entries={repositories} onDelete={onDelete} />
      </div>
    </SectionCard>
  )
}

export function AdminDashboard({ content }: AdminDashboardProps) {
  const router = useRouter()
  const [topState, setTopState] = useState<MessageState>(IDLE_MESSAGE)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isResettingPasskey, setIsResettingPasskey] = useState(false)

  async function handleDelete(kind: PortfolioEntryKind, id: string) {
    const formData = new FormData()
    formData.set("kind", kind)
    formData.set("id", id)

    const payload = await postForm("/api/admin/delete", formData)

    setTopState({
      status: payload.ok ? "success" : "error",
      message: payload.message,
    })

    if (payload.ok) {
      router.refresh()
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    setTopState(IDLE_MESSAGE)

    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
      })
      const payload = (await response.json()) as AdminApiResponse

      setTopState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        router.refresh()
      }
    } catch {
      setTopState({
        status: "error",
        message: "Logout failed. Refresh the page and try again.",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  async function handleResetPasskey() {
    setIsResettingPasskey(true)
    setTopState(IDLE_MESSAGE)

    try {
      const response = await fetch("/api/admin/passkey/reset", {
        method: "POST",
      })
      const payload = (await response.json()) as AdminApiResponse

      setTopState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        router.refresh()
      }
    } catch {
      setTopState({
        status: "error",
        message: "Failed to reset passkeys. Try again.",
      })
    } finally {
      setIsResettingPasskey(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border-brutal-thick bg-foreground p-6 text-background shadow-brutal md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-background/70">
              Protected workspace
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              ADMIN
              <br />
              CONTROL.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-background/80 md:text-base">
              Upload media, create repository cards, and manage what shows up on
              the public site.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border-[3px] border-background bg-[color:var(--brand-cyan)] px-4 py-3 font-display text-xs uppercase tracking-[0.2em] text-foreground shadow-brutal-sm">
              {content.photos.length} photos
            </div>
            <div className="rounded-xl border-[3px] border-background bg-secondary px-4 py-3 font-display text-xs uppercase tracking-[0.2em] text-secondary-foreground shadow-brutal-sm">
              {content.videos.length} videos
            </div>
            <div className="rounded-xl border-[3px] border-background bg-accent px-4 py-3 font-display text-xs uppercase tracking-[0.2em] text-accent-foreground shadow-brutal-sm">
              {content.repositories.length} repos
            </div>
            <Button
              type="button"
              disabled={isResettingPasskey}
              onClick={handleResetPasskey}
              className="h-12 rounded-xl border-[3px] border-background bg-background px-4 font-display text-xs uppercase tracking-[0.2em] text-foreground shadow-brutal-sm hover:bg-background/90"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              {isResettingPasskey ? "Resetting..." : "Reset 2FA"}
            </Button>
            <Button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="h-12 rounded-xl border-[3px] border-background bg-background px-4 font-display text-xs uppercase tracking-[0.2em] text-foreground shadow-brutal-sm hover:bg-background/90"
            >
              <LogOut className="size-4" aria-hidden="true" />
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <StatusMessage state={topState} />
        </div>
      </section>

      <div className="grid gap-8">
        <PhotoManager photos={content.photos} onDelete={handleDelete} />
        <VideoManager videos={content.videos} onDelete={handleDelete} />
        <RepositoryManager repositories={content.repositories} onDelete={handleDelete} />
      </div>
    </div>
  )
}
