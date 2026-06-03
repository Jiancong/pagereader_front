<template>
  <div class="min-h-screen bg-background">
    <AppHeader />
    <main>
      <HeroSection />
      <GeneratorSection />
      <FeatureCards />
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue'
import HeroSection from './components/HeroSection.vue'
import GeneratorSection from './components/GeneratorSection.vue'
import FeatureCards from './components/FeatureCards.vue'
import AppFooter from './components/AppFooter.vue'
</script>
