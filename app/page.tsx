"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeatureCards } from "@/components/feature-cards"
import { GeneratorSection } from "@/components/generator-section"
import { Footer } from "@/components/footer"
import { isLoggedIn } from "@/lib/api"

export default function Home() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"prompt" | "upload">("prompt")

  // 已登录用户直接进入工作区
  useEffect(() => {
    if (isLoggedIn()) router.replace("/workspace")
  }, [router])

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
