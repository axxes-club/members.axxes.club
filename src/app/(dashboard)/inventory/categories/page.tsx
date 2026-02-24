import Link from "next/link"
export const dynamic = "force-dynamic"

import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Layers, FolderTree, Package } from "lucide-react"
import { getCategories } from "@/lib/actions/inventory"

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-8">
      <PageHeader
        heading="Categories"
        description="Organize your products into categories"
        actions={
          <Link href="/inventory/categories/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{categories.filter(c => c.isVisible).length}</div>
                <p className="text-sm text-muted-foreground">Visible</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FolderTree className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Create categories to organize your products and make them easier to find.
            </p>
            <Link href="/inventory/categories/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`/inventory/categories/${category.id}`}>
              <Card className="h-full hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {category.imageUrl ? (
                        <img 
                          src={category.imageUrl} 
                          alt={category.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <Layers className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{category.name}</div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}