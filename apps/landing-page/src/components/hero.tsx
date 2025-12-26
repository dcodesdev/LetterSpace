"use client"

import Link from "next/link"
import { Button } from "@repo/ui"
import { Mail, Star, Zap } from "lucide-react"
import { constants } from "@/constants"

export const Hero = () => (
  <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center justify-between">
    <div className="md:w-1/2 space-y-4">
      <h2 className="text-3xl font-bold">
        Letter<span className="text-primary">Space</span>
      </h2>
      <h1 className="text-5xl md:text-6xl font-bold text-white">
        Open Source Email Platform
      </h1>
      <div className="space-y-2 max-w-xl">
        <p className="text-gray-400 text-xl">
          Connect any SMTP server and manage unlimited newsletters
        </p>
        <p className="text-gray-400 text-xl">
          Zero-config and developer-friendly
        </p>
        <p className="text-gray-400 text-xl">LetterSpace for everyone</p>
      </div>

      <div className="flex gap-4 pt-4">
        <Link href={constants.env.DOCS_URL}>
          <Button className="bg-[#4ECDC4] hover:bg-[#3DBDB5] text-black font-medium px-6">
            Get Started
          </Button>
        </Link>
        <Link href={constants.env.GITHUB_URL}>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 bg-gray-900"
          >
            View on GitHub
          </Button>
        </Link>
      </div>
    </div>

    <div className="md:w-1/2 flex justify-center mt-12 md:mt-0">
      <div className="relative w-80 h-80">
        {/* Space background with stars */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#121212] overflow-hidden">
          {/* Stars */}
          <div className="absolute inset-0">
            <div className="star star-1"></div>
            <div className="star star-2"></div>
            <div className="star star-3"></div>
            <div className="star star-4"></div>
            <div className="star star-5"></div>
            <div className="star star-6"></div>
            <div className="star star-7"></div>
            <div className="star star-8"></div>
            <div className="star star-9"></div>
            <div className="star star-10"></div>
            <div className="star star-11"></div>
            <div className="star star-12"></div>
          </div>

          {/* Animated nebula/galaxy effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#4ECDC4]/10 to-transparent blur-2xl animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 to-transparent blur-3xl animate-pulse animation-delay-700"></div>
        </div>

        {/* Floating envelope in space */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Envelope with 3D perspective */}
          <div className="relative w-48 h-36 bg-gradient-to-br from-[#4ECDC4] to-[#2A9D94] rounded-lg shadow-lg transform rotate-6 animate-float-space perspective">
            {/* Envelope flap */}
            <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-[#5DDED6] to-[#4ECDC4] rounded-t-lg envelope-flap"></div>

            {/* Envelope body */}
            <div className="absolute bottom-0 left-0 w-full h-2/3 bg-[#4ECDC4] rounded-b-lg border-t border-white/20"></div>

            {/* Letter peeking out */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-5/6 h-3/4 bg-white rounded-sm shadow-inner transform -translate-y-2 letter">
              <div className="w-full h-full p-2 flex flex-col justify-center">
                <div className="w-full h-2 bg-gray-300 rounded-full mb-2"></div>
                <div className="w-3/4 h-2 bg-gray-300 rounded-full mb-2"></div>
                <div className="w-5/6 h-2 bg-gray-300 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Orbiting elements */}
          <div className="absolute w-full h-full animate-orbit">
            <div className="absolute -right-4 -top-8">
              <Star className="h-6 w-6 text-yellow-400 animate-twinkle" />
            </div>
          </div>

          <div className="absolute w-full h-full animate-orbit-reverse">
            <div className="absolute -left-8 top-0">
              <Mail className="h-8 w-8 text-[#4ECDC4] animate-pulse" />
            </div>
          </div>

          <div className="absolute w-full h-full animate-orbit-slow">
            <div className="absolute right-0 bottom-0">
              <Zap className="h-10 w-10 text-yellow-400 filter drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Floating particles */}
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
        <div className="particle particle-5"></div>
      </div>
    </div>
  </section>
)
