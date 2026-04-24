"use server"

import { revalidatePath } from "next/cache"
import {
  clearAdminSession,
  createAdminSession,
  isAdminAuthenticated,
  isAdminCodeValid,
} from "@/lib/admin-auth"
import {
  addPhotoEntry,
  addRepositoryEntry,
  addVideoEntry,
  removePortfolioEntry,
  type PortfolioEntryKind,
} from "@/lib/portfolio-store"

export type AdminActionState = {
  status: "idle" | "success" | "error"
  message: string
}

export const INITIAL_ADMIN_ACTION_STATE: AdminActionState = {
  status: "idle",
  message: "",
}

function errorState(message: string): AdminActionState {
  return {
    status: "error",
    message,
  }
}

function successState(message: string): AdminActionState {
  return {
    status: "success",
    message,
  }
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function parseFilters(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  )
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

async function refreshPortfolioPages() {
  revalidatePath("/admin")
  revalidatePath("/photography")
  revalidatePath("/videography")
  revalidatePath("/it")
}

export async function authenticateAdmin(
  _previousState: AdminActionState,
  formData: FormData,
) {
  const code = getTextValue(formData, "code")

  if (!code) {
    return errorState("Enter the admin code to continue.")
  }

  if (!isAdminCodeValid(code)) {
    return errorState("That code didn't match.")
  }

  await createAdminSession()
  await refreshPortfolioPages()

  return successState("Admin unlocked.")
}

export async function logoutAdmin() {
  await clearAdminSession()
  revalidatePath("/admin")
}

export async function addPhotoAction(
  _previousState: AdminActionState,
  formData: FormData,
) {
  if (!(await isAdminAuthenticated())) {
    return errorState("Unlock the admin page before uploading.")
  }

  const name = getTextValue(formData, "name")
  const description = getTextValue(formData, "description")
  const filters = parseFilters(getTextValue(formData, "filters"))
  const file = formData.get("file")

  if (!name) {
    return errorState("Photos need a name.")
  }

  if (!description) {
    return errorState("Photos need a description.")
  }

  if (filters.length === 0) {
    return errorState("Add at least one filter for the photo.")
  }

  if (!(file instanceof File)) {
    return errorState("Choose an image file to upload.")
  }

  try {
    await addPhotoEntry({ name, description, filters, file })
    await refreshPortfolioPages()
    return successState("Photo uploaded.")
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Photo upload failed.")
  }
}

export async function addVideoAction(
  _previousState: AdminActionState,
  formData: FormData,
) {
  if (!(await isAdminAuthenticated())) {
    return errorState("Unlock the admin page before uploading.")
  }

  const name = getTextValue(formData, "name")
  const description = getTextValue(formData, "description")
  const filters = parseFilters(getTextValue(formData, "filters"))
  const file = formData.get("file")

  if (!name) {
    return errorState("Videos need a name.")
  }

  if (!description) {
    return errorState("Videos need a description.")
  }

  if (filters.length === 0) {
    return errorState("Add at least one filter for the video.")
  }

  if (!(file instanceof File)) {
    return errorState("Choose a video file to upload.")
  }

  try {
    await addVideoEntry({ name, description, filters, file })
    await refreshPortfolioPages()
    return successState("Video uploaded.")
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Video upload failed.")
  }
}

export async function addRepositoryAction(
  _previousState: AdminActionState,
  formData: FormData,
) {
  if (!(await isAdminAuthenticated())) {
    return errorState("Unlock the admin page before adding repository cards.")
  }

  const name = getTextValue(formData, "name")
  const description = getTextValue(formData, "description")
  const filters = parseFilters(getTextValue(formData, "filters"))
  const repoUrl = getTextValue(formData, "repoUrl")
  const liveUrl = getTextValue(formData, "liveUrl")

  if (!name) {
    return errorState("Repository cards need a name.")
  }

  if (!description) {
    return errorState("Repository cards need a description.")
  }

  if (filters.length === 0) {
    return errorState("Add at least one filter for the repository card.")
  }

  if (!repoUrl || !isHttpUrl(repoUrl)) {
    return errorState("Add a valid repository URL.")
  }

  if (liveUrl && !isHttpUrl(liveUrl)) {
    return errorState("Live URLs need to start with http:// or https://.")
  }

  try {
    await addRepositoryEntry({ name, description, filters, repoUrl, liveUrl })
    await refreshPortfolioPages()
    return successState("Repository card added.")
  } catch (error) {
    return errorState(error instanceof Error ? error.message : "Repository card failed to save.")
  }
}

export async function deletePortfolioEntryAction(formData: FormData) {
  if (!(await isAdminAuthenticated())) {
    return
  }

  const id = getTextValue(formData, "id")
  const kind = getTextValue(formData, "kind") as PortfolioEntryKind

  if (!id || !["photo", "video", "repository"].includes(kind)) {
    return
  }

  await removePortfolioEntry(kind, id)
  await refreshPortfolioPages()
}
