import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { addPhotoEntry } from "@/lib/portfolio-store"

function getTextValue(formData: FormData, key: string, index: number) {
  const value = formData.get(`${key}-${index}`)
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

function revalidatePortfolioPages() {
  revalidatePath("/admin")
  revalidatePath("/photography")
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unlock the admin page before uploading.",
      },
      { status: 401 },
    )
  }

  const formData = await request.formData()
  const count = parseInt(formData.get("count") as string, 10) || 0

  if (count <= 0) {
    return NextResponse.json(
      { ok: false, message: "No files to upload." },
      { status: 400 },
    )
  }

  const results = []

  for (let i = 0; i < count; i++) {
    const name = getTextValue(formData, "name", i)
    const description = getTextValue(formData, "description", i)
    const filters = parseFilters(getTextValue(formData, "filters", i))
    const file = formData.get(`file-${i}`)

    // Skip if no file provided
    if (!(file instanceof File) || file.size === 0) {
      continue
    }

    // Validate required fields
    if (!name || !description || filters.length === 0) {
      results.push({
        success: false,
        filename: file.name,
        error: "Name, description, and at least one filter are required.",
      })
      continue
    }

    try {
      const photo = await addPhotoEntry({ name, description, filters, file })
      results.push({
        success: true,
        filename: file.name,
        id: photo.id,
      })
    } catch (error) {
      results.push({
        success: false,
        filename: file.name,
        error: error instanceof Error ? error.message : "Upload failed.",
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  if (successCount > 0) {
    revalidatePortfolioPages()
  }

  return NextResponse.json({
    ok: failureCount === 0,
    message:
      failureCount === 0
        ? `${successCount} photo${successCount !== 1 ? "s" : ""} uploaded.`
        : `${successCount} uploaded, ${failureCount} failed.`,
    results,
  })
}
