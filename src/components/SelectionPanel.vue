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
  view,
} from '../store'

const hot = ref<string | null>(null)

/** 只有「当前在收标签的那一格」和「全部展开」两种情况才铺开芯片，其余收成 34px 一行 */
const expanded = (en: string) => view.selectionExpandAll || activeSlot.value === en

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
        <button
          v-if="selectedCharItems.length"
          class="btn sm ghost"
          :title="view.selectionExpandAll ? '每个角色只留一行' : '展开所有角色的标签'"
          @click="view.selectionExpandAll = !view.selectionExpandAll"
        >
          {{ view.selectionExpandAll ? '收起' : '全部展开' }}
        </button>
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
      <!-- 折叠行也是合法落点：dragover/drop 挂在整个 .box 上，落完自动展开 -->
      <div
        v-for="char in selectedCharItems"
        :key="char.en"
        class="box"
        :class="{
          active: activeSlot === char.en,
          hot: hot === char.en,
          open: expanded(char.en),
          folded: !expanded(char.en),
        }"
        @click="setActiveSlot(char.en)"
        @dragover="onDragOver(char.en, $event)"
        @dragleave.self="hot = null"
        @drop="onDrop(char.en, $event)"
      >
        <div class="box-head">
          <span class="name">{{ char.zh }}</span>
          <span v-if="hot === char.en" class="badge">松手加入</span>
          <span v-else-if="expanded(char.en) && activeSlot === char.en" class="badge">收标签</span>
          <span v-if="!expanded(char.en)" class="count">{{ slotTags(char.en).length }} 标签</span>
          <!--
            折叠态不显示「手 n/2」，但手部预算并没有失效：
            约束在 store.ts 的 enforceHands（加入时顶掉最旧的手部标签）里强制校验。
            隐藏指示器 ≠ 不校验，不要顺手把那段删了。
          -->
          <span v-if="expanded(char.en) && handsOf(char.en)" class="hands" title="手部动作占用">手 {{ handsOf(char.en) }}/2</span>
          <button
            v-if="conflictLabel(char.en)"
            class="conflict"
            :title="`${conflictLabel(char.en)} 重复，点一下只留最新一个`"
            @click.stop="fixSlotConflicts(char.en)"
          >
            ⚠ {{ conflictLabel(char.en) }}
          </button>
          <span class="chev">{{ expanded(char.en) ? '▾' : '▸' }}</span>
          <button class="x" title="移除角色" @click.stop="removeChar(char.en, char.zh)"><BaseIcon name="x" :size="12" /></button>
        </div>
        <div v-if="expanded(char.en)" class="chips">
          <TagChip v-for="tag in slotTags(char.en)" :key="tag.en" :slot-key="char.en" :tag="tag" />
          <button v-if="!slotTags(char.en).length" class="hintdrop" @click.stop="tuneLibrary(char.en)">+ 标签</button>
        </div>
      </div>

      <!-- 全局标签槽永不折叠：它是场景 / 画风标签唯一的落点，藏起来就没有「可放置」暗示 -->
      <div
        class="gsec"
        :class="{
          active: activeSlot === '',
          hot: hot === '',
          filled: globalTags.length > 0,
          bare: !globalTags.length,
        }"
        @click="setActiveSlot('')"
        @dragover="onDragOver('', $event)"
        @dragleave.self="hot = null"
        @drop="onDrop('', $event)"
      >
        <div v-if="globalTags.length" class="box-head">
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
  flex: 0 1 auto;
  padding: 12px 0;
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
  四种状态（折叠行 / 展开 / active / dragover）的 border-width 与 padding 完全相同，
  只换颜色和线型 —— 内容起点永远是 1 + 10 = 11px，位移在物理上不可能发生，也就不需要补偿值。
  ⚠️ 这是本文件的硬约束：任何状态都不要改 border-width，改了就会抖。
*/
.box,
.gsec {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}

/* 折叠行 / 空全局槽：34px 一行，顶线由下面的兄弟选择器补，不用 margin 制造间距 */
.box,
.gsec.bare {
  height: 34px;
  padding: 0 10px;
}

/*
  行间分隔线只改颜色不加宽度。首条不画：面板头自带 border-bottom；
  末尾不画：.foot 自带 border-top。
  :not(.active):not(.hot) 是避开这两种状态自己的描边 —— 它们用 accent 色和虚线，
  被这条规则按住的话会出现「三边虚线、顶边实线」。
*/
.panel-body > .box + .box:not(.active):not(.hot),
.panel-body > .box + .gsec:not(.hot) {
  border-top-color: var(--line);
}

/* 展开态：当前在收标签的角色盒、「全部展开」时的所有盒，和有标签的全局槽走卡片形态。
   ⚠️ 形态（open）和选中（active）必须分开：全部展开时只有一个盒是 active，
   但如果用 active 当展开判据，其余盒会因为停在 34px 而被芯片撑破 */
.box.open,
.gsec.filled {
  height: auto;
  margin: 0 12px 8px;
  padding: 8px 10px;
  justify-content: flex-start;
  border-color: var(--line);
  border-radius: var(--radius-card);
  background: var(--panel);
}

/* 选中只换描边颜色，宽度和 padding 一个像素都不动 */
.box.active,
.gsec.filled.active {
  border-color: var(--accent-line);
}

/*
  active 的 3px 竖条是装饰层，不占布局：border-width 才能全程保持 1px。
  短一截（上下各留 8px）是为了不碰 11px 圆角 —— 圆角会把 3px 宽的元素钳成 1.5px，
  而给盒子加 overflow: hidden 又会把 left: -1px 裁掉一半。
*/
.box.active::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
}

/* dragover 是瞬时态：1px 虚线 + soft 底，没有左侧竖条，和 active 不共用任何要素 */
.box.hot,
.gsec.hot {
  border-style: dashed;
  border-color: var(--accent);
  background: var(--accent-soft);
}

.box-head {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}

/* 折叠行的盒头撑满 34px，垂直居中 */
.folded .box-head,
.bare .box-head {
  height: 100%;
  margin-bottom: 0;
}

.name {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--ink-2);
}

.box.active .name {
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

/* 折叠时替掉芯片的一行摘要 */
.count {
  flex: none;
  color: var(--ink-3);
  font-size: var(--fs-caption);
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

/* 折叠指示：纯装饰 */
.chev {
  flex: none;
  color: var(--ink-4);
  font-size: var(--fs-caption);
}

.x {
  display: grid;
  place-items: center;
  width: var(--hit-min);
  height: var(--hit-min);
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-4);
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

/* 空态收成一条引导条：原来那块居中空态占掉整个面板高度，什么也做不了 */
.empty-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 64px;
  margin: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--line-2);
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
