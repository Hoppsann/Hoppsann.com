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
      message: "Passkeys have been reset. You'll need to set up a new one on your next login.",
    })

    // Clear the session so they have to log in again
    response.cookies.set(ADMIN_COOKIE_NAME, "", {
      ...getAdminSessionCookieOptions(isHttps),
      maxAge: 0,
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
