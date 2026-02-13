import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  if (session?.user) {
    redirect("/dashboard")
  } else {
    redirect("/sign-in")
  }
}
