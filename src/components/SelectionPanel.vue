<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import TagChip from './TagChip.vue'
import { LIB_SLOT, asSlotTag, endDrag, readDrag } from '../lib/dnd'
import { HAND_CAPACITY, handUsage } from '../data/conflicts'
import {
  activeSlot,
  allTags,
  clearSelection,
  clearSlot,
  fixSlotConflicts,
  globalTags,
  hasSlotTag,
  moveSlotTag,
  saveHistory,
  selectedCharItems,
  setActiveSlot,
  slotConflicts,
  slotTags,
  toggleChar,
  toggleSlotTag,
  totalTagCount,
  ui,
} from '../store'

const hot = ref<string | null>(null)

function conflictLabel(slot: string) {
  const parts = slotConflicts(slot).map((item) => `${item.group.label}×${item.tags.length}`)
  if (handUsage(slotTags(slot)) > HAND_CAPACITY) parts.push('手超载')
  return parts.join('、')
}

function handsOf(slot: string) {
  return handUsage(slotTags(slot))
}

function onDrop(target: string, event: DragEvent) {
  event.preventDefault()
  hot.value = null
  const payload = readDrag()
  if (payload) {
    if (payload.from === LIB_SLOT) {
      if (!hasSlotTag(target, payload.en)) toggleSlotTag(asSlotTag(payload), target)
    } else {
      moveSlotTag(payload.from, target, payload.en)
    }
    endDrag()
    return
  }
  const en = event.dataTransfer?.getData('text/plain')
  const tag = en ? allTags.value.find((t) => t.en === en) : undefined
  if (tag && !hasSlotTag(target, tag.en)) toggleSlotTag(asSlotTag(tag), target)
}

function onDragOver(target: string, event: DragEvent) {
  event.preventDefault()
  hot.value = target
}
</script>

