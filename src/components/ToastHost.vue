<script setup lang="ts">
import { toasts } from '../store'
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div v-for="item in toasts" :key="item.id" class="toast" :class="item.tone">{{ item.text }}</div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 28px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
}

.toast {
  padding: 9px 16px;
  border-radius: 10px;
  background: #26223a;
  color: #fff;
  font-size: 12.5px;
  box-shadow: var(--shadow-lg);
}

.toast.warn {
  background: #8a4b0f;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
