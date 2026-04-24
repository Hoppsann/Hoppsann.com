"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"

const ADMIN_SEQUENCE = "admin"
const BUFFER_TIMEOUT_MS = 1500

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName.toLowerCase()

  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  )
}

export function AdminSequenceListener() {
  const router = useRouter()
  const pathname = usePathname()
  const bufferRef = useRef("")
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const clearBuffer = () => {
      bufferRef.current = ""

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.length !== 1 ||
        isEditableTarget(event.target)
      ) {
        return
      }

      bufferRef.current = `${bufferRef.current}${event.key.toLowerCase()}`.slice(
        -ADMIN_SEQUENCE.length,
      )

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(clearBuffer, BUFFER_TIMEOUT_MS)

      if (bufferRef.current === ADMIN_SEQUENCE && pathname !== "/admin") {
        clearBuffer()
        router.push("/admin")
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearBuffer()
    }
  }, [pathname, router])

  return null
}
