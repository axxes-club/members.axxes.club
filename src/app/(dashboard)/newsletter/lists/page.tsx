import { getSubscriberLists } from "@/lib/actions/newsletter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Plus, 
  MoreHorizontal,
  Globe,
  Lock,
  Mail
} from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

export default async function ListsPage() {
  const lists = await getSubscriberLists()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriber Lists</h1>
          <p className="text-muted-foreground">
            Create and manage your email subscriber lists
          </p>
        </div>
        <Button asChild>
          <Link href="/newsletter/lists/new">
            <Plus className="mr-2 h-4 w-4" />
            Create List
          </Link>
        </Button>
      </div>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No lists yet</h3>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              Create your first subscriber list to start building your audience. 
              Each list can have its own subscription form and settings.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/newsletter/lists/new">Create your first list</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Card key={list.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {list.name}
                      {list.type === "public" ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {list.description || `/${list.slug}`}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/newsletter/lists/${list.id}`}>View subscribers</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/newsletter/lists/${list.id}/edit`}>Edit list</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/newsletter/lists/${list.id}/import`}>Import subscribers</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">
                      {list.subscriberCount ?? 0}
                    </span>
                    <span className="text-sm text-muted-foreground">subscribers</span>
                  </div>
                  {list.doubleOptIn && (
                    <Badge variant="secondary" className="text-xs">
                      Double opt-in
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>/{list.slug}</span>
                  <span>
                    Created {formatDistanceToNow(new Date(list.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
              <Link
                href={`/newsletter/lists/${list.id}`}
                className="absolute inset-0"
                prefetch={false}
              >
                <span className="sr-only">View {list.name}</span>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}