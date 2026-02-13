"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

interface Integration {
  id: string
  name: string
  description: string
  category: "ticketing" | "venues" | "orders" | "shipping" | "storage"
  icon: React.ReactNode
  logoUrl?: string
  website: string
  connected: boolean
  comingSoon?: boolean
}

const integrations: Integration[] = [
  {
    id: "afters-am",
    name: "Afters.am",
    description: "Our integrated ticketing platform for seamless event management and ticket sales.",
    category: "ticketing",
    icon: <Ticket className="h-6 w-6" />,
    website: "https://afters.am",
    connected: false,
  },
  {
    id: "qortr",
    name: "Qortr",
    description: "Venue rental marketplace for nightclubs, event spaces, and unique locations.",
    category: "venues",
    icon: <Building2 className="h-6 w-6" />,
    website: "https://qortr.com",
    connected: false,
  },
  {
    id: "peerspace",
    name: "Peerspace",
    description: "Book unique spaces for events, meetings, and productions by the hour.",
    category: "venues",
    icon: <Building2 className="h-6 w-6" />,
    website: "https://peerspace.com",
    connected: false,
  },
  {
    id: "orders-co",
    name: "Orders.co",
    description: "Centralized order management for restaurants and food service businesses.",
    category: "orders",
    icon: <Package className="h-6 w-6" />,
    website: "https://orders.co",
    connected: false,
  },
  {
    id: "shipstation",
    name: "ShipStation",
    description: "Shipping software to import, manage, and ship orders from any sales channel.",
    category: "shipping",
    icon: <Truck className="h-6 w-6" />,
    website: "https://shipstation.com",
    connected: false,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Cloud storage integration for your digital asset management library.",
    category: "storage",
    icon: <FolderOpen className="h-6 w-6" />,
    website: "https://dropbox.com",
    connected: false,
  },
]

const categoryLabels: Record<string, string> = {
  ticketing: "Ticketing",
  venues: "Venue Rentals",
  orders: "Order Management",
  shipping: "Shipping",
  storage: "Cloud Storage",
}

export default function IntegrationsSettingsPage() {
  const [connectionStates, setConnectionStates] = React.useState<Record<string, boolean>>(
    Object.fromEntries(integrations.map((i) => [i.id, i.connected]))
  )
  const [connectingId, setConnectingId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [selectedIntegration, setSelectedIntegration] = React.useState<Integration | null>(null)

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration)
    setDialogOpen(true)
  }

  const handleConfirmConnect = async () => {
    if (!selectedIntegration) return

    setConnectingId(selectedIntegration.id)
    setDialogOpen(false)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setConnectionStates((prev) => ({
      ...prev,
      [selectedIntegration.id]: true,
    }))
    setConnectingId(null)
    setSelectedIntegration(null)
  }

  const handleDisconnect = async (integrationId: string) => {
    setConnectingId(integrationId)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    setConnectionStates((prev) => ({
      ...prev,
      [integrationId]: false,
    }))
    setConnectingId(null)
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

      {/* Connected integrations summary */}
      {Object.values(connectionStates).some(Boolean) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connected Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {integrations
                .filter((i) => connectionStates[i.id])
                .map((integration) => (
                  <Badge key={integration.id} variant="secondary" className="gap-1.5">
                    <Check className="h-3 w-3" />
                    {integration.name}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration categories */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-lg font-semibold">{categoryLabels[category]}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {categoryIntegrations.map((integration) => {
              const isConnected = connectionStates[integration.id]
              const isConnecting = connectingId === integration.id

              return (
                <Card key={integration.id} className={cn(isConnected && "border-club/50")}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg",
                        isConnected ? "bg-club/10 text-club" : "bg-muted text-muted-foreground"
                      )}>
                        {integration.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          {isConnected && (
                            <Badge variant="club" className="text-[10px]">Connected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {integration.description}
                        </p>
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
                      {isConnected ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={true}
                              onCheckedChange={() => handleDisconnect(integration.id)}
                              disabled={isConnecting}
                            />
                            <span className="text-sm text-muted-foreground">Enabled</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
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
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
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

      {/* Connect Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              />
            </div>
            {selectedIntegration?.id !== "dropbox" && (
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID</Label>
                <Input
                  id="accountId"
                  placeholder="Enter your account ID..."
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Your credentials are encrypted and stored securely. You can disconnect at any time.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmConnect}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
