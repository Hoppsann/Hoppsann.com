"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminApiResponse } from "@/lib/admin-api"

type LoginState = {
  status: "idle" | "success" | "error"
  message: string
}

const INITIAL_STATE: LoginState = {
  status: "idle",
  message: "",
}

export function AdminLoginForm() {
  const router = useRouter()
  const [state, setState] = useState<LoginState>(INITIAL_STATE)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setIsPending(true)
    setState(INITIAL_STATE)

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json()) as AdminApiResponse

      setState({
        status: payload.ok ? "success" : "error",
        message: payload.message,
      })

      if (payload.ok) {
        router.refresh()
      }
    } catch {
      setState({
        status: "error",
        message: "Login failed. Try refreshing the page and trying again.",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border-brutal-thick bg-background p-6 shadow-brutal md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-xl border-[3px] border-foreground bg-accent shadow-brutal-sm">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-3xl leading-none">ADMIN ACCESS</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the code to unlock uploads and content management.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <label htmlFor="admin-code" className="font-display text-xs uppercase tracking-[0.2em]">
            Access code
          </label>
          <Input
            id="admin-code"
            name="code"
            type="password"
            autoComplete="current-password"
            placeholder="Enter code"
            className="h-12 rounded-xl border-[3px] border-foreground bg-background px-4 font-mono shadow-brutal-sm"
          />
        </div>

        {state.status !== "idle" && (
          <p
            className={`rounded-xl border-[3px] px-4 py-3 text-sm shadow-brutal-sm ${
              state.status === "error"
                ? "border-foreground bg-accent text-accent-foreground"
                : "border-foreground bg-[color:var(--brand-cyan)] text-foreground"
            }`}
          >
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={isPending}
          className="h-12 w-full rounded-xl border-[3px] border-foreground bg-foreground font-display text-xs uppercase tracking-[0.2em] text-background shadow-brutal-sm hover:bg-foreground/90"
        >
          {isPending ? "Unlocking..." : "Unlock admin"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        The code is read from the server-side <code>ADMIN_ACCESS_CODE</code> value.
      </p>
    </section>
  )
}
