<template>
  <section class="trusted-by-section pb-16 pt-4">
    <p class="trusted-by-tag">
      {{ t('landing.trustedBy.tag') }}
    </p>

    <div class="trusted-by-marquee">
      <div class="trusted-by-track">
        <div
          v-for="copy in 2"
          :key="copy"
          class="trusted-by-row"
          :aria-hidden="copy > 1 ? true : undefined"
        >
          <img
            v-for="(logo, index) in logos"
            :key="`${copy}-${index}`"
            :src="logo.src"
            :width="logo.width"
            :height="logo.height"
            alt=""
            loading="lazy"
            decoding="async"
            class="trusted-by-logo"
          >
        </div>
      </div>
      <div class="trusted-by-mask trusted-by-mask-left" />
      <div class="trusted-by-mask trusted-by-mask-right" />
    </div>
  </section>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const logos = [
  { src: '/resources/trusted-by/university-1.png', width: 120, height: 30 },
  { src: '/resources/trusted-by/university-2.png', width: 140, height: 40 },
  { src: '/resources/trusted-by/university-3.png', width: 120, height: 42 },
  { src: '/resources/trusted-by/university-4.png', width: 138, height: 35 },
  { src: '/resources/trusted-by/university-5.png', width: 134, height: 41 },
  { src: '/resources/trusted-by/university-6.png', width: 106, height: 63 },
  { src: '/resources/trusted-by/university-7.png', width: 138, height: 90 },
  { src: '/resources/trusted-by/university-8.png', width: 92, height: 61 },
  { src: '/resources/trusted-by/university-9.png', width: 129, height: 86 },
  { src: '/resources/trusted-by/university-10.png', width: 159, height: 105 },
  { src: '/resources/trusted-by/university-11.png', width: 160, height: 106 },
]
</script>

<style scoped>
.trusted-by-section {
  width: 100%;
  overflow: hidden;
}

.trusted-by-tag {
  margin: 0 auto 1.75rem;
  max-width: 42rem;
  padding: 0 1.5rem;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.5;
  color: hsl(var(--muted-foreground));
}

.trusted-by-marquee {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.trusted-by-track {
  display: flex;
  width: max-content;
  animation: trusted-by-scroll 45s linear infinite;
}

.trusted-by-marquee:hover .trusted-by-track {
  animation-play-state: paused;
}

.trusted-by-row {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3.5rem;
  padding: 0 1.75rem;
}

.trusted-by-logo {
  display: block;
  height: auto;
  max-height: 2.75rem;
  width: auto;
  max-width: 10rem;
  object-fit: contain;
  opacity: 0.55;
  filter: grayscale(1);
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.trusted-by-logo:hover {
  opacity: 0.85;
  filter: grayscale(0);
}

.trusted-by-mask {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 6rem;
}

.trusted-by-mask-left {
  left: 0;
  background: linear-gradient(to right, hsl(var(--background)), transparent);
}

.trusted-by-mask-right {
  right: 0;
  background: linear-gradient(to left, hsl(var(--background)), transparent);
}

@keyframes trusted-by-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .trusted-by-track {
    animation: none;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    gap: 2rem 3rem;
    padding: 0 1.5rem;
  }

  .trusted-by-row {
    flex-wrap: wrap;
    justify-content: center;
    padding: 0;
  }

  .trusted-by-row + .trusted-by-row {
    display: none;
  }

  .trusted-by-mask {
    display: none;
  }
}
</style>
