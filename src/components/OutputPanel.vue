<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { copyText } from '../lib/clipboard'
import { notify, outputs, selectedCharItems, settings, totalTagCount, ui, view } from '../store'
import type { Target } from '../types'

const TARGETS = [
  { key: 'moss', label: 'MOSS', hint: '中文段落 + 中文负向' },
  { key: 'wai', label: 'WAI', hint: 'Illustrious / NoobAI' },
  { key: 'pony', label: 'PONY', hint: 'score 前缀 + Pony 负向' },
] as const satisfies readonly { key: Target; label: string; hint: string }[]

const copied = ref('')

/** 当前在看哪个模型：落盘，下次打开还是同一个 */
const current = computed(() => view.lastTarget)
const currentLabel = computed(() => TARGETS.find((t) => t.key === view.lastTarget)?.label ?? '')

const densityLabel = computed(() => ({ lite: '精简', normal: '标准', rich: '复杂' })[settings.density])

const hasContent = computed(() => selectedCharItems.value.length > 0 || totalTagCount.value > 0)

async function copy(key: Target, part: 'positive' | 'negative') {
  const ok = await copyText(outputs.value[key][part])
  if (!ok) {
    notify('这段是空的，没东西可复制', 'warn')
    return
  }
  view.lastTarget = key
  copied.value = `${key}-${part}`
  setTimeout(() => (copied.value = ''), 1400)
  notify(part === 'positive' ? '正向已复制' : '负向已复制')
}
</script>

<template>
  <section class="panel output">
    <div class="panel-head">
      <div class="panel-title">
        提示词输出
        <small>{{ densityLabel }}档</small>
      </div>
      <div class="head-actions">
        <button class="btn sm ghost" @click="view.showNegative = !view.showNegative">
          {{ view.showNegative ? '隐藏负向' : '显示负向' }}
        </button>
        <button class="icon-btn" title="AI 润色" @click="ui.polishOpen = true">
          <BaseIcon name="sparkles" :size="15" />
        </button>
        <button
          class="icon-btn"
          :title="view.outputExpandAll ? '只看一套' : '三套全部展开'"
          @click="view.outputExpandAll = !view.outputExpandAll"
        >
          <BaseIcon name="layers" :size="15" />
        </button>
        <button
          class="btn sm primary"
          :disabled="!hasContent"
          :title="`复制 ${currentLabel} 正向`"
          @click="copy(current, 'positive')"
        >
          <BaseIcon :name="copied === `${current}-positive` ? 'check' : 'copy'" :size="12" />
          复制正向 · {{ currentLabel }}
        </button>
      </div>
    </div>

    <div v-if="!view.outputExpandAll" class="tabs" role="tablist">
      <button
        v-for="t in TARGETS"
        :key="t.key"
        role="tab"
        :aria-selected="current === t.key"
        class="tab"
        :class="{ on: current === t.key }"
        @click="view.lastTarget = t.key"
      >
        {{ t.label }}<small>{{ t.hint }}</small>
      </button>
    </div>

    <div class="panel-body">
      <div v-if="!hasContent" class="empty">
        <BaseIcon name="sparkles" :size="26" />
        <div>选好角色，这里就出提示词</div>
        <div class="hint">换档位会改标签数量，改开关会改负向</div>
      </div>

      <template v-else-if="!view.outputExpandAll">
        <pre class="text">{{ outputs[current].positive || '—' }}</pre>
        <template v-if="outputs[current].negative">
          <button class="neg-toggle" :aria-expanded="view.showNegative" @click="view.showNegative = !view.showNegative">
            负向 <span>{{ view.showNegative ? '▾' : '▸' }}</span>
          </button>
          <pre v-if="view.showNegative" class="text neg">{{ outputs[current].negative }}</pre>
        </template>
      </template>

      <template v-else>
        <div
          v-for="t in TARGETS"
          :key="t.key"
          class="block"
          :class="{ current: current === t.key }"
          @click="view.lastTarget = t.key"
        >
          <div class="block-head">
            <div class="name">{{ t.label }} <small>{{ t.hint }}</small></div>
            <span v-if="current === t.key" class="cur">当前</span>
          </div>
          <pre class="text">{{ outputs[t.key].positive || '—' }}</pre>
          <template v-if="view.showNegative">
            <div class="neg-head">负向</div>
            <pre class="text neg">{{ outputs[t.key].negative }}</pre>
          </template>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.output {
  background: var(--panel-rest);
}

/* 右栏最窄 320：标题 + 4 个操作在 400px 里放不下一行，
   不换行会把「复制正向」挤出面板（.panel 是 overflow:hidden） */
.output .panel-head {
  background: var(--panel-rest);
  flex-wrap: wrap;
  row-gap: 6px;
}

.panel-body {
  padding: 12px;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  row-gap: 6px;
}

/* 三个页签连同 hint 一共约 500px，窄面板里横向滚而不是裁掉第三个 */
.tabs {
  display: flex;
  gap: 4px;
  padding: 0 12px 10px;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  display: inline-flex;
  flex: none;
  align-items: baseline;
  gap: 6px;
  height: var(--h-btn-sm);
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-3);
  font-size: var(--fs-sm);
}

.tab small {
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.tab.on {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--accent-ink);
  font-weight: 600;
}

.tab.on small {
  color: var(--accent-ink);
}

/* 正文本体：不再限高、不再内滚 —— 长提示词一次看全，不用在两处滚动条之间倒手 */
.text {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: var(--fs-sm);
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
}

.text.neg {
  margin-top: 8px;
  padding: 10px;
  background: var(--surface);
  border-left: 2px solid var(--line-2);
  color: var(--ink-3);
}

.neg-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

/* 三套全展开：块之间只留一条 1px 分隔线，不要每块套一个盒子 */
.block {
  padding-top: 12px;
  cursor: pointer;
}

.block + .block {
  margin-top: 12px;
  border-top: 1px solid var(--line);
}

.block.current .name {
  color: var(--accent-ink);
}

.cur {
  flex: none;
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: var(--fs-caption);
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
  font-size: var(--fs-sm);
  font-weight: 600;
  letter-spacing: 0.6px;
}

.name small {
  color: var(--ink-3);
  font-size: var(--fs-caption);
  font-weight: 400;
  letter-spacing: 0;
}

.neg-head {
  margin: 8px 0 5px;
  font-size: var(--fs-caption);
  color: var(--ink-3);
  letter-spacing: 0.6px;
}

.hint {
  font-size: var(--fs-sm);
  color: var(--ink-3);
  max-width: 220px;
}
</style>
