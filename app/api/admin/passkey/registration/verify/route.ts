import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server"
import {
  ADMIN_COOKIE_NAME,
  ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME,
  ADMIN_PASSWORD_COOKIE_NAME,
  getAdminPasskeyChallengeCookieOptions,
  getAdminPasswordCookieOptions,
  getAdminSessionCookieOptions,
  getAdminSessionValue,
  isAdminPasswordVerified,
} from "@/lib/admin-auth"
import { getAdminWebAuthnUserID, saveAdminPasskey } from "@/lib/admin-passkeys"
import { getAdminRelyingParty } from "@/lib/admin-webauthn"

export async function POST(request: Request) {
  if (!(await isAdminPasswordVerified())) {
    return NextResponse.json(
      {
        ok: false,
        message: "Enter the admin password again before registering a passkey.",
      },
      { status: 401 },
    )
  }

  const url = new URL(request.url)
  const isHttps = url.protocol === "https:"
  const { origin, rpID } = getAdminRelyingParty(request)
  const body = (await request.json()) as RegistrationResponseJSON
  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get(ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME)?.value

  if (!expectedChallenge) {
    return NextResponse.json(
      {
        ok: false,
        message: "The passkey setup expired. Enter the password again and retry.",
      },
      { status: 400 },
    )
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return NextResponse.json(
        {
          ok: false,
          message: "Passkey setup could not be verified.",
        },
        { status: 400 },
      )
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo

    await saveAdminPasskey({
      credential,
      webauthnUserID: await getAdminWebAuthnUserID(),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    })

    revalidatePath("/admin")

    const response = NextResponse.json({
      ok: true,
      message: "Passkey saved. Admin access unlocked.",
      step: "authenticated",
    })

    response.cookies.set(ADMIN_COOKIE_NAME, getAdminSessionValue(), getAdminSessionCookieOptions(isHttps))
    response.cookies.set(ADMIN_PASSWORD_COOKIE_NAME, "", {
      ...getAdminPasswordCookieOptions(isHttps),
      maxAge: 0,
    })
    response.cookies.set(ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME, "", {
      ...getAdminPasskeyChallengeCookieOptions(isHttps),
      maxAge: 0,
    })

    return response
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Passkey setup failed.",
      },
      { status: 400 },
    )
  }
}
