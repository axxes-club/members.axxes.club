import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

// The marketing site lives on axxes.club; the portal root just forwards
// signed-in users to their dashboard and everyone else to sign-in.
export default async function Home() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ")

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  redirect(session?.user ? "/dashboard" : "/sign-in")
}
