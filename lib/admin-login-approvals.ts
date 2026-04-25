import "server-only"

import { randomBytes } from "crypto"
import { mkdir, readFile, writeFile } from "fs/promises"
import { dirname, resolve } from "path"

export type PendingLoginApproval = {
  token: string
  createdAt: string
  expiresAt: string
}

type AdminLoginApprovalState = {
  pending: PendingLoginApproval[]
}

const APPROVAL_FILE = resolve(process.cwd(), "data", "admin-login-approvals.json")

function createEmptyState(): AdminLoginApprovalState {
  return {
    pending: [],
  }
}

async function readApprovalStateFromFile(): Promise<AdminLoginApprovalState | null> {
  try {
    const fileContent = await readFile(APPROVAL_FILE, "utf-8")
    const parsed = JSON.parse(fileContent) as Partial<AdminLoginApprovalState>

    if (Array.isArray(parsed.pending)) {
      return {
        pending: parsed.pending,
      }
    }
  } catch (error) {
    // File doesn't exist or is invalid - that's okay
  }

  return null
}

async function writeApprovalStateToFile(state: AdminLoginApprovalState) {
  try {
    const dir = dirname(APPROVAL_FILE)
    await mkdir(dir, { recursive: true })
    await writeFile(APPROVAL_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error("Failed to write approval state to file:", error)
    throw error
  }
}

async function readApprovalState(): Promise<AdminLoginApprovalState> {
  try {
    const fileState = await readApprovalStateFromFile()
    if (fileState) {
      return fileState
    }

    const newState = createEmptyState()
    try {
      await writeApprovalStateToFile(newState)
    } catch (error) {
      console.warn("Could not persist new approval state:", error)
    }
    return newState
  } catch (error) {
    console.error("Failed to read approval state:", error)
    return createEmptyState()
  }
}

function generateApprovalToken(): string {
  return randomBytes(32).toString("hex")
}

function isApprovalExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export async function createPendingApproval(): Promise<string> {
  const state = await readApprovalState()

  // Remove expired approvals
  state.pending = state.pending.filter((approval) => !isApprovalExpired(approval.expiresAt))

  const token = generateApprovalToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes

  const approval: PendingLoginApproval = {
    token,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }

  state.pending.push(approval)
  await writeApprovalStateToFile(state)

  return token
}

export async function validateApprovalToken(token: string): Promise<boolean> {
  const state = await readApprovalState()

  // Remove expired approvals
  state.pending = state.pending.filter((approval) => !isApprovalExpired(approval.expiresAt))

  const approval = state.pending.find((candidate) => candidate.token === token)

  if (!approval) {
    return false
  }

  // Remove the used token
  state.pending = state.pending.filter((candidate) => candidate.token !== token)
  await writeApprovalStateToFile(state)

  return true
}

export async function denyApprovalToken(token: string): Promise<void> {
  const state = await readApprovalState()
  state.pending = state.pending.filter((candidate) => candidate.token !== token)
  await writeApprovalStateToFile(state)
}

export async function getPendingApprovalCount(): Promise<number> {
  const state = await readApprovalState()
  state.pending = state.pending.filter((approval) => !isApprovalExpired(approval.expiresAt))
  return state.pending.length
}
