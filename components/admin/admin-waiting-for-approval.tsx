"use client"

import { Mail } from "lucide-react"

export function AdminWaitingForApproval() {
  return (
    <section className="mx-auto max-w-xl rounded-2xl border-brutal-thick bg-background p-6 shadow-brutal md:p-8">
      <div className="flex items-center gap-3">
        <div className="grid size-14 place-items-center rounded-xl border-[3px] border-foreground bg-[color:var(--brand-cyan)] shadow-brutal-sm">
          <Mail className="size-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-3xl leading-none">CHECK YOUR EMAIL</p>
          <p className="mt-2 text-sm text-muted-foreground">
            An approval request has been sent to your admin email.
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border-[3px] border-foreground bg-muted/40 p-4 shadow-brutal-sm">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Click the <strong>Approve</strong> link in your email to complete the login. The link expires in 15 minutes.
        </p>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Didn't receive an email? Check your spam folder or refresh the page to request a new approval link.
      </p>
    </section>
  )
}
