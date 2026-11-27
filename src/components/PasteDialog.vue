<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { allCharacters, allTags, applyParsed, notify, ui } from '../store'
import { buildIndex, isCjk, parsePrompt, unknownSlot, type ParseResult } from '../lib/parse'
import type { SlotTag } from '../types'

const text = ref('')
const result = ref<ParseResult | null>(null)
const keepUnknown = ref(true)
let timer: number | undefined

const index = computed(() => buildIndex(allTags.value, allCharacters.value))
const known = computed(() => {
  if (!result.value) return 0
  return result.value.chars.reduce((sum, c) => sum + c.tags.length, 0) + result.value.globals.length
})
/** 中文的未知词没有英文可写，导入会污染英文输出，所以直接不导 */
const enUnknown = computed(() => (result.value?.unknown ?? []).filter((t) => !isCjk(t)))
const zhUnknown = computed(() => (result.value?.unknown ?? []).filter((t) => isCjk(t)))
const importCount = computed(() => known.value + (keepUnknown.value ? enUnknown.value.length : 0))

watch(text, (value) => {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    result.value = value.trim().length >= 2 ? parsePrompt(value, index.value) : null
  }, 180)
})

watch(
  () => ui.pasteOpen,
  (open) => {
    if (open) text.value = ''
    result.value = null
  },
)

function shown(tags: SlotTag[]) {
  return tags.slice(0, 8)
}

function run() {
  if (!result.value || !importCount.value) {
    notify('没解析出东西，检查下输入', 'warn')
    return
  }
  const payload = result.value
  if (keepUnknown.value && enUnknown.value.length) {
    payload.globals = [
      ...payload.globals,
      ...enUnknown.value.map(unknownSlot).filter((t) => !payload.globals.some((g) => g.en === t.en)),
    ]
  }
  applyParsed(payload)
  ui.pasteOpen = false
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.pasteOpen" class="mask" @click.self="ui.pasteOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">
            粘贴解析
            <small>提示词 / 中文描述 → 角色 + 标签</small>
          </div>
          <button class="icon-btn" @click="ui.pasteOpen = false"><BaseIcon name="x" /></button>
        </div>

        <div class="body">
          <textarea
            v-model="text"
            rows="6"
            spellcheck="false"
            placeholder="粘一段现成的提示词，或者几句中文描述：&#10;1girl, ganyu_(genshin_impact), blue_hair, long_hair, sitting, shrine&#10;或者：甘雨穿着中式短衫坐在神社台阶上，黄昏，樱花"
          />

          <div v-if="result" class="preview">
            <div class="ph">
              识别到 <b>{{ result.chars.length }}</b> 个角色、<b>{{ known }}</b> 个标签
              <span v-if="result.unknown.length" class="warn">· {{ result.unknown.length }} 个词库里没有</span>
            </div>

            <div v-for="char in result.chars" :key="char.en" class="grp">
              <div class="gt">
                <span class="nm">{{ char.zh }}</span>
                <small>{{ char.en }}</small>
                <span class="count">{{ char.tags.length }}</span>
              </div>
              <div class="chips">
                <span v-for="tag in shown(char.tags)" :key="tag.en" class="chip">
                  {{ tag.zh }}<i v-if="tag.w">{{ tag.w }}</i>
                </span>
                <span v-if="char.tags.length > 8" class="more">+{{ char.tags.length - 8 }}</span>
                <span v-if="!char.tags.length" class="more">这个角色下面没认到标签</span>
              </div>
            </div>

            <div v-if="result.globals.length" class="grp">
              <div class="gt">
                <span class="nm">全局</span>
                <small>场景 / 画风</small>
                <span class="count">{{ result.globals.length }}</span>
              </div>
              <div class="chips">
                <span v-for="tag in shown(result.globals)" :key="tag.en" class="chip">
                  {{ tag.zh }}<i v-if="tag.w">{{ tag.w }}</i>
                </span>
                <span v-if="result.globals.length > 8" class="more">+{{ result.globals.length - 8 }}</span>
              </div>
            </div>

            <div v-if="enUnknown.length" class="grp miss">
              <div class="gt">
                <span class="nm">词库里没有</span>
                <small>{{ keepUnknown ? '英文原样加入全局' : '将被忽略' }}</small>
              </div>
              <div class="chips">
                <span v-for="item in enUnknown.slice(0, 12)" :key="item" class="chip raw">{{ item }}</span>
                <span v-if="enUnknown.length > 12" class="more">+{{ enUnknown.length - 12 }}</span>
              </div>
            </div>

            <div v-if="zhUnknown.length" class="grp miss">
              <div class="gt">
                <span class="nm">中文未收录</span>
                <small>没有对应英文，不导入；要的话用「自定义词条」补</small>
              </div>
              <div class="chips">
                <span v-for="item in zhUnknown.slice(0, 12)" :key="item" class="chip raw">{{ item }}</span>
                <span v-if="zhUnknown.length > 12" class="more">+{{ zhUnknown.length - 12 }}</span>
              </div>
            </div>
          </div>

          <div v-else class="placeholder">贴上内容，会自动识别角色和标签</div>
        </div>

        <div class="foot">
          <label class="keep">
            <input v-model="keepUnknown" type="checkbox" />
            没认出来的词也原样加入全局
          </label>
          <button class="btn" @click="ui.pasteOpen = false">取消</button>
          <button class="btn primary" :disabled="!importCount" @click="run">
            导入{{ importCount ? ` ${importCount}` : '' }}
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
  font-size: var(--fs-caption);
  font-weight: 400;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px 16px;
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

.preview {
  margin-top: 12px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  padding: 10px 12px;
}

.ph {
  color: var(--ink-3);
  font-size: var(--fs-sm);
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--line);
}

.ph b {
  color: var(--accent-ink);
}

.warn {
  color: var(--danger);
}

.grp {
  padding-top: 9px;
}

.gt {
  display: flex;
  align-items: baseline;
  gap: 7px;
  margin-bottom: 6px;
}

.nm {
  font-size: var(--fs-sm);
  font-weight: 500;
}

.gt small {
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: var(--fs-caption);
}

.count {
  margin-left: auto;
  padding: 0 6px;
  border-radius: 99px;
  background: var(--sunken-2);
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 21px;
  padding: 0 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  color: var(--ink-2);
  font-size: var(--fs-caption);
}

.chip i {
  color: var(--accent-ink);
  font-family: var(--mono);
  font-size: var(--fs-caption);
  font-style: normal;
}

.chip.raw {
  border-style: dashed;
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: var(--fs-caption);
}

.more {
  color: var(--ink-4);
  font-size: var(--fs-caption);
  line-height: 21px;
}

.miss .chips {
  opacity: 0.85;
}

.placeholder {
  padding: 30px 12px;
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

.keep {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: auto;
  color: var(--ink-3);
  font-size: var(--fs-caption);
  cursor: pointer;
}

.keep input {
  accent-color: var(--accent);
}
</style>
