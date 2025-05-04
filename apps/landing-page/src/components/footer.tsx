"use client"

import Link from "next/link"
import { constants } from "@/constants"
import Image from "next/image"

export const Footer = () => (
  <footer className="border-t border-gray-800 py-8 mt-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col items-center justify-center gap-6">
        <div className="flex items-center">
          <span className="text-white font-bold">Letter</span>
          <span className="text-primary font-bold">Space</span>
          <span className="text-gray-400 text-sm ml-4">
            ©{new Date().getFullYear()} LetterSpace
          </span>
        </div>
        <div className="flex gap-6">
          <Link
            href={constants.env.DOCS_URL}
            className="text-gray-400 hover:text-white"
          >
            Documentation
          </Link>
          <Link
            href={constants.env.GITHUB_URL}
            className="text-gray-400 hover:text-white"
            target="_blank"
          >
            GitHub
          </Link>
          <Link
            href={constants.env.DOCS_URL + "/api"}
            className="text-gray-400 hover:text-white"
          >
            API
          </Link>
          <Link
            href={constants.env.X_URL}
            className="text-gray-400 hover:text-white flex items-center gap-1.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src="/x.svg"
              alt="X"
              width={20}
              height={20}
              style={{ filter: "invert(1)" }}
            />
            Built by dcodes
          </Link>
        </div>
      </div>
    </div>
  </footer>
)
