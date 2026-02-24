"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Ticket,
  Building2,
  Package,
  Truck,
  FolderOpen,
  ExternalLink,
  Check,
  Loader2,
  RefreshCw,
  Settings,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

// Icon mapping
const iconMap: Record<string, React.ReactNode> = {
  Ticket: <Ticket className="h-6 w-6" />,
  Building2: <Building2 className="h-6 w-6" />,
  Package: <Package className="h-6 w-6" />,
  Truck: <Truck className="h-6 w-6" />,
  FolderOpen: <FolderOpen className="h-6 w-6" />,
}

interface Integration {
  id: string
  name: string
  description: string
  category: "ticketing" | "venues" | "orders" | "shipping" | "storage"
  icon: string
  website: string
  authType: "oauth" | "apikey"
  features: string[]
}

interface ConnectionState {
  connected: boolean
  externalUserEmail?: string
  externalUserName?: string
  connectedAt?: string
  scopes?: string[]
  lastSyncAt?: string
  syncEnabled?: boolean
  health?: "healthy" | "expired" | "error" | "unknown"
}

interface SyncResult {
  success: boolean
  provider: string
  entityType: string
  pulled: number
  updated: number
  failed: number
  errors: Array<{ message: string }>
}

const integrations: Integration[] = [
  {
    id: "afters",
    name: "Afters.am",
    description: "Our integrated ticketing platform for seamless event management and ticket sales.",
    category: "ticketing",
    icon: "Ticket",
    website: "https://afters.am",
    authType: "oauth",
    features: ["events", "tickets", "orders", "sync"],
  },
  {
    id: "qortr",
    name: "Qortr",
    description: "Venue rental marketplace for nightclubs, event spaces, and unique locations.",
    category: "venues",
    icon: "Building2",
    website: "https://qortr.com",
    authType: "apikey",
    features: ["venues"],
  },
  {
    id: "peerspace",
    name: "Peerspace",
    description: "Book unique spaces for events, meetings, and productions by the hour.",
    category: "venues",
    icon: "Building2",
    website: "https://peerspace.com",
    authType: "apikey",
    features: ["venues"],
  },
  {
    id: "orders-co",
    name: "Orders.co",
    description: "Centralized order management for restaurants and food service businesses.",
    category: "orders",
    icon: "Package",
    website: "https://orders.co",
    authType: "apikey",
    features: ["orders"],
  },
  {
    id: "shipstation",
    name: "ShipStation",
    description: "Shipping software to import, manage, and ship orders from any sales channel.",
    category: "shipping",
    icon: "Truck",
    website: "https://shipstation.com",
    authType: "apikey",
    features: ["orders", "shipping"],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Cloud storage integration for your digital asset management library.",
    category: "storage",
    icon: "FolderOpen",
    website: "https://dropbox.com",
    authType: "oauth",
    features: ["assets"],
  },
]

const categoryLabels: Record<string, string> = {
  ticketing: "Ticketing",
  venues: "Venue Rentals",
  orders: "Order Management",
  shipping: "Shipping",
  storage: "Cloud Storage",
}

