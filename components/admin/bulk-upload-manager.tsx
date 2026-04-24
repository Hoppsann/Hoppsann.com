"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminApiResponse } from "@/lib/admin-api"

type BulkUploadManagerProps = {
  kind: "photo" | "video"
  endpoint: string
}

type FileWithMetadata = {
  file: File
  name: string
  description: string
  filters: string
  id: string
}

type MessageState = {
  status: "idle" | "success" | "error"
  message: string
}

const IDLE_MESSAGE: MessageState = {
  status: "idle",
  message: "",
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

export function BulkUploadManager({ kind, endpoint }: BulkUploadManagerProps) {
  const router = useRouter()
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [state, setState] = useState<MessageState>(IDLE_MESSAGE)
  const [isPending, setIsPending] = useState(false)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.currentTarget.files || [])

    const newFiles = selectedFiles.map((file) => ({
      file,
      name: "",
      description: "",
      filters: "",
      id: crypto.randomUUID(),
    }))

    setFiles([...files, ...newFiles])
  }

  function removeFile(id: string) {
    setFiles(files.filter((f) => f.id !== id))
  }

  function updateFile(id: string, field: "name" | "description" | "filters", value: string) {
    setFiles(
      files.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (files.length === 0) {
      setState({
        status: "error",
        message: "Please select at least one file.",
      })
      return
    }

    // Validate all files have required metadata
    const invalidFile = files.find(
      (f) => !f.name.trim() || !f.description.trim() || !f.filters.trim(),
    )

    if (invalidFile) {
      setState({
        status: "error",
        message: "All files need a name, description, and filters.",
      })
      return
    }

    setIsPending(true)
    setState(IDLE_MESSAGE)

    try {
      const formData = new FormData()
      formData.append("count", files.length.toString())

      files.forEach((f, index) => {
        formData.append(`file-${index}`, f.file)
        formData.append(`name-${index}`, f.name.trim())
        formData.append(`description-${index}`, f.description.trim())
        formData.append(`filters-${index}`, f.filters.trim())
      })

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as AdminApiResponse & {
        results?: Array<{
          success: boolean
          filename: string
          error?: string
        }>
      }

      setState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        setFiles([])
        router.refresh()
      }
    } catch {
      setState({
        status: "error",
        message: `${kind.charAt(0).toUpperCase() + kind.slice(1)} upload failed. Try again.`,
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Input */}
      <div className="space-y-2">
        <label
          htmlFor="bulk-files"
          className="font-display text-xs uppercase tracking-[0.2em]"
        >
          Select {kind}s (multiple files)
        </label>
        <Input
          id="bulk-files"
          type="file"
          multiple
          accept={kind === "photo" ? "image/*" : "video/*"}
          onChange={handleFileSelect}
          disabled={isPending}
          className="h-12 rounded-xl border-[3px] border-foreground bg-background shadow-brutal-sm file:font-display"
        />
      </div>

      {/* Files List with Metadata */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-sm uppercase tracking-[0.2em]">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </p>
            <Button
              type="button"
              onClick={() => setFiles([])}
              disabled={isPending}
              className="h-8 rounded-lg border-[2px] border-foreground bg-background px-3 font-display text-xs uppercase tracking-[0.2em] text-foreground shadow-brutal-xs hover:bg-muted"
            >
              Clear all
            </Button>
          </div>

          {files.map((file) => (
            <div
              key={file.id}
              className="rounded-xl border-[3px] border-foreground bg-muted p-4 shadow-brutal-sm"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-muted-foreground">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  disabled={isPending}
                  className="rounded-lg border-[2px] border-foreground bg-accent p-1 text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor={`name-${file.id}`}
                    className="font-display text-xs uppercase tracking-[0.2em]"
                  >
                    Name
                  </label>
                  <Input
                    id={`name-${file.id}`}
                    value={file.name}
                    onChange={(e) => updateFile(file.id, "name", e.target.value)}
                    placeholder="e.g., Midnight Portrait"
                    disabled={isPending}
                    className="h-9 rounded-lg border-[2px] border-foreground bg-background shadow-brutal-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor={`filters-${file.id}`}
                    className="font-display text-xs uppercase tracking-[0.2em]"
                  >
                    Tags
                  </label>
                  <Input
                    id={`filters-${file.id}`}
                    value={file.filters}
                    onChange={(e) => updateFile(file.id, "filters", e.target.value)}
                    placeholder="portrait, studio, neon"
                    disabled={isPending}
                    className="h-9 rounded-lg border-[2px] border-foreground bg-background shadow-brutal-xs"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <label
                  htmlFor={`description-${file.id}`}
                  className="font-display text-xs uppercase tracking-[0.2em]"
                >
                  Description
                </label>
                <Textarea
                  id={`description-${file.id}`}
                  value={file.description}
                  onChange={(e) => updateFile(file.id, "description", e.target.value)}
                  placeholder="What this image/video shows..."
                  disabled={isPending}
                  className="min-h-20 rounded-lg border-[2px] border-foreground bg-background shadow-brutal-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <StatusMessage state={state} />

      <Button
        type="submit"
        disabled={isPending || files.length === 0}
        className="h-12 w-full rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90 disabled:opacity-50"
      >
        <Upload className="size-4" aria-hidden="true" />
        {isPending ? `Uploading ${files.length} file${files.length !== 1 ? "s" : ""}...` : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
      </Button>
    </form>
  )
}
