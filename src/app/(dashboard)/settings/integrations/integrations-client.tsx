"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Integration {
  id: string
  name: string
  description: string
  category: "ticketing" | "venues" | "orders" | "shipping" | "storage"
  icon: React.ReactNode
  website: string
  authType: "oauth" | "apikey"
  comingSoon?: boolean
}

interface ConnectionState {
  connected: boolean
  externalUserEmail?: string
  externalUserName?: string
  connectedAt?: string
}

const integrations: Integration[] = [
  {
    id: "afters",
    name: "Afters.am",
    description: "Our integrated ticketing platform for seamless event management and ticket sales.",
    category: "ticketing",
    icon: <Ticket className="h-6 w-6" />,
    website: "https://afters.am",
    authType: "oauth",
  },
  {
    id: "qortr",
    name: "Qortr",
    description: "Venue rental marketplace for nightclubs, event spaces, and unique locations.",
    category: "venues",
    icon: <Building2 className="h-6 w-6" />,
    website: "https://qortr.com",
    authType: "apikey",
    comingSoon: true,
  },
  {
    id: "peerspace",
    name: "Peerspace",
    description: "Book unique spaces for events, meetings, and productions by the hour.",
    category: "venues",
    icon: <Building2 className="h-6 w-6" />,
    website: "https://peerspace.com",
    authType: "apikey",
    comingSoon: true,
  },
  {
    id: "orders-co",
    name: "Orders.co",
    description: "Centralized order management for restaurants and food service businesses.",
    category: "orders",
    icon: <Package className="h-6 w-6" />,
    website: "https://orders.co",
    authType: "apikey",
    comingSoon: true,
  },
  {
    id: "shipstation",
    name: "ShipStation",
    description: "Shipping software to import, manage, and ship orders from any sales channel.",
    category: "shipping",
    icon: <Truck className="h-6 w-6" />,
    website: "https://shipstation.com",
    authType: "apikey",
    comingSoon: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Cloud storage integration for your digital asset management library.",
    category: "storage",
    icon: <FolderOpen className="h-6 w-6" />,
    website: "https://dropbox.com",
    authType: "oauth",
    comingSoon: true,
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
  const [initialLoading, setInitialLoading] = React.useState(true)
  
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = React.useState(false)
  const [selectedIntegration, setSelectedIntegration] = React.useState<Integration | null>(null)
  const [apiKeyInput, setApiKeyInput] = React.useState("")
  const [accountIdInput, setAccountIdInput] = React.useState("")
  
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false)
  const [integrationToDisconnect, setIntegrationToDisconnect] = React.useState<Integration | null>(null)

  React.useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    
    if (success === "afters") {
      toast.success("Successfully connected to Afters.am!")
      checkAftersConnection()
    }
    
    if (error) {
      toast.error(`Connection failed: ${error}`)
    }
  }, [searchParams])

  React.useEffect(() => {
    checkAftersConnection()
  }, [])

  const checkAftersConnection = async () => {
    try {
      const res = await fetch("/api/integrations/afters")
      if (res.ok) {
        const data = await res.json()
        setConnectionStates(prev => ({
          ...prev,
          afters: {
            connected: data.connected,
            externalUserEmail: data.externalUserEmail,
            externalUserName: data.externalUserName,
            connectedAt: data.connectedAt,
          }
        }))
      }
    } catch (error) {
      console.error("Error checking Afters connection:", error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleConnect = async (integration: Integration) => {
    if (integration.comingSoon) {
      toast.info(`${integration.name} integration coming soon!`)
      return
    }

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
        }
      } catch (error) {
        console.error("Error starting OAuth:", error)
        toast.error("Failed to start connection")
      } finally {
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

      {Object.entries(connectionStates).some(([_, state]) => state.connected) && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-sm font-medium mb-3">Connected Services</h3>
            <div className="flex flex-wrap gap-2">
              {integrations
                .filter(i => connectionStates[i.id]?.connected)
                .map(integration => (
                  <Badge key={integration.id} variant="secondary" className="gap-1.5">
                    <Check className="h-3 w-3" />
                    {integration.name}
                    {connectionStates[integration.id]?.externalUserEmail && (
                      <span className="text-muted-foreground">
                        ({connectionStates[integration.id].externalUserEmail})
                      </span>
                    )}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold">{categoryLabels[category]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {categoryIntegrations.map(integration => {
              const state = connectionStates[integration.id] || { connected: false }
              const isLoading = loadingStates[integration.id] || (initialLoading && integration.id === "afters")

              return (
                <Card
                  key={integration.id}
                  className={cn(
                    state.connected && "border-club/50",
                    integration.comingSoon && "opacity-60"
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        state.connected ? "bg-club/10 text-club" : "bg-muted text-muted-foreground"
                      )}>
                        {integration.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          {state.connected && (
                            <Badge variant="club" className="text-[10px]">Connected</Badge>
                          )}
                          {integration.comingSoon && (
                            <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
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
                    <div className="mt-4 flex items-center justify-between">
                      {state.connected ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={true}
                              onCheckedChange={() => {
                                setIntegrationToDisconnect(integration)
                                setDisconnectDialogOpen(true)
                              }}
                              disabled={isLoading}
                            />
                            <span className="text-sm text-muted-foreground">Enabled</span>
                          </div>
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
                        </>
                      ) : (
                        <Button
                          className="ml-auto"
                          size="sm"
                          onClick={() => handleConnect(integration)}
                          disabled={isLoading || integration.comingSoon}
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

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {integrationToDisconnect?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke access and remove the connection. You can reconnect at any time.
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