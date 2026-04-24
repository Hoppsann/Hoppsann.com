import type { Metadata } from "next"
import { Archivo_Black, Space_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AdminSequenceListener } from "@/components/admin/admin-sequence-listener"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Hoppsann — Photography, Videography & IT",
  description:
    "Hoppsann portfolio. Photography, videography and IT work with a bold neubrutalist attitude.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${archivoBlack.variable} ${spaceMono.variable} bg-background`}>
      <body className="font-mono antialiased text-foreground min-h-screen flex flex-col">
        <AdminSequenceListener />
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
