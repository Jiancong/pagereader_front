<template>
  <button
    type="button"
    class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#07C160] py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#06ad56] active:bg-[#059a4c]"
    @click="$emit('click', $event)"
  >
    <WechatIcon class="h-5 w-5 shrink-0 text-white" />
    <slot />
  </button>
</template>

<script setup>
import WechatIcon from './WechatIcon.vue'

defineEmits(['click'])
</script>
