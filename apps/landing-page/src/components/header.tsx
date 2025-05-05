"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@repo/ui"
import { constants } from "@/constants"
import Image from "next/image"

export const Header = () => (
  <header className="border-b border-gray-800">
    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center font-bold text-xl">
          <span className="text-white">Letter</span>
          <span className="text-primary">Space</span>
        </Link>
      </div>

      <nav className="hidden md:flex items-center gap-6">
        <Link
          href="#"
          className="text-gray-300 hover:text-white flex items-center gap-1"
        >
          v{constants.version}
        </Link>
        <Link
          href={constants.env.GITHUB_URL}
          className="text-gray-300 hover:text-white"
          target="_blank"
        >
          <Image
            src="/github.svg"
            alt="GitHub"
            width={30}
            height={30}
            style={{ filter: "invert(1)" }}
          />
        </Link>
      </nav>

      <Button variant="ghost" size="icon" className="md:hidden">
        <span className="sr-only">Open menu</span>
        <Menu className="h-6 w-6" />
      </Button>
    </div>
  </header>
)
