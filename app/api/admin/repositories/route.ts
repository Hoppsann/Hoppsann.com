import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { addRepositoryEntry } from "@/lib/portfolio-store"

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

function revalidatePortfolioPages() {
  revalidatePath("/admin")
  revalidatePath("/it")
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unlock the admin page before adding repository cards.",
      },
      { status: 401 },
    )
  }

  const formData = await request.formData()
  const name = getTextValue(formData, "name")
  const description = getTextValue(formData, "description")
  const filters = parseFilters(getTextValue(formData, "filters"))
  const repoUrl = getTextValue(formData, "repoUrl")
  const liveUrl = getTextValue(formData, "liveUrl")

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "Repository cards need a name." },
      { status: 400 },
    )
  }

  if (!description) {
    return NextResponse.json(
      { ok: false, message: "Repository cards need a description." },
      { status: 400 },
    )
  }

  if (filters.length === 0) {
    return NextResponse.json(
      { ok: false, message: "Add at least one filter for the repository card." },
      { status: 400 },
    )
  }

  if (!repoUrl || !isHttpUrl(repoUrl)) {
    return NextResponse.json(
      { ok: false, message: "Add a valid repository URL." },
      { status: 400 },
    )
  }

  if (liveUrl && !isHttpUrl(liveUrl)) {
    return NextResponse.json(
      { ok: false, message: "Live URLs need to start with http:// or https://." },
      { status: 400 },
    )
  }

  try {
    await addRepositoryEntry({ name, description, filters, repoUrl, liveUrl })
    revalidatePortfolioPages()

    return NextResponse.json({
      ok: true,
      message: "Repository card added.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error ? error.message : "Repository card failed to save.",
      },
      { status: 400 },
    )
  }
}
