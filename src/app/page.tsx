import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { rawCookieHeader } from "@/lib/auth/raw-cookie"

// The marketing site lives on axxes.club; the portal root just forwards
// signed-in users to their dashboard and everyone else to sign-in.
export default async function Home() {
  const cookieHeader = await rawCookieHeader()

  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieHeader }),
  })

  redirect(session?.user ? "/dashboard" : "/sign-in")
}
