import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features, featuresData } from "@/components/features"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Header />
      <Hero />
      <Features features={featuresData} />
      <Footer />
    </div>
  )
}
