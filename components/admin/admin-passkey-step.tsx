"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { startAuthentication, startRegistration } from "@simplewebauthn/browser"
import {
  Fingerprint,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AdminApiResponse } from "@/lib/admin-api"

type AdminPasskeyStepProps = {
  mode: "setup" | "authenticate"
}

type PasskeyMessageState = {
  status: "idle" | "success" | "error"
  message: string
}

type RegistrationOptionsPayload = AdminApiResponse & {
  optionsJSON: Parameters<typeof startRegistration>[0]["optionsJSON"]
}

type AuthenticationOptionsPayload = AdminApiResponse & {
  optionsJSON: Parameters<typeof startAuthentication>[0]["optionsJSON"]
}

const IDLE_STATE: PasskeyMessageState = {
  status: "idle",
  message: "",
}

function StatusMessage({ state }: { state: PasskeyMessageState }) {
  if (state.status === "idle") {
    return null
  }

  return (
    <p
      className={`rounded-xl border-[3px] px-4 py-3 text-sm shadow-brutal-sm ${
        state.status === "error"
          ? "border-foreground bg-accent text-accent-foreground"
          : "border-foreground bg-[color:var(--brand-cyan)] text-foreground"
      }`}
    >
      {state.message}
    </p>
  )
}

export function AdminPasskeyStep({ mode }: AdminPasskeyStepProps) {
  const router = useRouter()
  const [state, setState] = useState<PasskeyMessageState>(IDLE_STATE)
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    if (!window.PublicKeyCredential) {
      setState({
        status: "error",
        message: "This browser does not support passkeys/WebAuthn.",
      })
      return
    }

    setIsPending(true)
    setState(IDLE_STATE)

    try {
      if (mode === "setup") {
        const optionsResponse = await fetch("/api/admin/passkey/registration/options", {
          method: "POST",
        })
        const optionsPayload = (await optionsResponse.json()) as RegistrationOptionsPayload

        if (!optionsPayload.ok) {
          setState({ status: "error", message: optionsPayload.message })
          return
        }

        const registrationResponse = await startRegistration({
          optionsJSON: optionsPayload.optionsJSON,
        })

        const verifyResponse = await fetch("/api/admin/passkey/registration/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationResponse),
        })
        const verifyPayload = (await verifyResponse.json()) as AdminApiResponse

        setState({
          status: verifyPayload.ok ? "success" : "error",
          message: verifyPayload.message,
        })

        if (verifyPayload.ok) {
          router.refresh()
        }

        return
      }

      const optionsResponse = await fetch("/api/admin/passkey/authentication/options", {
        method: "POST",
      })
      const optionsPayload = (await optionsResponse.json()) as AuthenticationOptionsPayload

      if (!optionsPayload.ok) {
        setState({ status: "error", message: optionsPayload.message })
        return
      }

      const authenticationResponse = await startAuthentication({
        optionsJSON: optionsPayload.optionsJSON,
      })

      const verifyResponse = await fetch("/api/admin/passkey/authentication/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(authenticationResponse),
      })
      const verifyPayload = (await verifyResponse.json()) as AdminApiResponse

      setState({
        status: verifyPayload.ok ? "success" : "error",
        message: verifyPayload.message,
      })

      if (verifyPayload.ok) {
        router.refresh()
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The passkey step was cancelled or failed."

      setState({
        status: "error",
        message,
      })
    } finally {
      setIsPending(false)
    }
  }

  const isSetup = mode === "setup"

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border-brutal-thick bg-background p-6 shadow-brutal md:p-8">
      <div className="flex items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl border-[3px] border-foreground bg-[color:var(--brand-cyan)] shadow-brutal-sm">
          {isSetup ? (
            <Smartphone className="size-6" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-6" aria-hidden="true" />
          )}
        </div>

        <div>
          <p className="font-display text-3xl leading-none">
            {isSetup ? "SET UP PASSKEY" : "PASSKEY APPROVAL"}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {isSetup
              ? "Your password was accepted. Now register a passkey so future admin logins can ask for phone or device approval."
              : "Your password was accepted. Finish the login by approving the passkey prompt from your phone, browser, or password manager."}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border-[3px] border-foreground bg-muted/40 p-4 shadow-brutal-sm">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Browsers may show a phone sheet, nearby-device prompt, or QR code depending on where
            your passkey lives. If you want phone approval, choose the phone or external device
            option in the browser prompt.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <StatusMessage state={state} />

        <Button
          type="button"
          disabled={isPending}
          onClick={handleClick}
          className="h-12 w-full rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90"
        >
          {isPending
            ? isSetup
              ? "Opening passkey setup..."
              : "Opening passkey prompt..."
            : isSetup
              ? "Set up passkey"
              : "Approve with passkey"}
        </Button>
      </div>
    </section>
  )
}
