<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { endDrag, startDrag } from '../lib/dnd'
import { bumpWeight, removeSlotTag, renameSlotTag, setTagWeight, ui } from '../store'
import type { SlotTag } from '../types'

/** 快速加权：Alt+点一下 1.3，再点一下还原 */
const BOOST = 1.3

// 不要叫 slot：slot 是 Vue 的保留 attribute，将来可能不再作为 prop 传进来
const props = defineProps<{ slotKey: string; tag: SlotTag }>()

const dragging = ref(false)
const editing = ref(false)
const zhInput = ref<HTMLInputElement | null>(null)
const draft = reactive({ zh: '', en: '' })
let clickTimer: number | null = null

const weightOf = computed(() => (props.tag.w ?? 1).toFixed(1))
const hasWeight = computed(() => (props.tag.w ?? 1) !== 1)

function onClick(event: MouseEvent) {
  if (event.altKey) {
    event.preventDefault()
    setTagWeight(props.slotKey, props.tag.en, (props.tag.w ?? 1) === BOOST ? 1 : BOOST)
    return
  }
  if (ui.weightMode) return
  // 单击删除、双击改名：延迟一下才知道是不是双击，否则第一下就把芯片删了
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
    startEdit()
    return
  }
  clickTimer = window.setTimeout(() => {
    clickTimer = null
    removeSlotTag(props.slotKey, props.tag.en)
  }, 180)
}

function onDragStart(event: DragEvent) {
  dragging.value = true
  startDrag({ from: props.slotKey, zh: props.tag.zh, en: props.tag.en }, event)
}

function onDragEnd() {
  dragging.value = false
  endDrag()
}

async function startEdit() {
  draft.zh = props.tag.zh
  draft.en = props.tag.en
  editing.value = true
  await nextTick()
  zhInput.value?.focus()
  zhInput.value?.select()
}

function commit() {
  renameSlotTag(props.slotKey, props.tag.en, { zh: draft.zh, en: draft.en })
  editing.value = false
}

function cancel() {
  editing.value = false
}
</script>

<template>
  <div
    class="tag"
    :class="{ ghost: dragging, editing }"
    :draggable="!editing"
    :title="editing ? '' : '双击改名 · Alt 点一下权重 1.3 · 点一下移出'"
    @dragstart.stop="onDragStart"
    @dragend="onDragEnd"
    @click.stop="onClick"
  >
    <template v-if="editing">
      <input
        ref="zhInput"
        v-model="draft.zh"
        class="in zh-in"
        placeholder="中文名"
        @click.stop
        @keydown.enter.prevent="commit"
        @keydown.esc="cancel"
      />
      <input
        v-model="draft.en"
        class="in en-in"
        placeholder="english_tag"
        spellcheck="false"
        @click.stop
        @keydown.enter.prevent="commit"
        @keydown.esc="cancel"
      />
      <span class="icon ok" title="保存" @click.stop="commit"><BaseIcon name="check" :size="11" /></span>
      <span class="icon no" title="取消" @click.stop="cancel"><BaseIcon name="x" :size="10" /></span>
    </template>
    <template v-else>
      <span class="zh">{{ tag.zh }}</span>
      <span v-if="hasWeight && !ui.weightMode" class="wbadge">{{ weightOf }}</span>
      <span v-if="ui.weightMode" class="wt">
        <span class="wt-btn" @click.stop="bumpWeight(slotKey, tag.en, -0.1)">−</span>
        <b>{{ weightOf }}</b>
        <span class="wt-btn" @click.stop="bumpWeight(slotKey, tag.en, 0.1)">+</span>
      </span>
      <BaseIcon name="x" :size="10" @click.stop="removeSlotTag(slotKey, tag.en)" />
    </template>
  </div>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: var(--h-chip);
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--panel);
  color: var(--ink-2);
  font-size: var(--fs-sm);
  cursor: grab;
  transition: border-color 0.15s, background 0.15s, opacity 0.15s;
}

.tag:hover {
  border-color: var(--line-2);
  background: var(--sunken);
}

.tag:active {
  cursor: grabbing;
}

.tag.ghost {
  opacity: 0.45;
  border-style: dashed;
}

/* × 常驻：和点芯片本体一样是删除，不额外占一片看不见的点击区 */
.tag > :deep(svg) {
  opacity: 0.45;
  color: var(--ink-4);
  transition: opacity 0.15s, color 0.15s;
}

.tag:hover > :deep(svg) {
  opacity: 1;
  color: var(--danger);
}

.wbadge {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-family: var(--mono);
  font-size: var(--fs-caption);
}

.wt {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.wt-btn {
  display: grid;
  place-items: center;
  width: 18px;
  height: 20px;
  border-radius: 4px;
  background: rgba(35, 31, 54, 0.06);
  color: var(--ink-2);
  font-size: var(--fs-caption);
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}

.wt-btn:hover {
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.wt b {
  min-width: 17px;
  text-align: center;
  font-family: var(--mono);
  font-size: var(--fs-caption);
  font-weight: 600;
  color: var(--ink-2);
}

.icon {
  display: grid;
  place-items: center;
  width: var(--hit-min);
  height: var(--hit-min);
  border-radius: 4px;
  color: var(--ink-4);
}

.icon:hover {
  background: var(--panel);
  color: var(--ink-2);
}

/* 进入编辑时铺满一行，两个输入框才放得下 */
.tag.editing {
  width: 100%;
  height: auto;
  padding: 4px 6px;
  border-color: var(--accent-line);
  background: var(--panel);
  cursor: default;
}

.in {
  min-width: 0;
  height: var(--h-chip);
  padding: 0 5px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  font-size: var(--fs-caption);
  outline: 0;
}

.in:focus {
  border-color: var(--accent-line);
  background: var(--panel);
}

.zh-in {
  flex: 1 1 40%;
}

.en-in {
  flex: 1 1 60%;
  font-family: var(--mono);
  font-size: var(--fs-caption);
}

.icon.ok:hover {
  color: var(--ok);
}
</style>
