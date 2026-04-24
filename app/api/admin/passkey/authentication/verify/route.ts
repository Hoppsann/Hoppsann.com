import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server"
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
import {
  getAdminWebAuthnCredential,
  updateAdminPasskeyCounter,
} from "@/lib/admin-passkeys"
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

  const url = new URL(request.url)
  const isHttps = url.protocol === "https:"
  const { origin, rpID } = getAdminRelyingParty(request)
  const body = (await request.json()) as AuthenticationResponseJSON
  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get(ADMIN_PASSKEY_CHALLENGE_COOKIE_NAME)?.value

  if (!expectedChallenge) {
    return NextResponse.json(
      {
        ok: false,
        message: "The passkey prompt expired. Enter the password again and retry.",
      },
      { status: 400 },
    )
  }

  const credential = await getAdminWebAuthnCredential(body.id)

  if (!credential) {
    return NextResponse.json(
      {
        ok: false,
        message: "That passkey is not registered for admin access.",
      },
      { status: 404 },
    )
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential,
      requireUserVerification: true,
    })

    if (!verification.verified) {
      return NextResponse.json(
        {
          ok: false,
          message: "Passkey approval could not be verified.",
        },
        { status: 400 },
      )
    }

    await updateAdminPasskeyCounter({
      id: verification.authenticationInfo.credentialID,
      counter: verification.authenticationInfo.newCounter,
      deviceType: verification.authenticationInfo.credentialDeviceType,
      backedUp: verification.authenticationInfo.credentialBackedUp,
    })

    revalidatePath("/admin")

    const response = NextResponse.json({
      ok: true,
      message: "Passkey approved. Admin access unlocked.",
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
        message: error instanceof Error ? error.message : "Passkey approval failed.",
      },
      { status: 400 },
    )
  }
}
