import { NextResponse } from "next/server"
import { ADMIN_APPROVAL_COOKIE_NAME, getAdminSessionCookieOptions } from "@/lib/admin-auth"
import { denyApprovalToken } from "@/lib/admin-login-approvals"

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

  await denyApprovalToken(token)

  const isHttps = url.protocol === "https:"

  const response = NextResponse.json({
    ok: true,
    message: "Login denied.",
  })

  // Clear approval token cookie
  response.cookies.set(ADMIN_APPROVAL_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(isHttps),
    maxAge: 0,
  })

  // Redirect back to login page
  return NextResponse.redirect(new URL("/admin", url.origin), { status: 303 })
}
