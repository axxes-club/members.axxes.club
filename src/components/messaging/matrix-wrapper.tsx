"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MatrixProvider, useMatrix } from "@/lib/matrix/provider"
import { getOrCreateMatrixAccount } from "@/lib/matrix/server-actions"
import { ChatView } from "./chat-view"

interface MatrixWrapperProps {
  tenantId?: string
}

export function MatrixWrapper({ tenantId }: MatrixWrapperProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [credentials, setCredentials] = React.useState<{
    userId: string
    accessToken: string
    deviceId?: string
  } | null>(null)

  // Initialize Matrix account on mount
  React.useEffect(() => {
    async function initMatrix() {
      try {
        setIsLoading(true)
        setError(null)

        const result = await getOrCreateMatrixAccount()

        if (!result.success) {
          setError(result.error || "Failed to initialize Matrix account")
          return
        }

        setCredentials({
          userId: result.matrixUserId!,
          accessToken: result.accessToken!,
          deviceId: result.deviceId,
        })
      } catch (err) {
        console.error("Matrix initialization error:", err)
        setError(err instanceof Error ? err.message : "Failed to initialize messaging")
      } finally {
        setIsLoading(false)
      }
    }

    initMatrix()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Initializing messaging...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium mb-2">Unable to connect to messaging</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {error}
        </p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    )
  }

  if (!credentials) {
    return null
  }

  return (
    <MatrixProvider
      userId={credentials.userId}
      accessToken={credentials.accessToken}
      deviceId={credentials.deviceId}
    >
      <MatrixChatContent tenantId={tenantId} />
    </MatrixProvider>
  )
}

function MatrixChatContent({ tenantId }: { tenantId?: string }) {
  const { isInitialized, isSynced, error } = useMatrix()

  if (!isInitialized || !isSynced) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">Syncing messages...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-medium mb-2">Connection error</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {error.message}
        </p>
      </div>
    )
  }

  return <ChatView tenantId={tenantId} />
}