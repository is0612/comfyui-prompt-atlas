<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { copyText } from '../lib/clipboard'
import { polish, polishEnglish, splitPolish } from '../lib/ai'
import { globalTags, notify, selectedCharItems, settings, slotTags, ui } from '../store'

const input = ref('')
const zh = ref('')
const en = ref('')
const error = ref('')
const loading = ref(false)
/** 英文是单独补请求来的 */
const enAuto = ref(false)
const enOnlyLoading = ref(false)
let controller: AbortController | null = null

const modelLabel = computed(() => settings.aiModel || '未配置模型')
const done = computed(() => Boolean(zh.value || en.value))

function prefill() {
  // 发色/瞳色/服装写成显式字段，配合系统提示词里的「设定锁定」才管得住模型
  const lines = selectedCharItems.value.map((char) => {
    const parts: string[] = []
    if (char.hair) parts.push(`发=${char.hair}`)
    if (char.eyes) parts.push(`瞳=${char.eyes}`)
    if (char.outfit) parts.push(`衣=${char.outfit}`)
    if (char.body) parts.push(`体型=${char.body}`)
    const extra = [char.traits, ...slotTags(char.en).map((t) => t.zh)].filter(Boolean)
    if (extra.length) parts.push(`补充=${extra.join('、')}`)
    return parts.length ? `${char.zh}：${parts.join('；')}` : char.zh
  })
  if (globalTags.value.length) lines.push(`场景：${globalTags.value.map((t) => t.zh).join('、')}`)
  input.value = lines.join('\n')
}

watch(
  () => ui.polishOpen,
  (open) => {
    if (!open) {
      controller?.abort()
      return
    }
    error.value = ''
    if (!input.value.trim()) prefill()
  },
)

function config() {
  return { base: settings.aiBase, model: settings.aiModel, key: settings.aiKey, system: settings.aiSystem }
}

async function fetchEnglish(signal?: AbortSignal) {
  const text = (await polishEnglish(config(), input.value, signal)).trim()
  if (text) {
    en.value = text
    enAuto.value = true
  }
  return text
}

