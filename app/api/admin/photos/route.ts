import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { addPhotoEntry } from "@/lib/portfolio-store"

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
  const name = getTextValue(formData, "name")
  const description = getTextValue(formData, "description")
  const filters = parseFilters(getTextValue(formData, "filters"))
  const file = formData.get("file")

  if (!name) {
    return NextResponse.json({ ok: false, message: "Photos need a name." }, { status: 400 })
  }

  if (!description) {
    return NextResponse.json(
      { ok: false, message: "Photos need a description." },
      { status: 400 },
    )
  }

  if (filters.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Add at least one filter for the photo." },
      { status: 400 },
    )
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Choose an image file to upload." },
      { status: 400 },
    )
  }

  try {
    await addPhotoEntry({ name, description, filters, file })
    revalidatePortfolioPages()

    return NextResponse.json({
      ok: true,
      message: "Photo uploaded.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Photo upload failed.",
      },
      { status: 400 },
    )
  }
}
