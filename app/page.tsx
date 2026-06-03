"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeatureCards } from "@/components/feature-cards"
import { GeneratorSection } from "@/components/generator-section"
import { Footer } from "@/components/footer"

export default function Home() {
  const [activeTab, setActiveTab] = useState<"prompt" | "upload">("prompt")

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <GeneratorSection activeTab={activeTab} setActiveTab={setActiveTab} />
        <FeatureCards />
      </main>
      <Footer />
    </div>
  )
}
