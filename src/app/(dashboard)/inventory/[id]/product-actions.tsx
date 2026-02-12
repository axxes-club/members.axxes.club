"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Archive, CheckCircle } from "lucide-react"
import { deleteProduct, updateProduct } from "@/lib/actions/inventory"

interface ProductActionsProps {
  productId: string
  status: string
}

export function ProductActions({ productId, status }: ProductActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  function handlePublish() {
    startTransition(async () => {
      await updateProduct(productId, { status: "active" })
    })
  }

  function handleArchive() {
    startTransition(async () => {
      await updateProduct(productId, { status: "archived" })
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProduct(productId)
      router.push("/inventory")
    })
  }

  return (
    <>
      {status === "draft" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish Product</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Publishing will make this product available for sale.
            </p>
            <Button onClick={handlePublish} disabled={isPending} className="w-full">
              <CheckCircle className="h-4 w-4" />
              {isPending ? "Publishing..." : "Publish Product"}
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Archive Product</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Archiving will hide this product from the storefront.
            </p>
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={isPending}
              className="w-full"
            >
              <Archive className="h-4 w-4" />
              {isPending ? "Archiving..." : "Archive Product"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-base">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          {showConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Are you sure? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {isPending ? "Deleting..." : "Yes, delete"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Product
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
