import "server-only"

import { randomUUID } from "crypto"
import { mkdir, readFile, unlink, writeFile } from "fs/promises"
import path from "path"

export type PortfolioPhoto = {
  id: string
  name: string
  description: string
  filters: string[]
  src: string
  createdAt: string
}

export type PortfolioVideo = {
  id: string
  name: string
  description: string
  filters: string[]
  src: string
  createdAt: string
}

export type RepositoryCard = {
  id: string
  name: string
  description: string
  filters: string[]
  repoUrl: string
  liveUrl?: string
  createdAt: string
}

export type PortfolioContent = {
  photos: PortfolioPhoto[]
  videos: PortfolioVideo[]
  repositories: RepositoryCard[]
}

export type PortfolioEntryKind = "photo" | "video" | "repository"

type StoredFileTarget = "photos" | "videos"

const DATA_FILE_PATH = path.join(process.cwd(), "data", "portfolio-content.json")
const PUBLIC_DIRECTORY = path.join(process.cwd(), "public")
const UPLOADS_DIRECTORY = path.join(PUBLIC_DIRECTORY, "uploads")
const EMPTY_CONTENT: PortfolioContent = {
  photos: [],
  videos: [],
  repositories: [],
}

const MAX_IMAGE_SIZE = 25 * 1024 * 1024
const MAX_VIDEO_SIZE = 250 * 1024 * 1024

function serializeContent(content: PortfolioContent) {
  return `${JSON.stringify(content, null, 2)}\n`
}

async function ensureContentFile() {
  await mkdir(path.dirname(DATA_FILE_PATH), { recursive: true })

  try {
    await readFile(DATA_FILE_PATH, "utf8")
  } catch {
    await writeFile(DATA_FILE_PATH, serializeContent(EMPTY_CONTENT), "utf8")
  }
}

async function readContentFile() {
  await ensureContentFile()

  const raw = await readFile(DATA_FILE_PATH, "utf8")

  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioContent>

    return {
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      videos: Array.isArray(parsed.videos) ? parsed.videos : [],
      repositories: Array.isArray(parsed.repositories) ? parsed.repositories : [],
    } satisfies PortfolioContent
  } catch {
    return {
      photos: [],
      videos: [],
      repositories: [],
    }
  }
}

async function writeContentFile(content: PortfolioContent) {
  await ensureContentFile()
  await writeFile(DATA_FILE_PATH, serializeContent(content), "utf8")
}

function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function normaliseExtension(filename: string) {
  return path.extname(filename).toLowerCase()
}

function validateUploadedFile(file: File, kind: StoredFileTarget) {
  if (file.size <= 0) {
    throw new Error("Please choose a file before submitting.")
  }

  if (kind === "photos") {
    if (!file.type.startsWith("image/")) {
      throw new Error("Photos must be uploaded as image files.")
    }

    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error("Photo uploads are limited to 25 MB.")
    }
  }

  if (kind === "videos") {
    if (!file.type.startsWith("video/")) {
      throw new Error("Videos must be uploaded as video files.")
    }

    if (file.size > MAX_VIDEO_SIZE) {
      throw new Error("Video uploads are limited to 250 MB.")
    }
  }
}

async function saveUploadedFile(file: File, kind: StoredFileTarget) {
  validateUploadedFile(file, kind)

  const targetDirectory = path.join(UPLOADS_DIRECTORY, kind)
  const baseName = slugifySegment(path.basename(file.name, normaliseExtension(file.name))) || kind
  const extension = normaliseExtension(file.name) || (kind === "photos" ? ".jpg" : ".mp4")
  const filename = `${baseName}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
  const absolutePath = path.join(targetDirectory, filename)
  const fileBuffer = Buffer.from(await file.arrayBuffer())

  await mkdir(targetDirectory, { recursive: true })
  await writeFile(absolutePath, fileBuffer)

  return `/uploads/${kind}/${filename}`
}

function normaliseFilters(filters: string[]) {
  return Array.from(
    new Set(
      filters
        .map((filter) => filter.trim())
        .filter(Boolean),
    ),
  )
}

function safeRelativePublicPath(src: string) {
  const trimmed = src.trim()
  if (!trimmed.startsWith("/uploads/")) {
    return null
  }

  const candidate = path.resolve(PUBLIC_DIRECTORY, `.${trimmed}`)
  const uploadsRoot = path.resolve(UPLOADS_DIRECTORY)
  const relativePath = path.relative(uploadsRoot, candidate)

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return null
  }

  return candidate
}

async function deleteUploadedFile(src: string) {
  const filePath = safeRelativePublicPath(src)

  if (!filePath) {
    return
  }

  try {
    await unlink(filePath)
  } catch {
    // Ignore missing files so the JSON can still be cleaned up.
  }
}

export async function getPortfolioContent() {
  return readContentFile()
}

export async function addPhotoEntry(input: {
  name: string
  description: string
  filters: string[]
  file: File
}) {
  const content = await readContentFile()
  const photo: PortfolioPhoto = {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description.trim(),
    filters: normaliseFilters(input.filters),
    src: await saveUploadedFile(input.file, "photos"),
    createdAt: new Date().toISOString(),
  }

  content.photos = [photo, ...content.photos]
  await writeContentFile(content)

  return photo
}

export async function addVideoEntry(input: {
  name: string
  description: string
  filters: string[]
  file: File
}) {
  const content = await readContentFile()
  const video: PortfolioVideo = {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description.trim(),
    filters: normaliseFilters(input.filters),
    src: await saveUploadedFile(input.file, "videos"),
    createdAt: new Date().toISOString(),
  }

  content.videos = [video, ...content.videos]
  await writeContentFile(content)

  return video
}

export async function addRepositoryEntry(input: {
  name: string
  description: string
  filters: string[]
  repoUrl: string
  liveUrl?: string
}) {
  const content = await readContentFile()
  const repository: RepositoryCard = {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description.trim(),
    filters: normaliseFilters(input.filters),
    repoUrl: input.repoUrl.trim(),
    liveUrl: input.liveUrl?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }

  content.repositories = [repository, ...content.repositories]
  await writeContentFile(content)

  return repository
}

export async function removePortfolioEntry(kind: PortfolioEntryKind, id: string) {
  const content = await readContentFile()

  if (kind === "photo") {
    const entry = content.photos.find((photo) => photo.id === id)
    content.photos = content.photos.filter((photo) => photo.id !== id)
    await writeContentFile(content)

    if (entry) {
      await deleteUploadedFile(entry.src)
    }

    return
  }

  if (kind === "video") {
    const entry = content.videos.find((video) => video.id === id)
    content.videos = content.videos.filter((video) => video.id !== id)
    await writeContentFile(content)

    if (entry) {
      await deleteUploadedFile(entry.src)
    }

    return
  }

  content.repositories = content.repositories.filter((repository) => repository.id !== id)
  await writeContentFile(content)
}
