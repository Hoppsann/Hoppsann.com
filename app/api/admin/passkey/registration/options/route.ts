import { NextResponse } from "next/server"
import { generateRegistrationOptions } from "@simplewebauthn/server"
import {
  ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
  getAdminPasskeyChallengeCookieOptions,
  isAdminPasswordVerified,
} from "@/lib/admin-auth"
import {
  getAdminCredentialDescriptors,
  getAdminWebAuthnUserID,
  getAdminWebAuthnUserIDBytes,
} from "@/lib/admin-passkeys"
import { getAdminRelyingParty } from "@/lib/admin-webauthn"

export async function POST(request: Request) {
  if (!(await isAdminPasswordVerified())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enter the admin password again before setting up a passkey.",
      },
      { status: 401 },
    )
  }

  const isHttps = new URL(request.url).protocol === "https:"
  const { rpID, rpName } = getAdminRelyingParty(request)
  const excludeCredentials = await getAdminCredentialDescriptors()

  const optionsJSON = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: "hoppsann-admin",
    userDisplayName: "Hoppsann Admin",
    userID: await getAdminWebAuthnUserIDBytes(),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
    preferredAuthenticatorType: "remoteDevice",
  })

  const response = NextResponse.json({
    ok: true,
    message: "Use your phone or passkey provider to create the passkey.",
    optionsJSON,
    webauthnUserID: await getAdminWebAuthnUserID(),
  })

  response.cookies.set(
    ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
    optionsJSON.challenge,
    getAdminPasskeyChallengeCookieOptions(isHttps),
  )

  return response
}
