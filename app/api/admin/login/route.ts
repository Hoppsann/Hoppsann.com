import { NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
  ADMIN_PASSWORD_COOKIE_NAME,
  getAdminPasskeyChallengeCookieOptions,
  getAdminPasswordCookieOptions,
  getAdminPasswordVerificationValue,
  getAdminSessionCookieOptions,
  isAdminCodeValid,
} from "@/lib/admin-auth"
import { hasAdminPasskeys } from "@/lib/admin-passkeys"

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: Request) {
  const isHttps = new URL(request.url).protocol === "https:"
  const formData = await request.formData()
  const code = getTextValue(formData, "code")

  if (!code) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enter the admin code to continue.",
      },
      { status: 400 },
    )
  }

  if (!isAdminCodeValid(code)) {
    return NextResponse.json(
      {
        ok: false,
        message: "That code didn't match.",
      },
      { status: 401 },
    )
  }

  const hasPasskeys = await hasAdminPasskeys()

  const response = NextResponse.json({
    ok: true,
    message: hasPasskeys
      ? "Password accepted. Approve the login with your passkey."
      : "Password accepted. Set up your passkey to finish securing admin access.",
    step: hasPasskeys ? "verify-passkey" : "setup-passkey",
  })

  response.cookies.set(ADMIN_PASSWORD_COOKIE_NAME, getAdminPasswordVerificationValue(), getAdminPasswordCookieOptions(isHttps))
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions(isHttps),
    maxAge: 0,
  })
  response.cookies.set(ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME, "", {
    ...getAdminPasskeyChallengeCookieOptions(isHttps),
    maxAge: 0,
  })

  return response
}
