<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { copyText } from '../lib/clipboard'
import { notify, outputs, selectedCharItems, settings, totalTagCount, ui } from '../store'
import type { Target } from '../types'

const TARGETS = [
  { key: 'moss', label: 'MOSS', hint: '中文段落 + 中文负向' },
  { key: 'wai', label: 'WAI', hint: 'Illustrious / NoobAI' },
  { key: 'pony', label: 'PONY', hint: 'score 前缀 + Pony 负向' },
] as const satisfies readonly { key: Target; label: string; hint: string }[]

const copied = ref('')

const densityLabel = computed(() => ({ lite: '精简', normal: '标准', rich: '复杂' })[settings.density])

const hasContent = computed(() => selectedCharItems.value.length > 0 || totalTagCount.value > 0)

async function copy(key: Target, part: 'positive' | 'negative') {
  const ok = await copyText(outputs.value[key][part])
  if (!ok) {
    notify('这段是空的，没东西可复制', 'warn')
    return
  }
  copied.value = `${key}-${part}`
  setTimeout(() => (copied.value = ''), 1400)
  notify(part === 'positive' ? '正向已复制' : '负向已复制')
}
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div class="panel-title">
        提示词输出
        <small>{{ densityLabel }}档</small>
      </div>
      <div class="head-actions">
        <button class="btn sm primary" @click="ui.polishOpen = true"><BaseIcon name="sparkles" :size="12" /> AI 润色</button>
        <button class="btn sm ghost" @click="ui.showNegative = !ui.showNegative">
          {{ ui.showNegative ? '隐藏负向' : '显示负向' }}
        </button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="!hasContent" class="empty">
        <BaseIcon name="sparkles" :size="26" />
        <div>选好角色，这里就出提示词</div>
        <div class="hint">换档位会改标签数量，改开关会改负向</div>
      </div>

      <template v-else>
        <div v-for="target in TARGETS" :key="target.key" class="block">
          <div class="block-head">
            <div class="name">
              {{ target.label }}
              <small>{{ target.hint }}</small>
            </div>
            <div class="btns">
              <button class="btn sm" :class="{ on: copied === `${target.key}-positive` }" @click="copy(target.key, 'positive')">
                <BaseIcon :name="copied === `${target.key}-positive` ? 'check' : 'copy'" :size="12" />
                正向
              </button>
              <button
                v-if="ui.showNegative"
                class="btn sm ghost"
                :class="{ on: copied === `${target.key}-negative` }"
                @click="copy(target.key, 'negative')"
              >
                负向
              </button>
            </div>
          </div>
          <pre class="text">{{ outputs[target.key].positive || '—' }}</pre>
          <template v-if="ui.showNegative">
            <div class="neg-head">负向</div>
            <pre class="text neg">{{ outputs[target.key].negative }}</pre>
          </template>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.panel-body {
  padding: 12px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.block {
  margin-bottom: 12px;
  padding: 10px 11px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: linear-gradient(180deg, #fff, #fbfaff);
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.name {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.6px;
}

.name small {
  color: var(--ink-4);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0;
}

.btns {
  display: flex;
  gap: 5px;
}

.text {
  margin: 0;
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--ink);
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 168px;
  overflow-y: auto;
}

.text.neg {
  color: var(--ink-3);
  background: #fbfafc;
  border: 1px dashed var(--line);
}

.neg-head {
  margin: 8px 0 5px;
  font-size: 10px;
  color: var(--ink-4);
  letter-spacing: 0.6px;
}

.hint {
  font-size: 11.5px;
  color: var(--ink-4);
  max-width: 220px;
}
</style>
