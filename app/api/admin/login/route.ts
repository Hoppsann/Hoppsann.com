import { NextResponse } from "next/server"
import { Resend } from "resend"
import {
  ADMIN_APPROVAL_COOKIE_NAME,
  getAdminApprovalCookieOptions,
  isAdminCodeValid,
} from "@/lib/admin-auth"
import { createPendingApproval } from "@/lib/admin-login-approvals"

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

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

  if (!ADMIN_EMAIL) {
    return NextResponse.json(
      {
        ok: false,
        message: "Email configuration is missing. Contact the site administrator.",
      },
      { status: 500 },
    )
  }

  try {
    // Create a pending approval token
    const approvalToken = await createPendingApproval()

    // Generate approval/denial links
    const baseUrl = new URL(request.url).origin
    const approveUrl = `${baseUrl}/api/admin/login/approve?token=${approvalToken}`
    const denyUrl = `${baseUrl}/api/admin/login/deny?token=${approvalToken}`

    // Send approval email
    const emailResult = await resend.emails.send({
      from: "noreply@resend.dev",
      to: ADMIN_EMAIL,
      subject: "Approve Admin Login",
      html: `
        <h2>Login Approval Required</h2>
        <p>Someone is trying to access the admin panel.</p>
        <p>
          <a href="${approveUrl}" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; margin-right: 10px;">
            ✓ Approve
          </a>
          <a href="${denyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px;">
            ✗ Deny
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">This link expires in 15 minutes.</p>
      `,
    })

    if (emailResult.error) {
      console.error("Resend email error:", emailResult.error)
      throw new Error(`Email failed: ${emailResult.error.message}`)
    }

    // Set approval token in cookie (temporarily)
    const response = NextResponse.json({
      ok: true,
      message: "Check your email for the approval link. You have 15 minutes to approve.",
      step: "waiting-approval",
    })

    response.cookies.set(
      ADMIN_APPROVAL_COOKIE_NAME,
      approvalToken,
      getAdminApprovalCookieOptions(isHttps),
    )

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      {
        ok: false,
        message: "Failed to send approval email. Try again.",
      },
      { status: 500 },
    )
  }
}
