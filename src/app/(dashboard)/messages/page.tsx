import { MatrixWrapper } from "@/components/messaging"

export const dynamic = "force-dynamic"

export default async function MessagesPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <MatrixWrapper />
    </div>
  )
}