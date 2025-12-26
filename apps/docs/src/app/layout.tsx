import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Footer, Layout, Navbar } from "nextra-theme-docs"
import "nextra-theme-docs/style.css"
import { Head } from "nextra/components"
import { getPageMap } from "nextra/page-map"
import { Analytics } from "@/components"
import "./globals.css"

export const metadata: Metadata = {
  title: "LetterSpace Documentation | Self-hosted Newsletter Platform",
  description:
    "Official documentation for LetterSpace - the open source newsletter platform for managing subscribers and sending emails, all self-hosted.",
  keywords: [
    "newsletter docs",
    "LetterSpace documentation",
    "self-hosted",
    "open source",
    "email marketing guide",
  ],
  authors: [{ name: "LetterSpace Team" }],
  creator: "LetterSpace",
  publisher: "LetterSpace",
  metadataBase: new URL("https://docs.letterspace.app"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    title: "LetterSpace Documentation | Self-hosted Newsletter Platform",
    description:
      "Official documentation for LetterSpace - the open source newsletter platform for managing subscribers and sending emails, all self-hosted.",
    siteName: "LetterSpace Docs",
    images: [
      {
        url: "/cover.png",
        width: 1200,
        height: 630,
        alt: "LetterSpace Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LetterSpace Documentation | Self-hosted Newsletter Platform",
    description:
      "Official documentation for LetterSpace - the open source newsletter platform for managing subscribers and sending emails, all self-hosted.",
    images: ["/cover.png"],
    creator: "@letterspace",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  applicationName: "LetterSpace Docs",
  category: "Documentation",
}

const navbar = (
  <Navbar
    logo={
      <Link className="flex items-center gap-2" href="https://letterspace.app">
        <Image
          src="/android-chrome-192x192.png"
          alt="LetterSpace"
          className="rounded-full shadow-md shadow-[#5bd1c8] hover:shadow-md hover:shadow-[#5bd1c8]/40 transition-all"
          width={32}
          height={32}
        />
        <div className="text-lg font-bold">
          Letter<span className="text-[#5bd1c8]">Space</span>
        </div>
      </Link>
    }
    // ... Your additional navbar options
  />
)
const footer = (
  <Footer>
    <div>
      <p>MIT {new Date().getFullYear()} © LetterSpace</p>
      <small>
        Powered by{" "}
        <Link
          className="underline"
          target="_blank"
          rel="nofollow"
          href="https://nextra.site"
        >
          Nextra
        </Link>
      </small>
    </div>
  </Footer>
)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/dcodesdev/letterspace/tree/main/apps/docs"
          footer={footer}
          // ... Your additional layout options
        >
          {children}
          <Analytics />
        </Layout>
      </body>
    </html>
  )
}
