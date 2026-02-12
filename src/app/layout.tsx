import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "members.axxes.club",
    template: "%s | members.axxes.club",
  },
  description: "The all-in-one platform for event ticketing, merchandise, and customer management.",
  keywords: ["events", "ticketing", "CRM", "merchandise", "event management"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
