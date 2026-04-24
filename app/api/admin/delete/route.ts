import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isAdminAuthenticated } from "@/lib/admin-auth"
import { removePortfolioEntry, type PortfolioEntryKind } from "@/lib/portfolio-store"

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function revalidatePortfolioPages(kind: PortfolioEntryKind) {
  revalidatePath("/admin")

  if (kind === "photo") {
    revalidatePath("/photography")
  }

  if (kind === "video") {
    revalidatePath("/videography")
  }

  if (kind === "repository") {
    revalidatePath("/it")
  }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unlock the admin page before editing content.",
      },
      { status: 401 },
    )
  }

  const formData = await request.formData()
  const id = getTextValue(formData, "id")
  const kind = getTextValue(formData, "kind") as PortfolioEntryKind

  if (!id || !["photo", "video", "repository"].includes(kind)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid delete request.",
      },
      { status: 400 },
    )
  }

  await removePortfolioEntry(kind, id)
  revalidatePortfolioPages(kind)

  return NextResponse.json({
    ok: true,
    message: "Entry removed.",
  })
}
