import { NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
  ADMIN_PASSWORD_COOKIE_NAME,
  getAdminPasskeyChallengeCookieOptions,
  getAdminPasswordCookieOptions,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth"

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
  response.cookies.set(ADMIN_PASSWORD_COOKIE_NAME, "", {
    ...getAdminPasswordCookieOptions(isHttps),
    maxAge: 0,
  })
  response.cookies.set(ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME, "", {
    ...getAdminPasskeyChallengeCookieOptions(isHttps),
    maxAge: 0,
  })

  return response
}
