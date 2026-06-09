<template>
  <img
    src="/favicon.svg"
    alt=""
    :class="['rounded-lg', imgClass]"
    aria-hidden="true"
  />
</template>

<script setup>
defineProps({
  imgClass: { type: String, default: 'h-9 w-9' },
})
</script>
