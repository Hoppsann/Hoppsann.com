import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import {
  ADMIN_COOKIE_NAME,
  ADMIN_APPROVAL_COOKIE_NAME,
  getAdminSessionCookieOptions,
  getAdminSessionValue,
} from "@/lib/admin-auth"
import { validateApprovalToken } from "@/lib/admin-login-approvals"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message: "No approval token provided.",
      },
      { status: 400 },
    )
  }

  const isValid = await validateApprovalToken(token)

  if (!isValid) {
    return NextResponse.json(
      {
        ok: false,
        message: "This approval link is invalid or has expired.",
      },
      { status: 400 },
    )
  }

  const isHttps = url.protocol === "https:"

  revalidatePath("/admin")

  const response = NextResponse.json({
    ok: true,
    message: "Login approved! Redirecting...",
  })

  // Set session cookie
  response.cookies.set(ADMIN_COOKIE_NAME, getAdminSessionValue(), getAdminSessionCookieOptions(isHttps))

  // Clear approval token cookie
  response.cookies.set(ADMIN_APPROVAL_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(isHttps),
    maxAge: 0,
  })

  // Redirect to admin page after a moment
  return NextResponse.redirect(new URL("/admin", url.origin), { status: 303 })
}
