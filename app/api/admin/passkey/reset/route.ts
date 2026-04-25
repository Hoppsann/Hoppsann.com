import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionCookieOptions,
  isAdminAuthenticated,
} from "@/lib/admin-auth"
import { resetAdminPasskeys } from "@/lib/admin-passkeys"

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      {
        ok: false,
        message: "You must be logged in to reset your passkeys.",
      },
      { status: 401 },
    )
  }

  try {
    await resetAdminPasskeys()
    revalidatePath("/admin")

    const isHttps = new URL(request.url).protocol === "https:"
    const response = NextResponse.json({
      ok: true,
      message: "Passkeys have been reset.",
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Failed to reset passkeys.",
      },
      { status: 500 },
    )
  }
}