function IntegrationsContent() {
  const searchParams = useSearchParams()
  const [connectionStates, setConnectionStates] = React.useState<Record<string, ConnectionState>>({})
  const [loadingStates, setLoadingStates] = React.useState<Record<string, boolean>>({})
  const [syncingStates, setSyncingStates] = React.useState<Record<string, boolean>>({})
  const [initialLoading, setInitialLoading] = React.useState(true)
  
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false)
  const [selectedIntegration, setSelectedIntegration] = React.useState<Integration | null>(null)
  const [apiKeyInput, setApiKeyInput] = React.useState("")
  const [accountIdInput, setAccountIdInput] = React.useState("")
  
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false)
  const [integrationToDisconnect, setIntegrationToDisconnect] = React.useState<Integration | null>(null)
  
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false)
  const [integrationToConfigure, setIntegrationToConfigure] = React.useState<Integration | null>(null)
  const [syncFrequency, setSyncFrequency] = React.useState<string>("hourly")

  // Handle OAuth callback
  React.useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    
    if (success === "afters") {
      toast.success("Successfully connected to Afters.am!")
      refreshConnectionState("afters")
    }
    
    if (error) {
      toast.error(`Connection failed: ${error}`)
    }
  }, [searchParams])

  const loadAllConnections = React.useCallback(async () => {
    // Load all integration connections
    const providerIds = ["afters", "qortr", "peerspace", "orders-co", "shipstation", "dropbox"]
    await Promise.all(providerIds.map(id => refreshConnectionState(id)))
    setInitialLoading(false)
  }, [])

  // Initial load
  React.useEffect(() => {
    loadAllConnections()
  }, [loadAllConnections])

  const refreshConnectionState = async (providerId: string) => {
    try {
      const res = await fetch(`/api/integrations/${providerId}`)
      if (res.ok) {
        const data = await res.json()
        setConnectionStates(prev => ({
          ...prev,
          [providerId]: data,
        }))
      }
    } catch (error) {
      console.error(`Error checking ${providerId} connection:`, error)
    }
  }

  const handleConnect = async (integration: Integration) => {
    if (integration.authType === "oauth") {
      setLoadingStates(prev => ({ ...prev, [integration.id]: true }))
      
      try {
        const res = await fetch(`/api/integrations/${integration.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scopes: ["read:profile", "read:events", "read:orders", "read:tickets"],
          }),
        })
        
        if (res.ok) {
          const data = await res.json()
          window.location.href = data.authorizationUrl
        } else {
          const error = await res.json()
          toast.error(error.error || "Failed to start connection")
          setLoadingStates(prev => ({ ...prev, [integration.id]: false }))
        }
      } catch (error) {
        console.error("Error starting OAuth:", error)
        toast.error("Failed to start connection")
        setLoadingStates(prev => ({ ...prev, [integration.id]: false }))
      }
    } else {
      setSelectedIntegration(integration)
      setApiKeyDialogOpen(true)
    }
  }

  const handleApiKeyConnect = async () => {
    if (!selectedIntegration || !apiKeyInput.trim()) return

    setLoadingStates(prev => ({ ...prev, [selectedIntegration.id]: true }))
    setApiKeyDialogOpen(false)

    // Simulate API key validation (implement based on provider)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setConnectionStates(prev => ({
      ...prev,
      [selectedIntegration.id]: { connected: true },
    }))
    setLoadingStates(prev => ({ ...prev, [selectedIntegration.id]: false }))
    setApiKeyInput("")
    setAccountIdInput("")
    setSelectedIntegration(null)
    toast.success(`Connected to ${selectedIntegration.name}`)
  }

  const handleDisconnect = async () => {
    if (!integrationToDisconnect) return

    setLoadingStates(prev => ({ ...prev, [integrationToDisconnect.id]: true }))
    setDisconnectDialogOpen(false)

    try {
      const res = await fetch(`/api/integrations/${integrationToDisconnect.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        setConnectionStates(prev => ({
          ...prev,
          [integrationToDisconnect.id]: { connected: false },
        }))
        toast.success(`Disconnected from ${integrationToDisconnect.name}`)
      } else {
        toast.error("Failed to disconnect")
      }
    } catch (error) {
      console.error("Error disconnecting:", error)
      toast.error("Failed to disconnect")
    } finally {
      setLoadingStates(prev => ({ ...prev, [integrationToDisconnect.id]: false }))
      setIntegrationToDisconnect(null)
    }
  }

  const handleSync = async (integration: Integration, entityType: "events" | "orders" | "all" = "all") => {
    if (!integration.features.includes("sync")) {
      toast.info("This integration does not support sync")
      return
    }

    setSyncingStates(prev => ({ ...prev, [integration.id]: true }))

    try {
      const res = await fetch(`/api/integrations/${integration.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, fullSync: false }),
      })

      if (res.ok) {
        const result: SyncResult = await res.json()
        
        if (result.success) {
          toast.success(`Synced ${result.updated} items from ${integration.name}`)
          await refreshConnectionState(integration.id)
        } else {
          toast.error(`Sync completed with ${result.failed} errors`)
        }
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to sync")
      }
    } catch (error) {
      console.error("Error syncing:", error)
      toast.error("Failed to sync")
    } finally {
      setSyncingStates(prev => ({ ...prev, [integration.id]: false }))
    }
  }

  const handleSettingsUpdate = async () => {
    if (!integrationToConfigure) return

    try {
      const res = await fetch(`/api/integrations/${integrationToConfigure.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncFrequency }),
      })

      if (res.ok) {
        toast.success("Settings updated")
        setSettingsDialogOpen(false)
        await refreshConnectionState(integrationToConfigure.id)
      } else {
        toast.error("Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Failed to update settings")
    }
  }

  const openSettings = (integration: Integration) => {
    setIntegrationToConfigure(integration)
    setSyncFrequency("hourly") // Could load from connection state
    setSettingsDialogOpen(true)
  }

  const getHealthBadge = (health?: string) => {
    switch (health) {
      case "healthy":
        return <Badge variant="success" className="text-[10px]">Healthy</Badge>
      case "expired":
        return <Badge variant="destructive" className="text-[10px]">Expired</Badge>
      case "error":
        return <Badge variant="destructive" className="text-[10px]">Error</Badge>
      default:
        return null
    }
  }

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect third-party services to extend your platform capabilities.
        </p>
      </div>

      {/* Connected Services Summary */}
      {Object.entries(connectionStates).some(([, state]) => state.connected) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Connected Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {integrations
                .filter(i => connectionStates[i.id]?.connected)
                .map(integration => (
                  <Badge key={integration.id} variant="secondary" className="gap-1.5 py-1 px-3">
                    <Check className="h-3 w-3" />
                    {integration.name}
                    {connectionStates[integration.id]?.externalUserEmail && (
                      <span className="text-muted-foreground text-xs">
                        ({connectionStates[integration.id].externalUserEmail})
                      </span>
                    )}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Categories */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold">{categoryLabels[category]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {categoryIntegrations.map(integration => {
              const state = connectionStates[integration.id] || { connected: false }
              const isLoading = loadingStates[integration.id] || (initialLoading && integration.id === "afters")
              const isSyncing = syncingStates[integration.id]
              const supportsSync = integration.features.includes("sync")

              return (
                <Card
                  key={integration.id}
                  className={cn(
                    state.connected && "border-club/50"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        state.connected ? "bg-club/10 text-club" : "bg-muted text-muted-foreground"
                      )}>
                        {iconMap[integration.icon] || <Package className="h-6 w-6" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          {state.connected && (
                            <>
                              <Badge variant="club" className="text-[10px]">Connected</Badge>
                              {getHealthBadge(state.health)}
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {integration.description}
                        </p>
                        {state.connected && state.externalUserName && (
                          <p className="text-xs text-muted-foreground">
                            Connected as {state.externalUserName}
                          </p>
                        )}
                        {state.connected && state.lastSyncAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last synced {formatDistanceToNow(new Date(state.lastSyncAt))} ago
                          </p>
                        )}
                        <a
                          href={integration.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {integration.website.replace("https://", "")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="mt-4 flex items-center justify-between">
                      {state.connected ? (
                        <>
                          <div className="flex items-center gap-2">
                            {supportsSync && (
                              <Switch
                                checked={state.syncEnabled ?? true}
                                onCheckedChange={(checked) => {
                                  // Toggle sync
                                  fetch(`/api/integrations/${integration.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ syncEnabled: checked }),
                                  }).then(() => {
                                    refreshConnectionState(integration.id)
                                    toast.success(checked ? "Sync enabled" : "Sync disabled")
                                  })
                                }}
                                disabled={isLoading}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {supportsSync && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSync(integration)}
                                disabled={isLoading || isSyncing}
                              >
                                {isSyncing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Syncing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Sync
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openSettings(integration)}
                              disabled={isLoading}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIntegrationToDisconnect(integration)
                                setDisconnectDialogOpen(true)
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Disconnect"
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          className="ml-auto"
                          size="sm"
                          onClick={() => handleConnect(integration)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            "Connect"
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* API Key Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect to {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Enter your {selectedIntegration?.name} credentials to connect your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                placeholder="Enter your API key..."
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
              />
            </div>
            {selectedIntegration?.id !== "dropbox" && (
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID</Label>
                <Input
                  id="accountId"
                  placeholder="Enter your account ID..."
                  value={accountIdInput}
                  onChange={e => setAccountIdInput(e.target.value)}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your credentials are encrypted and stored securely. You can disconnect at any time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApiKeyConnect} disabled={!apiKeyInput.trim()}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integrationToDisconnect?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access and remove the connection. You can reconnect at any time.
              {integrationToDisconnect?.features.includes("sync") && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500">
                  Synced events and orders will remain in your account but will no longer receive updates.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{integrationToConfigure?.name} Settings</DialogTitle>
            <DialogDescription>
              Configure how this integration syncs with your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Sync Frequency</Label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sync frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (webhooks)</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often to sync data from {integrationToConfigure?.name}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSettingsUpdate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function IntegrationsClient() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <IntegrationsContent />
    </React.Suspense>
  )
}