import "server-only"

import { randomBytes } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, resolve } from "path"
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
// Use resolve to get reliable path in all environments
const SECURITY_FILE = resolve(process.cwd(), "data", "admin-security.json")

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

async function readSecurityStateFromFile(): Promise<AdminSecurityState | null> {
  try {
    const fileContent = await readFile(SECURITY_FILE, "utf-8")
    const parsed = JSON.parse(fileContent) as Partial<AdminSecurityState>

    if (
      typeof parsed.webauthnUserID === "string" &&
      parsed.webauthnUserID &&
      Array.isArray(parsed.passkeys)
    ) {
      console.log(`[Admin Passkeys] Read state from file: ${parsed.passkeys.length} passkeys`)
      return {
        webauthnUserID: parsed.webauthnUserID as Base64URLString,
        passkeys: parsed.passkeys,
      }
    }
  } catch (error) {
    // File doesn't exist or is invalid - that's okay
  }

  return null
}

async function writeSecurityStateToFile(state: AdminSecurityState) {
  try {
    // Ensure the directory exists before writing
    const dir = dirname(SECURITY_FILE)
    await mkdir(dir, { recursive: true })
    
    console.log(`[Admin Passkeys] Writing ${state.passkeys.length} passkeys to file...`)
    await writeFile(SECURITY_FILE, JSON.stringify(state, null, 2))
    console.log("[Admin Passkeys] File write successful")
  } catch (error) {
    console.error("Failed to write security state to file:", error)
    throw error
  }
}

async function readSecurityStateFromFile(): Promise<AdminSecurityState | null> {
  try {
    const fileContent = await readFile(SECURITY_FILE, "utf-8")
    const parsed = JSON.parse(fileContent) as Partial<AdminSecurityState>

    if (
      typeof parsed.webauthnUserID === "string" &&
      parsed.webauthnUserID &&
      Array.isArray(parsed.passkeys)
    ) {
      return {
        webauthnUserID: parsed.webauthnUserID as Base64URLString,
        passkeys: parsed.passkeys,
      }
    }
  } catch (error) {
    // File doesn't exist or is invalid - that's okay
  }

  return null
}

async function readSecurityState(): Promise<AdminSecurityState> {
  try {
    // Try Redis first
    if (redis) {
      try {
        const stored = await redis.get(SECURITY_KEY)
        if (stored) {
          const parsed = JSON.parse(stored as string) as Partial<AdminSecurityState>

          if (
            typeof parsed.webauthnUserID === "string" &&
            parsed.webauthnUserID &&
            Array.isArray(parsed.passkeys)
          ) {
            return {
              webauthnUserID: parsed.webauthnUserID as Base64URLString,
              passkeys: parsed.passkeys,
            }
          }
        }
      } catch (error) {
        console.error("Failed to read from Redis:", error)
        // Fall through to file storage
      }
    }

    // Fall back to file storage
    const fileState = await readSecurityStateFromFile()
    if (fileState) {
      return fileState
    }

    // No state found anywhere, create new one
    const newState = createEmptyState()
    // Only write if we're not in a read-only context
    // This prevents creating unnecessary files
    try {
      await writeSecurityStateToFile(newState)
    } catch (error) {
      console.warn("Could not persist new security state:", error)
      // Still return the state even if we can't write it
    }
    return newState
  } catch (error) {
    console.error("Failed to read security state:", error)
    return createEmptyState()
  }
}

async function writeSecurityState(state: AdminSecurityState) {
  const errors: string[] = []

  // Write to file first (primary storage for this setup)
  try {
    await writeSecurityStateToFile(state)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors.push(`File write failed: ${message}`)
    console.error("Failed to write to file:", message)
  }

  // Also try Redis if available
  if (redis) {
    try {
      await redis.set(SECURITY_KEY, JSON.stringify(state))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push(`Redis write failed: ${message}`)
      console.error("Failed to write to Redis:", message)
    }
  }

  // If file write failed, throw error
  if (errors.length > 0 && !redis) {
    throw new Error(errors.join(" | "))
  }
}

export async function hasAdminPasskeys() {
  const state = await readSecurityState()
  const hasPasskeys = state.passkeys.length > 0
  console.log(`[Admin Passkeys] Checking passkeys - Found ${state.passkeys.length} passkeys`)
  return hasPasskeys
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
  console.log("[Admin Passkeys] Saving new passkey...")
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
  
  console.log(`[Admin Passkeys] Updated state with ${state.passkeys.length} total passkeys`)
  
  await writeSecurityState(state)
  
  console.log("[Admin Passkeys] Passkey saved successfully")

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
