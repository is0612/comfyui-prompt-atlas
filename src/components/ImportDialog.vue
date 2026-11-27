<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { CSV_TEMPLATE, downloadFile, parseCharacters } from '../lib/importer'
import { importCharacters, notify, ui } from '../store'

const text = ref('')
const fallbackGame = ref('')

/**
 * 解析结果和错误一起算出来。
 * 原来是 computed 里直接写 error.value —— computed 必须是纯的，副作用会让
 * error 的更新时机依赖「谁先读了 parsed」，刷新顺序一变就会闪一下旧错误。
 */
const result = computed(() => {
  const raw = text.value.trim()
  if (!raw) return { parsed: null, error: '' }
  try {
    return { parsed: parseCharacters(raw), error: '' }
  } catch (err) {
    return { parsed: null, error: err instanceof Error ? err.message : '解析失败' }
  }
})

const parsed = computed(() => result.value.parsed)
const error = computed(() => result.value.error)

const gamesFound = computed(() => {
  const out: string[] = []
  for (const char of parsed.value?.characters ?? []) {
    if (char.game && !out.includes(char.game)) out.push(char.game)
  }
  return out
})

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    text.value = String(reader.result ?? '')
  }
  reader.readAsText(file, 'utf-8')
  input.value = ''
}

function submit() {
  if (!parsed.value?.characters.length) {
    notify('还没解析出角色', 'warn')
    return
  }
  importCharacters(parsed.value.characters, fallbackGame.value.trim())
  ui.importOpen = false
  text.value = ''
  fallbackGame.value = ''
}

function template() {
  downloadFile('characters-template.csv', CSV_TEMPLATE, 'text/csv')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.importOpen" class="mask" @click.self="ui.importOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">
            导入角色
            <small>JSON 或 CSV，字段一样就行</small>
          </div>
          <button class="icon-btn" @click="ui.importOpen = false"><BaseIcon name="x" /></button>
        </div>

        <div class="body">
          <div class="hint-line">
            支持 <code>[{"zh":"甘雨","en":"ganyu_(genshin_impact)","game":"原神"}]</code> 这种数组，
            也支持带表头的 CSV / TSV。中文表头也认：中文名、英文tag、游戏、体型、发型、瞳色、服装、特征、头像、标签。
          </div>

          <div class="row">
            <label class="file">
              <BaseIcon name="upload" :size="14" /> 选择文件
              <input type="file" accept=".json,.csv,.txt,.tsv" @change="onFile" />
            </label>
            <button class="btn sm ghost" @click="template"><BaseIcon name="download" :size="13" /> 下载 CSV 模板</button>
            <span class="muted">或者直接粘到下面</span>
          </div>

          <textarea
            v-model="text"
            spellcheck="false"
            placeholder='[
  { "zh": "甘雨", "en": "ganyu_(genshin_impact)", "game": "原神",
    "body": "少女", "hair": "蓝紫色长发", "eyes": "金瞳", "outfit": "黑金配色仙兽服饰",
    "traits": "麒麟角", "tags": "blue_hair, long_hair, horns" }
]'
          />

          <div class="game">
            <label>这批角色归属的游戏</label>
            <input v-model="fallbackGame" :placeholder="gamesFound.length ? gamesFound.join(' / ') : '留空则用记录里的 game 字段'" />
          </div>

          <div class="preview" :class="{ bad: error }">
            <template v-if="error">解析失败：{{ error }}</template>
            <template v-else-if="parsed">
              <b>{{ parsed.characters.length }}</b> 个角色可导入
              <span v-if="parsed.missingGame" class="warn">· {{ parsed.missingGame }} 个没写游戏</span>
              <span v-if="parsed.skipped" class="muted">· 跳过 {{ parsed.skipped }} 条（重复或缺中文名/英文tag）</span>
              <span v-if="gamesFound.length" class="muted">· 涉及 {{ gamesFound.join('、') }}</span>
            </template>
            <template v-else>还没有内容</template>
          </div>
        </div>

        <div class="foot">
          <span class="muted small">同英文 tag 的记录会覆盖旧的</span>
          <button class="btn" @click="ui.importOpen = false">取消</button>
          <button class="btn primary" :disabled="!parsed?.characters.length" @click="submit">
            导入 {{ parsed?.characters.length || '' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(680px, 100%);
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
  padding: 14px 16px;
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
  font-size: var(--fs-caption);
  font-weight: 400;
  color: var(--ink-3);
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px;
}

.hint-line {
  padding: 9px 11px;
  border-radius: 9px;
  background: var(--sunken);
  color: var(--ink-2);
  font-size: var(--fs-sm);
  line-height: 1.8;
}

.hint-line code {
  font-family: var(--mono);
  font-size: var(--fs-caption);
  color: var(--accent-ink);
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
}

.file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  color: var(--ink-2);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.file:hover {
  border-color: var(--line-2);
}

.file input {
  display: none;
}

textarea {
  width: 100%;
  height: 190px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--sunken);
  font-family: var(--mono);
  font-size: var(--fs-sm);
  line-height: 1.7;
  resize: vertical;
  outline: 0;
}

textarea:focus {
  border-color: var(--accent-line);
  background: var(--panel);
}

.game {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.game label {
  flex: none;
  font-size: var(--fs-sm);
  color: var(--ink-2);
}

.game input {
  flex: 1;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  font-size: var(--fs-sm);
  outline: 0;
}

.game input:focus {
  border-color: var(--accent-line);
}

.preview {
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 9px;
  border: 1px dashed var(--accent-line);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: var(--fs-sm);
  line-height: 1.7;
}

.preview.bad {
  border-color: var(--danger-line);
  background: var(--danger-soft);
  color: var(--danger);
}

.muted {
  color: var(--ink-3);
  font-size: var(--fs-sm);
}

.warn {
  color: var(--warn);
}

.small {
  font-size: var(--fs-caption);
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.foot .muted {
  margin-right: auto;
}
</style>
