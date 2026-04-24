import { NextResponse } from "next/server"
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionCookieOptions,
  getAdminSessionValue,
  isAdminCodeValid,
} from "@/lib/admin-auth"

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

  const response = NextResponse.json({
    ok: true,
    message: "Admin unlocked.",
  })

  response.cookies.set(
    ADMIN_COOKIE_NAME,
    getAdminSessionValue(),
    getAdminSessionCookieOptions(isHttps),
  )

  return response
}
