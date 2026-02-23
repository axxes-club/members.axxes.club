import { PageHeader } from "@/components/layout/page-header"
export const dynamic = "force-dynamic"

import { SectionHeader } from "@/components/layout/section-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Package, TrendingUp, DollarSign } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        heading="Dashboard"
        description="Overview of your business performance"
      />

      {/* Stats Grid */}
      <SectionHeader number="01" title="Key Metrics" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              3 upcoming this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              12 low in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$24,567</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+8%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <SectionHeader number="02" title="Recent Orders" />
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">Order #100{i}</p>
                    <p className="text-sm text-muted-foreground">
                      customer{i}@example.com
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={i % 2 === 0 ? "success" : "secondary"}>
                    {i % 2 === 0 ? "Completed" : "Pending"}
                  </Badge>
                  <span className="font-medium">${(i * 45.99).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <SectionHeader number="03" title="Upcoming Events" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} interactive>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline">Feb {10 + i}, 2024</Badge>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <CardTitle className="mt-2">Event Title {i}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">150 registered</span>
                <span className="font-medium">$2,500 revenue</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
