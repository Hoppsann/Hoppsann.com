import "server-only"

import { createHash, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

export const ADMIN_COOKIE_NAME = "hoppsann-admin-session"
export const ADMIN_PASSWORD_COOKIE_NAME = "hoppsann-admin-password"
export const ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME = "hoppsann-admin-passkey-challenge"
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

export function getAdminSessionValue() {
  return createHash("sha256")
    .update(`${SESSION_SALT}:${getAdminAccessCode()}`)
    .digest("hex")
}

export function getAdminPasswordVerificationValue() {
  return createHash("sha256")
    .update(`${SESSION_SALT}:password:${getAdminAccessCode()}`)
    .digest("hex")
}

export function getAdminSessionCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 12,
  }
}

export function getAdminPasswordCookieOptions(secure = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 30,
  }
}

export function getAdminPasskeyChallengeCookieOptions(
  secure = process.env.NODE_ENV === "production",
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 15,
  }
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

export async function isAdminPasswordVerified() {
  const cookieStore = await cookies()
  const passwordCookie = cookieStore.get(ADMIN_PASSWORD_COOKIE_NAME)?.value

  if (!passwordCookie) {
    return false
  }

  return safeCompare(passwordCookie, getAdminPasswordVerificationValue())
}
