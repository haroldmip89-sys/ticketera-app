"use client"

import { createContext, useContext, useMemo, useState } from "react"
import { CircleCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"

type UsersNoticeContextValue = {
  message: string | null
  show: (message: string) => void
  dismiss: () => void
}

const UsersNoticeContext = createContext<UsersNoticeContextValue | null>(null)

export function UsersNoticeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [message, setMessage] = useState<string | null>(null)
  const value = useMemo(
    () => ({
      message,
      show: (next: string) => setMessage(next),
      dismiss: () => setMessage(null),
    }),
    [message],
  )
  return (
    <UsersNoticeContext.Provider value={value}>
      {children}
    </UsersNoticeContext.Provider>
  )
}

function useNoticeContext(): UsersNoticeContextValue {
  const ctx = useContext(UsersNoticeContext)
  if (!ctx) {
    throw new Error("useUsersNotice must be used within UsersNoticeProvider")
  }
  return ctx
}

export function useUsersNotice(): { show: (message: string) => void } {
  const { show } = useNoticeContext()
  return { show }
}

export function UsersNotice() {
  const { message, dismiss } = useNoticeContext()
  return (
    <div role="status">
      {message ? (
        <div className="flex items-center gap-3 rounded-xl bg-success px-4 py-3 text-sm font-medium text-success-foreground">
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{message}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="focus-ring size-11 shrink-0"
            aria-label="Cerrar aviso"
            onClick={dismiss}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
