import { redirect } from "next/navigation"

// The asset library now lives at /assets
export default function MarketingAssetsPage() {
  redirect("/assets")
}