async function run() {
  if (loading.value) return
  error.value = ''
  enAuto.value = false
  en.value = ''
  zh.value = ''
  loading.value = true
  controller = new AbortController()
  try {
    const raw = await polish(config(), input.value, controller.signal)
    const parsed = splitPolish(raw)
    zh.value = parsed.zh
    en.value = parsed.en
    // 模型常常把英文块吃掉，漏了就自动单独再要一次（只多一次请求，失败就留手动按钮）
    if (!parsed.en) {
      try {
        await fetchEnglish(controller.signal)
      } catch {
        /* 留给下面的「单独要英文」按钮 */
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : '生成失败'
  } finally {
    loading.value = false
    controller = null
  }
}

async function onlyEnglish() {
  if (enOnlyLoading.value) return
  enOnlyLoading.value = true
  controller = new AbortController()
  try {
    await fetchEnglish(controller.signal)
    if (!en.value) error.value = '模型还是没给英文，换个模型或者把提示词模板恢复默认试试'
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : '补英文失败'
  } finally {
    enOnlyLoading.value = false
    controller = null
  }
}

async function copy(value: string, label: string) {
  if (await copyText(value)) notify(`${label}已复制`)
}

function stop() {
  controller?.abort()
  loading.value = false
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.polishOpen" class="mask" @click.self="ui.polishOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">
            AI 润色
            <small>{{ modelLabel }}</small>
          </div>
          <div class="head-actions">
            <button class="btn sm ghost" @click="ui.settingsOpen = true">接口设置</button>
            <button class="icon-btn" @click="ui.polishOpen = false"><BaseIcon name="x" /></button>
          </div>
        </div>

        <div class="body">
          <label class="field">
            <span>想画什么（发 / 瞳 / 衣 是锁定设定，后面的补充会自由发挥）</span>
            <textarea v-model="input" rows="6" spellcheck="false" placeholder="甘雨：发=蓝紫色长发；瞳=金瞳；衣=黑金仙兽服饰；补充=神社、樱花、回头微笑" />
          </label>

          <div class="ops">
            <button v-if="!loading" class="btn primary" @click="run">
              <BaseIcon name="sparkles" :size="14" /> 生成画面描述
            </button>
            <button v-else class="btn" @click="stop">停止</button>
            <button class="btn sm ghost" @click="prefill">从拼装区重填</button>
            <span class="muted">提示词模板在「设置 → AI」里能改</span>
          </div>

          <div v-if="error" class="error">{{ error }}</div>

          <div class="result" :class="{ dual: en }">
            <div class="pane">
              <div class="result-head">
                <span>中文 · MOSS</span>
                <button v-if="zh" class="btn sm" @click="copy(zh, '中文结果')">
                  <BaseIcon name="copy" :size="12" /> 复制
                </button>
              </div>
              <pre v-if="zh" class="text">{{ zh }}</pre>
              <div v-else class="placeholder">{{ loading ? '正在生成…' : '生成的中文段落会出现在这里' }}</div>
            </div>

            <div v-if="en" class="pane">
              <div class="result-head">
                <span>英文 · WAI / Pony<em v-if="enAuto">单独补的</em></span>
                <button class="btn sm" @click="copy(en, '英文结果')"><BaseIcon name="copy" :size="12" /> 复制</button>
              </div>
              <pre class="text mono">{{ en }}</pre>
            </div>
          </div>

          <p v-if="done && !en && !loading" class="note">
            这次没拿到英文块，可能模型不认分隔行。
            <button class="link" :disabled="enOnlyLoading" @click="onlyEnglish">
              {{ enOnlyLoading ? '正在单独要英文…' : '单独要一次英文' }}
            </button>
          </p>
        </div>

        <div class="foot">
          <span class="muted">Key 存在本机浏览器，只会发给你填的接口</span>
          <button class="btn" @click="ui.polishOpen = false">关闭</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 72;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(880px, 100%);
  max-height: 88vh;
  border-radius: 16px;
  background: var(--panel);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line);
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: var(--fs-title);
  font-weight: 600;
}

.title small {
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: var(--fs-caption);
  font-weight: 400;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field > span {
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--sunken);
  font-size: var(--fs-sm);
  line-height: 1.8;
  resize: vertical;
  outline: 0;
}

textarea:focus {
  border-color: var(--accent-line);
  background: var(--panel);
}

.ops {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0;
}

.muted {
  margin-left: auto;
  color: var(--ink-4);
  font-size: var(--fs-caption);
}

.error {
  margin-bottom: 10px;
  padding: 8px 11px;
  border: 1px solid var(--danger-line);
  border-radius: 9px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--fs-sm);
  line-height: 1.7;
}

.result {
  display: grid;
  grid-template-columns: 1fr;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  overflow: hidden;
}

.result.dual {
  grid-template-columns: 1fr 1fr;
}

.pane {
  min-width: 0;
}

.pane + .pane {
  border-left: 1px solid var(--line);
}

.note {
  margin: 9px 0 0;
  color: var(--ink-4);
  font-size: var(--fs-caption);
  line-height: 1.7;
}

.link {
  border: 0;
  background: transparent;
  color: var(--accent-ink);
  font-size: var(--fs-caption);
  text-decoration: underline;
  padding: 0;
}

.link:disabled {
  color: var(--ink-4);
  text-decoration: none;
}

.result-head em {
  margin-left: 5px;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--sunken-2);
  color: var(--ink-4);
  font-size: var(--fs-caption);
  font-style: normal;
}

.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 11px;
  border-bottom: 1px solid var(--line);
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.text {
  margin: 0;
  padding: 11px 12px;
  font-size: var(--fs-sm);
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.text.mono {
  font-family: var(--mono);
  font-size: var(--fs-caption);
  line-height: 1.85;
}

.placeholder {
  padding: 26px 12px;
  color: var(--ink-4);
  font-size: var(--fs-sm);
  text-align: center;
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.foot .muted {
  margin-right: auto;
  margin-left: 0;
}
</style>
