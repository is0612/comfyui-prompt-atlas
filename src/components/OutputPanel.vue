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
/** 页签只放名字，说明文字单独一行放正文上方，页签才能三段等分且不换行 */
const currentHint = computed(() => TARGETS.find((t) => t.key === view.lastTarget)?.hint ?? '')

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
      <div class="panel-title">提示词输出</div>
      <div class="head-actions">
        <button class="icon-btn" title="AI 润色" @click="ui.polishOpen = true">
          <BaseIcon name="sparkles" :size="15" />
        </button>
        <button
          class="btn sm primary"
          :disabled="!hasContent"
          :title="`复制 ${currentLabel} 正向`"
          @click="copy(current, 'positive')"
        >
          <BaseIcon :name="copied === `${current}-positive` ? 'check' : 'copy'" :size="12" />
          <span class="txt-long">复制正向 · {{ currentLabel }}</span>
          <span class="txt-short">复制 · {{ currentLabel }}</span>
        </button>
      </div>
    </div>

    <!-- 三套全空时连页签条一起不渲染：用户该看到的是空态引导，不是三个灰页签配空正文 -->
    <div v-if="hasContent" class="tabbar">
      <div class="tabs" role="tablist" aria-label="输出目标">
        <button
          v-for="t in TARGETS"
          :key="t.key"
          role="tab"
          :aria-selected="current === t.key"
          class="tab"
          :class="{ on: current === t.key }"
          @click="view.lastTarget = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <span class="density" title="档位在顶栏切换">{{ densityLabel }}档</span>
    </div>

    <div class="panel-body">
      <div v-if="!hasContent" class="empty">
        <BaseIcon name="sparkles" :size="26" />
        <div>选好角色，这里就出提示词</div>
        <div class="hint">换档位会改标签数量，改开关会改负向</div>
      </div>

      <template v-else>
        <div class="hint-line">{{ currentHint }}</div>
        <pre class="text">{{ outputs[current].positive || '—' }}</pre>
        <template v-if="outputs[current].negative">
          <button
            class="neg-toggle"
            :class="{ on: view.showNegative }"
            :aria-expanded="view.showNegative"
            @click="view.showNegative = !view.showNegative"
          >
            负向 <span>{{ view.showNegative ? '▾' : '▸' }}</span>
          </button>
          <pre v-if="view.showNegative" class="text neg">{{ outputs[current].negative }}</pre>
        </template>
      </template>
    </div>
  </section>
</template>

<style scoped>
.output {
  background: var(--panel-rest);
}

/* 右栏最窄 320（可用 292）：标题 + 三个操作放不进一行，不换行会把「复制正向」挤出面板 */
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

/* 窄栏降级：主按钮去掉「正向」二字（title 保留完整含义）。
   单列（≤1120）右栏变成整屏宽，长文案放得下，所以再显回来 */
.txt-short {
  display: none;
}

@media (max-width: 1320px) {
  .txt-long {
    display: none;
  }

  .txt-short {
    display: inline;
  }
}

@media (max-width: 1120px) {
  .txt-long {
    display: inline;
  }

  .txt-short {
    display: none;
  }
}

/* 页签条直接坐在静息表面上，不再叠一层 sunken 底。
   三段等分，名字之外什么都没有 —— 计数不随操作变化，是噪音不是信息 */
.tabbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px;
  border-bottom: 1px solid var(--line);
}

.tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.tab {
  flex: 1;
  height: var(--h-btn-sm);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-3);
  font-size: var(--fs-sm);
  font-weight: 500;
}

.tab.on {
  border-color: var(--line-2);
  background: var(--panel);
  color: var(--ink);
  font-weight: 600;
}

/* 档位是纯展示，不参与等分；它正好落在「第 4 段」的位置，所以必须防误点 */
.density {
  flex: none;
  padding-left: 12px;
  border-left: 1px solid var(--line);
  color: var(--ink-3);
  font-size: var(--fs-caption);
  user-select: none;
  pointer-events: none;
}

/* 正文本体：不限高、不内滚 —— 长提示词一次看全，右栏只有面板这一层滚动条 */
.hint-line {
  margin-bottom: 8px;
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.text {
  margin: 0;
  padding: 0;
  background: transparent;
  color: var(--ink);
  font-family: var(--mono);
  font-size: var(--fs-sm);
  line-height: 1.75;
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

/* 负向的唯一入口：贴着负向内容，并且展开/收起有明显状态差别（窄屏也一样） */
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

.neg-toggle.on {
  color: var(--ink);
}

.hint {
  font-size: var(--fs-sm);
  color: var(--ink-3);
  max-width: 220px;
}
</style>
