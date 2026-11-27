<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import { allCharacters, canRedo, canUndo, games, redo, settings, ui, undo } from '../store'
import type { Density } from '../types'

const DENSITIES: { key: Density; label: string }[] = [
  { key: 'lite', label: '精简' },
  { key: 'normal', label: '标准' },
  { key: 'rich', label: '复杂' },
]
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="mark">P</div>
      <div class="titles">
        <strong>提示词图鉴</strong>
        <span>Prompt Atlas</span>
      </div>
    </div>

    <div class="stat">
      图鉴 <b>{{ allCharacters.length }}</b> 位 · <b>{{ games.length }}</b> 个游戏
    </div>

    <div class="actions">
      <div class="seg">
        <button
          v-for="item in DENSITIES"
          :key="item.key"
          :class="{ on: settings.density === item.key }"
          @click="settings.density = item.key"
        >
          {{ item.label }}
        </button>
      </div>
      <button class="icon-btn" :disabled="!canUndo" title="撤销（Ctrl+Z）" @click="undo()">
        <BaseIcon name="undo" />
      </button>
      <button class="icon-btn" :disabled="!canRedo" title="重做（Ctrl+Shift+Z）" @click="redo()">
        <BaseIcon name="redo" />
      </button>
      <button class="icon-btn" title="历史记录" @click="ui.historyOpen = true"><BaseIcon name="clock" /></button>
      <button class="icon-btn" title="设置" @click="ui.settingsOpen = true"><BaseIcon name="sliders" /></button>
      <button class="btn sm" @click="ui.guideOpen = true"><BaseIcon name="book" /> 说明书</button>
    </div>
  </header>
</template>

<style scoped>
/* 顶栏不吸顶，没有内容会从它底下滚过去，模糊看不到效果只是白占一层合成 */
.topbar {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 18px;
  height: 58px;
  padding: 0 18px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: var(--fs-title);
  font-weight: 700;
  letter-spacing: 0.4px;
}

.titles {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.titles strong {
  font-size: var(--fs-title);
  letter-spacing: 0.3px;
}

.titles span {
  font-size: var(--fs-caption);
  color: var(--ink-3);
  letter-spacing: 1.1px;
  text-transform: uppercase;
}

.stat {
  color: var(--ink-3);
  font-size: var(--fs-sm);
}

.stat b {
  color: var(--ink-2);
  font-weight: 600;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 860px) {
  .stat {
    display: none;
  }
}
</style>
