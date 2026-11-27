<script setup lang="ts">
import { ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import TagChip from './TagChip.vue'
import { LIB_SLOT, asSlotTag, endDrag, readDrag } from '../lib/dnd'
import { HAND_CAPACITY, handUsage } from '../data/conflicts'
import {
  activeSlot,
  allTags,
  charTags,
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

/** 空槽里的「+ 标签」：把焦点送到词库搜索框，省一次「先点输入框」 */
function tuneLibrary(slot: string) {
  setActiveSlot(slot)
  ui.libraryFocus += 1
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
    // 落点即焦点：折叠行收到标签后自动展开，接着就能继续改它
    setActiveSlot(target)
    return
  }
  const en = event.dataTransfer?.getData('text/plain')
  const tag = en ? allTags.value.find((t) => t.en === en) : undefined
  if (tag && !hasSlotTag(target, tag.en)) {
    toggleSlotTag(asSlotTag(tag), target)
    setActiveSlot(target)
  }
}

/** 移除角色会连它的标签一起删，有标签时问一句 */
function removeChar(en: string, name: string) {
  const count = charTags.value[en]?.length ?? 0
  if (count && !window.confirm(`移除「${name}」会同时清掉它的 ${count} 个标签，确定？`)) return
  toggleChar(en)
}

/** 清空会连全局标签一起清，有内容时问一句 */
function clearAll() {
  const count = totalTagCount.value
  if (!count && !selectedCharItems.value.length) return
  const chars = selectedCharItems.value.length
  if (!window.confirm(`会清掉 ${chars} 个角色框和 ${count} 个标签，确定？`)) return
  clearSelection()
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
        <button v-if="selectedCharItems.length || globalTags.length" class="btn sm ghost" @click="clearAll">
          清空
        </button>
      </div>
    </div>

    <div v-if="!selectedCharItems.length && !globalTags.length" class="empty-bar">
      <span>还没选角色 · 左边点卡片，或按 / 搜索</span>
      <button class="btn sm" @click="ui.pasteOpen = true"><BaseIcon name="clipboard" :size="12" /> 粘贴提示词</button>
    </div>

    <div v-else class="panel-body">
      <!-- 每个角色盒都常驻展开，不折叠：折叠会把「切到另一个角色」变成两次操作。
           tabindex 让它成为 Tab 可停留的落点选择器；keydown 必须带 .self，
           否则会把内部 .x / .conflict / .hintdrop 三个真按钮的 Enter 一起吞掉。
           role="group" 是给 aria-label 用的：generic role 的 Name From 是 prohibited，
           名字会被 AT 忽略；group 允许命名，又不会像 role="button" 那样和内部真按钮打架 -->
      <div
        v-for="char in selectedCharItems"
        :key="char.en"
        class="box"
        role="group"
        tabindex="0"
        :aria-current="activeSlot === char.en"
        :aria-label="`把标签加到「${char.zh}」`"
        :class="{ active: activeSlot === char.en, hot: hot === char.en }"
        @click="setActiveSlot(char.en)"
        @keydown.enter.self.prevent="setActiveSlot(char.en)"
        @keydown.space.self.prevent="setActiveSlot(char.en)"
        @dragover="onDragOver(char.en, $event)"
        @dragleave.self="hot = null"
        @drop="onDrop(char.en, $event)"
      >
        <div class="box-head">
          <span class="name">{{ char.zh }}</span>
          <span v-if="hot === char.en" class="badge">松手加入</span>
          <span v-else-if="activeSlot === char.en" class="badge">收标签</span>
          <!--
            折叠态不显示「手 n/2」，但手部预算并没有失效：
            约束在 store.ts 的 enforceHands（加入时顶掉最旧的手部标签）里强制校验。
            隐藏指示器 ≠ 不校验，不要顺手把那段删了。
          -->
          <span v-if="handsOf(char.en)" class="hands" title="手部动作占用">手 {{ handsOf(char.en) }}/2</span>
          <button
            v-if="conflictLabel(char.en)"
            class="conflict"
            :title="`${conflictLabel(char.en)} 重复，点一下只留最新一个`"
            @click.stop="fixSlotConflicts(char.en)"
          >
            ⚠ {{ conflictLabel(char.en) }}
          </button>
          <button class="x" title="移除角色" @click.stop="removeChar(char.en, char.zh)"><BaseIcon name="x" :size="12" /></button>
        </div>
        <div class="chips">
          <TagChip v-for="tag in slotTags(char.en)" :key="tag.en" :slot-key="char.en" :tag="tag" />
          <button v-if="!slotTags(char.en).length" class="hintdrop" @click.stop="tuneLibrary(char.en)">+ 标签</button>
        </div>
      </div>

      <!-- 全局标签槽常驻卡片形态：它是场景 / 画风标签唯一的落点，压成一行就没有「可放置」暗示 -->
      <div
        class="gsec"
        role="group"
        tabindex="0"
        :aria-current="activeSlot === ''"
        aria-label="把标签加到全局（场景 / 画风）"
        :class="{ active: activeSlot === '', hot: hot === '' }"
        @click="setActiveSlot('')"
        @keydown.enter.self.prevent="setActiveSlot('')"
        @keydown.space.self.prevent="setActiveSlot('')"
        @dragover="onDragOver('', $event)"
        @dragleave.self="hot = null"
        @drop="onDrop('', $event)"
      >
        <div class="box-head">
          <span class="name">全局标签</span>
          <span v-if="hot === ''" class="badge">松手加入</span>
          <span v-else-if="activeSlot === ''" class="badge">收标签</span>
          <span v-if="handsOf('')" class="hands" title="手部动作占用">手 {{ handsOf('') }}/2</span>
          <button
            v-if="conflictLabel('')"
            class="conflict"
            :title="`${conflictLabel('')} 重复，点一下只留最新一个`"
            @click.stop="fixSlotConflicts('')"
          >
            ⚠ {{ conflictLabel('') }}
          </button>
          <button class="x" title="清空全局标签" @click.stop="clearSlot('')"><BaseIcon name="x" :size="12" /></button>
        </div>
        <div class="chips">
          <TagChip v-for="tag in globalTags" :key="tag.en" slot-key="" :tag="tag" />
          <button v-if="!globalTags.length" class="hintdrop" @click.stop="tuneLibrary('')">+ 场景 / 画风</button>
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
/* 折叠行通到面板边，展开卡片自己给 12px 外边距 */
.panel-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px 0;
  overflow-y: auto;
  overscroll-behavior: contain;
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

/*
  统一形态：每个角色盒 / 全局槽都是一个常驻展开的卡片，没有折叠行。
  ⚠️ 硬约束：border-width 与 padding 在所有状态里完全一致，内容起点恒为 1 + 10 = 11px。
  任何状态都不许改宽度 —— 改了就会位移，而这份规格要求 transform: 0、hover 不位移。
*/
.box,
.gsec {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: 9px 10px 10px;
  margin: 0 12px 9px;
  background: var(--panel);
  cursor: pointer;
}

/*
  下面四条都是 (0,2,0)，靠源码顺序决胜负，不用 :not() 链。
  hover 在 active 之前 → 选中的盒子 hover 时不会被改成灰描边；
  hot 在最后 → dragover 的虚线永远盖得住 hover。
  这是「用顺序代替优先级」的写法，前面三轮踩过三次选择器互压，别再往里加 :not。
*/
.box:hover,
.gsec:hover {
  border-color: var(--line-2);
}

.box.active,
.gsec.active {
  border-color: var(--accent-line);
}

.box.active .name,
.gsec.active .name {
  font-weight: 600;
  color: var(--ink);
}

.box.hot,
.gsec.hot {
  border-style: dashed;
  border-color: var(--accent);
  background: var(--accent-soft);
}

/* 键盘焦点贴内侧：不占布局，也不会被面板的 overflow: hidden 裁掉 */
.box:focus-visible,
.gsec:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.box-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
  /* flex 链上补 min-width: 0，名字才有可能被压缩出省略号 */
  min-width: 0;
}

/* 名字是唯一没做省略号的正文元素：自定义角色可以有很长的名字 */
.name {
  min-width: 0;
  overflow: hidden;
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.box.active .name,
.gsec.active .name {
  font-weight: 600;
  color: var(--ink);
}

.badge {
  flex: none;
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: var(--fs-caption);
  letter-spacing: 0.3px;
}

.conflict {
  flex: none;
  padding: 1px 7px;
  border: 1px solid var(--danger-line);
  border-radius: 99px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--fs-caption);
  white-space: nowrap;
}

.conflict:hover {
  background: var(--danger-soft-2);
}

.hands {
  flex: none;
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: var(--fs-caption);
}

/* .x 是可点击元素，不是装饰图标，不能落在 --ink-4（3.5:1） */
.x {
  display: grid;
  place-items: center;
  width: var(--hit-min);
  height: var(--hit-min);
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  flex: none;
}

.x:hover {
  background: var(--sunken-2);
  color: var(--danger);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: var(--h-chip);
}

.hintdrop {
  display: inline-flex;
  align-items: center;
  height: var(--h-chip);
  padding: 0 10px;
  border: 1px dashed var(--line-2);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--ink-3);
  font-size: var(--fs-sm);
}

.hintdrop:hover {
  border-color: var(--accent-line);
  color: var(--accent-ink);
}

/* 空态收成一条引导条：原来那块居中空态占掉整个面板高度，什么也做不了。
   虚线只留给 drop chip 和 dragover，容器级描边一律实线 */
.empty-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 64px;
  margin: 12px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  color: var(--ink-3);
  font-size: var(--fs-sm);
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
