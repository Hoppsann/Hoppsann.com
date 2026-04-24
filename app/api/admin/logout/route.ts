import { NextResponse } from "next/server"
import { ADMIN_COOKIE_NAME, getAdminSessionCookieOptions } from "@/lib/admin-auth"

export async function POST(request: Request) {
  const isHttps = new URL(request.url).protocol === "https:"
  const response = NextResponse.json({
    ok: true,
    message: "Logged out.",
  })

  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(isHttps),
    maxAge: 0,
  })

  return response
}
