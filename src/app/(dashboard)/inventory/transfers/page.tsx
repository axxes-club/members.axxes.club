import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, ArrowLeftRight, Truck, CheckCircle } from "lucide-react"

export default async function TransfersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        heading="Transfers"
        description="Transfer inventory between locations"
        actions={
          <Link href="/inventory/transfers/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create Transfer
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ArrowLeftRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <p className="text-sm text-muted-foreground">Total Transfers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">0</div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No transfers yet</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Create transfers to move inventory between your locations.
          </p>
          <Link href="/inventory/transfers/new" className="mt-6">
            <Button>
              <Plus className="h-4 w-4" />
              Create Transfer
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}