<script setup lang="ts">
import { ICONS, type IconName } from '../lib/icons'

withDefaults(defineProps<{ name: IconName; size?: number; filled?: boolean }>(), { size: 16, filled: false })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="ICONS[name]" />
  </svg>
</template>
