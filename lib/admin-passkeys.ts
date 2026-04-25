import "server-only"

import { randomBytes } from "crypto"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import type {
  AuthenticatorTransportFuture,
  Base64URLString,
  CredentialDeviceType,
  WebAuthnCredential,
} from "@simplewebauthn/server"
import { Redis } from "@upstash/redis"

export type StoredAdminPasskey = {
  id: Base64URLString
  publicKey: Base64URLString
  counter: number
  webauthnUserID: Base64URLString
  deviceType: CredentialDeviceType
  backedUp: boolean
  transports?: AuthenticatorTransportFuture[]
  createdAt: string
  lastUsedAt?: string
}

type AdminSecurityState = {
  webauthnUserID: Base64URLString
  passkeys: StoredAdminPasskey[]
}

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

const SECURITY_KEY = "admin-security-state"
const SECURITY_FILE = join(process.cwd(), "data", "admin-security.json")

function createEmptyState(): AdminSecurityState {
  return {
    webauthnUserID: randomBytes(32).toString("base64url"),
    passkeys: [],
  }
}

function encodeBuffer(value: Uint8Array) {
  return Buffer.from(value).toString("base64url")
}

function decodeBuffer(value: Base64URLString) {
  return new Uint8Array(Buffer.from(value, "base64url"))
}

async function readSecurityStateFromFile(): Promise<AdminSecurityState> {
  try {
    const fileContent = await readFile(SECURITY_FILE, "utf-8")
    const parsed = JSON.parse(fileContent) as Partial<AdminSecurityState>
    const hasUserID =
      typeof parsed.webauthnUserID === "string" &&
      parsed.webauthnUserID !== "replace-on-first-run"

    if (hasUserID) {
      return {
        webauthnUserID: parsed.webauthnUserID as Base64URLString,
        passkeys: Array.isArray(parsed.passkeys) ? parsed.passkeys : [],
      } satisfies AdminSecurityState
    }
  } catch (error) {
    console.error("Failed to read security state from file:", error)
  }

  return createEmptyState()
}

async function writeSecurityStateToFile(state: AdminSecurityState) {
  try {
    await writeFile(SECURITY_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error("Failed to write security state to file:", error)
  }
}

async function readSecurityState(): Promise<AdminSecurityState> {
  try {
    if (redis) {
      const stored = await redis.get(SECURITY_KEY)
      if (stored) {
        const parsed = JSON.parse(stored as string) as Partial<AdminSecurityState>
        const hasUserID =
          typeof parsed.webauthnUserID === "string" &&
          parsed.webauthnUserID !== "replace-on-first-run"

        if (hasUserID) {
          return {
            webauthnUserID: parsed.webauthnUserID as Base64URLString,
            passkeys: Array.isArray(parsed.passkeys) ? parsed.passkeys : [],
          } satisfies AdminSecurityState
        }
      }
    }

    // Fallback to file-based storage
    const fileState = await readSecurityStateFromFile()
    
    if (fileState.passkeys.length > 0 || fileState.webauthnUserID !== createEmptyState().webauthnUserID) {
      return fileState
    }

    const newState = createEmptyState()
    await writeSecurityState(newState)
    return newState
  } catch (error) {
    console.error("Failed to read security state:", error)
    return createEmptyState()
  }
}

async function writeSecurityState(state: AdminSecurityState) {
  try {
    if (redis) {
      await redis.set(SECURITY_KEY, JSON.stringify(state))
    }

    // Always write to file as well
    await writeSecurityStateToFile(state)
  } catch (error) {
    console.error("Failed to write security state:", error)
  }
}

export async function hasAdminPasskeys() {
  const state = await readSecurityState()
  return state.passkeys.length > 0
}

export async function getAdminPasskeys() {
  const state = await readSecurityState()
  return state.passkeys
}

export async function getAdminPasskeyCount() {
  const state = await readSecurityState()
  return state.passkeys.length
}

export async function getAdminWebAuthnUserID(): Promise<Base64URLString> {
  const state = await readSecurityState()
  return state.webauthnUserID
}

export async function getAdminWebAuthnUserIDBytes() {
  const userID = await getAdminWebAuthnUserID()
  return decodeBuffer(userID)
}

export async function getAdminCredentialDescriptors() {
  const passkeys = await getAdminPasskeys()

  return passkeys.map((passkey) => ({
    id: passkey.id,
    transports: passkey.transports,
  }))
}

export async function getAdminWebAuthnCredential(id: Base64URLString) {
  const passkeys = await getAdminPasskeys()
  const passkey = passkeys.find((candidate) => candidate.id === id)

  if (!passkey) {
    return null
  }

  const credential: WebAuthnCredential = {
    id: passkey.id,
    publicKey: decodeBuffer(passkey.publicKey),
    counter: passkey.counter,
    transports: passkey.transports,
  }

  return credential
}

export async function saveAdminPasskey(input: {
  credential: WebAuthnCredential
  webauthnUserID: Base64URLString
  deviceType: CredentialDeviceType
  backedUp: boolean
}) {
  const state = await readSecurityState()
  const passkey: StoredAdminPasskey = {
    id: input.credential.id,
    publicKey: encodeBuffer(input.credential.publicKey),
    counter: input.credential.counter,
    webauthnUserID: input.webauthnUserID,
    deviceType: input.deviceType,
    backedUp: input.backedUp,
    transports: input.credential.transports,
    createdAt: new Date().toISOString(),
  }

  state.webauthnUserID = input.webauthnUserID
  state.passkeys = [passkey, ...state.passkeys.filter((candidate) => candidate.id !== passkey.id)]
  await writeSecurityState(state)

  return passkey
}

export async function updateAdminPasskeyCounter(input: {
  id: Base64URLString
  counter: number
  deviceType: CredentialDeviceType
  backedUp: boolean
}) {
  const state = await readSecurityState()
  state.passkeys = state.passkeys.map((passkey) =>
    passkey.id === input.id
      ? {
          ...passkey,
          counter: input.counter,
          deviceType: input.deviceType,
          backedUp: input.backedUp,
          lastUsedAt: new Date().toISOString(),
        }
      : passkey,
  )

  await writeSecurityState(state)
}

export async function resetAdminPasskeys() {
  const state = await readSecurityState()
  state.passkeys = []
  await writeSecurityState(state)
}
