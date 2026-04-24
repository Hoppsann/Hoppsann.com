import "server-only"

import { createHash, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const ADMIN_COOKIE_NAME = "hoppsann-admin-session"
const SESSION_SALT = "hoppsann-admin-session"
const FALLBACK_ADMIN_CODE = "hoppsann-admin"

function createDigest(value: string) {
  return createHash("sha256").update(value).digest()
}

function safeCompare(left: string, right: string) {
  const leftBuffer = createDigest(left)
  const rightBuffer = createDigest(right)

  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function getAdminAccessCode() {
  return process.env.ADMIN_ACCESS_CODE?.trim() || FALLBACK_ADMIN_CODE
}

function getAdminSessionValue() {
  return createHash("sha256")
    .update(`${SESSION_SALT}:${getAdminAccessCode()}`)
    .digest("hex")
}

export function isAdminCodeValid(candidate: string) {
  const trimmedCandidate = candidate.trim()
  if (!trimmedCandidate) {
    return false
  }

  return safeCompare(trimmedCandidate, getAdminAccessCode())
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value

  if (!sessionCookie) {
    return false
  }

  return safeCompare(sessionCookie, getAdminSessionValue())
}

export async function createAdminSession() {
  const cookieStore = await cookies()

  cookieStore.set(ADMIN_COOKIE_NAME, getAdminSessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}
