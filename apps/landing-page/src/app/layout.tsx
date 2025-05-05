import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Analytics } from "@/components/analytics"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "LetterSpace | Self-hosted Newsletter Platform",
  description:
    "Open source newsletter platform for managing your subscribers and sending beautiful emails, all self-hosted for complete control and privacy.",
  keywords: [
    "newsletter",
    "email marketing",
    "self-hosted",
    "open source",
    "subscriber management",
  ],
  authors: [{ name: "LetterSpace Team" }],
  creator: "LetterSpace",
  publisher: "LetterSpace",
  metadataBase: new URL("https://letterspace.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "LetterSpace | Self-hosted Newsletter Platform",
    description:
      "Open source newsletter platform for managing your subscribers and sending beautiful emails, all self-hosted for complete control and privacy.",
    siteName: "LetterSpace",
    images: [
      {
        url: "/cover.png",
        width: 1200,
        height: 630,
        alt: "LetterSpace - Self-hosted Newsletter Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LetterSpace | Self-hosted Newsletter Platform",
    description:
      "Open source newsletter platform for managing your subscribers and sending beautiful emails, all self-hosted for complete control and privacy.",
    images: ["/cover.png"],
    creator: "@letterspace",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  applicationName: "LetterSpace",
  category: "Email Marketing",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  )
}