<template>
  <aside class="panel">
    <div class="panel-head">
      <div class="panel-title">
        拼装区
        <small>{{ selectedCharItems.length }} 角色 · {{ totalTagCount }} 标签</small>
      </div>
      <div class="head-actions">
        <button class="btn sm ghost" title="粘贴一段提示词，自动拆成角色和标签" @click="ui.pasteOpen = true">
          <BaseIcon name="clipboard" :size="12" /> 粘贴
        </button>
        <button
          class="btn sm ghost"
          :class="{ on: ui.weightMode }"
          title="逐格调节权重，输出成 (tag:1.2)；不想开模式就 Alt+点芯片，直接 1.3"
          @click="ui.weightMode = !ui.weightMode"
        >
          权重
        </button>
        <button class="icon-btn" title="画风库" @click="ui.styleOpen = true"><BaseIcon name="palette" :size="15" /></button>
        <button v-if="selectedCharItems.length || globalTags.length" class="btn sm ghost" @click="clearSelection">
          清空
        </button>
      </div>
    </div>

    <div class="panel-body">
      <div v-if="!selectedCharItems.length" class="empty">
        <BaseIcon name="layers" :size="26" />
        <div>还没选角色</div>
        <div class="hint">左边点角色卡，先建一个角色框</div>
      </div>

      <div
        v-for="char in selectedCharItems"
        :key="char.en"
        class="box"
        :class="{ active: activeSlot === char.en, hot: hot === char.en }"
        @click="setActiveSlot(char.en)"
        @dragover="onDragOver(char.en, $event)"
        @dragleave.self="hot = null"
        @drop="onDrop(char.en, $event)"
      >
        <div class="box-head">
          <span class="name">{{ char.zh }}</span>
          <span v-if="activeSlot === char.en" class="badge">收标签</span>
          <span v-if="handsOf(char.en)" class="hands" title="手部动作占用">手 {{ handsOf(char.en) }}/2</span>
          <button
            v-if="conflictLabel(char.en)"
            class="conflict"
            :title="`${conflictLabel(char.en)} 重复，点一下只留最新一个`"
            @click.stop="fixSlotConflicts(char.en)"
          >
            ⚠ {{ conflictLabel(char.en) }}
          </button>
          <button class="x" title="移除角色" @click.stop="toggleChar(char.en)"><BaseIcon name="x" :size="12" /></button>
        </div>
        <div class="chips">
          <TagChip v-for="tag in slotTags(char.en)" :key="tag.en" :slot-key="char.en" :tag="tag" />
          <span v-if="!slotTags(char.en).length" class="hintdrop">拖标签进来</span>
        </div>
      </div>

      <div
        class="gsec"
        :class="{ active: activeSlot === '', hot: hot === '' }"
        @click="setActiveSlot('')"
        @dragover="onDragOver('', $event)"
        @dragleave.self="hot = null"
        @drop="onDrop('', $event)"
      >
        <div class="box-head">
          <span class="name">全局标签</span>
          <span v-if="activeSlot === ''" class="badge">收标签</span>
          <span v-if="handsOf('')" class="hands" title="手部动作占用">手 {{ handsOf('') }}/2</span>
          <button
            v-if="conflictLabel('')"
            class="conflict"
            :title="`${conflictLabel('')} 重复，点一下只留最新一个`"
            @click.stop="fixSlotConflicts('')"
          >
            ⚠ {{ conflictLabel('') }}
          </button>
          <button v-if="globalTags.length" class="x" @click.stop="clearSlot('')"><BaseIcon name="x" :size="12" /></button>
        </div>
        <div class="chips">
          <TagChip v-for="tag in globalTags" :key="tag.en" slot-key="" :tag="tag" />
          <span v-if="!globalTags.length" class="hintdrop">场景、画风拖到这</span>
        </div>
      </div>
    </div>

    <div class="foot">
      <button class="btn" :disabled="!totalTagCount && !selectedCharItems.length" @click="saveHistory">
        <BaseIcon name="clock" :size="14" /> 存历史
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* 覆盖全局 flex:1（basis 0 会在自适应父级里塌成 0），改为内容撑高、超限才滚动 */
.panel-body {
  flex: 0 1 auto;
  padding: 12px;
}

.panel-head {
  flex-wrap: wrap;
  row-gap: 6px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.box,
.gsec {
  margin-bottom: 9px;
  padding: 9px 10px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--panel);
  cursor: pointer;
  transition: border-color 0.12s, background 0.12s;
}

.box:hover,
.gsec:hover {
  border-color: var(--line-2);
}

.box.active,
.gsec.active {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.box.hot,
.gsec.hot {
  border-color: var(--accent);
  border-style: dashed;
  background: var(--accent-soft);
}

.gsec {
  background: #fcfbff;
  border-style: dashed;
}

.box-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  flex: none;
}

.name {
  font-size: 12.5px;
  font-weight: 500;
}

.badge {
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--accent);
  color: #fff;
  font-size: 9.5px;
  letter-spacing: 0.3px;
}

.conflict {
  padding: 1px 6px;
  border: 1px solid #f3c9c2;
  border-radius: 99px;
  background: #fdf1ef;
  color: #b4382a;
  font-size: 9.5px;
  white-space: nowrap;
}

.conflict:hover {
  background: #fbe6e2;
}

.hands {
  color: var(--ink-4);
  font-family: var(--mono);
  font-size: 9.5px;
}

.x {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-4);
  flex: none;
}

.x:hover {
  background: var(--sunken-2);
  color: #c0392b;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 22px;
}

.hintdrop {
  display: inline-flex;
  align-items: center;
  height: 23px;
  color: var(--ink-4);
  font-size: 11px;
}

.hint {
  font-size: 11.5px;
  color: var(--ink-4);
  max-width: 200px;
}

/* 存历史是次要动作：右对齐小按钮，不要拉满整行抢主操作的权重 */
.foot {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}

.foot .btn {
  flex: 0 0 auto;
}
</style>
