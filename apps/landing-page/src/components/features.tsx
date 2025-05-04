"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  Zap,
  Wifi,
  Database,
  MessageSquare,
  FileCode,
  Settings,
  BugPlay,
  ChevronDown,
} from "lucide-react"
import constants from "@/constants"

interface Feature {
  icon: React.ReactElement<LucideIcon>
  title: string
  description: string
  link?: {
    text: string
    url: string
  }
}

export const featuresData: Feature[] = [
  {
    icon: <Zap className="h-6 w-6 text-yellow-400" />,
    title: "Zero-Config",
    description: "Sensible built-in default configs for common use cases",
  },
  // {
  //   icon: <Code className="h-6 w-6 text-[#4ECDC4]" />,
  //   title: "Extensible",
  //   description:
  //     "Expose the full ability to customize the behavior of the platform",
  // },
  {
    icon: <Wifi className="h-6 w-6 text-gray-300" />,
    title: "SMTP Support",
    description: "Connect any SMTP server to send emails to your subscribers",
  },
  {
    icon: <Database className="h-6 w-6 text-[#4ECDC4]" />,
    title: "Unlimited Lists",
    description: "Create and manage as many newsletter lists as you need",
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-gray-300" />,
    title: "Campaign Management",
    description: "Built-in support for creating and scheduling email campaigns",
  },
  // {
  //   icon: <RefreshCw className="h-6 w-6 text-[#4ECDC4]" />,
  //   title: "Auto-scaling",
  //   description: "Automatically handle thousands of subscribers with ease",
  // },
  {
    icon: <FileCode className="h-6 w-6 text-yellow-400" />,
    title: "REST API",
    description: "Comprehensive API for integrating with your applications",
    link: {
      text: "API Documentation",
      url: constants.env.DOCS_URL + "/api",
    },
  },
  {
    icon: <Settings className="h-6 w-6 text-gray-300" />,
    title: "Advanced Analytics",
    description: "Track opens, clicks, and engagement for all your campaigns",
  },
  {
    icon: <BugPlay className="h-6 w-6 text-[#4ECDC4]" />,
    title: "Built by Developers",
    description:
      "For developers, by developers. Everything you need to build and test with ease.",
    link: {
      text: "Development Guide",
      url: constants.env.DOCS_URL,
    },
  },
]

export const Features = ({ features }: { features: Feature[] }) => (
  <section className="container mx-auto px-4 py-16">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <div
          key={index}
          className="relative group overflow-hidden bg-[#1a1a1a] p-6 rounded-lg border border-gray-800 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-[#4ECDC4]/10
                     before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]
                     before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
        >
          <div className="relative z-10">
            <div className="bg-[#252525] w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
            {feature.link && (
              <Link
                href={feature.link.url}
                className="text-[#4ECDC4] hover:underline flex items-center gap-1 mt-4 text-sm"
              >
                {feature.link.text}{" "}
                <ChevronDown className="h-4 w-4 rotate-270" />
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  </section>
)
