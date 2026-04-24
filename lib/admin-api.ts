export type AdminApiResponse = {
  ok: boolean
  message: string
  step?: "password" | "setup-passkey" | "verify-passkey" | "authenticated"
}
