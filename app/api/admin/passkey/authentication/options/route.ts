import { NextResponse } from "next/server"
import { generateAuthenticationOptions } from "@simplewebauthn/server"
import {
  ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
  getAdminPasskeyChallengeCookieOptions,
  isAdminPasswordVerified,
} from "@/lib/admin-auth"
import { getAdminCredentialDescriptors, hasAdminPasskeys } from "@/lib/admin-passkeys"
import { getAdminRelyingParty } from "@/lib/admin-webauthn"

export async function POST(request: Request) {
  if (!(await isAdminPasswordVerified())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enter the admin password again before using your passkey.",
      },
      { status: 401 },
    )
  }

  if (!(await hasAdminPasskeys())) {
    return NextResponse.json(
      {
        ok: false,
        message: "No admin passkeys are registered yet.",
      },
      { status: 400 },
    )
  }

  const isHttps = new URL(request.url).protocol === "https:"
  const { rpID } = getAdminRelyingParty(request)
  const allowCredentials = await getAdminCredentialDescriptors()

  const optionsJSON = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "required",
  })

  const response = NextResponse.json({
    ok: true,
    message: "Approve the sign-in with your passkey.",
    optionsJSON,
  })

  response.cookies.set(
    ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
    optionsJSON.challenge,
    getAdminPasskeyChallengeCookieOptions(isHttps),
  )

  return response
}
