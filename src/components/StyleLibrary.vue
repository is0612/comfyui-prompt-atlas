<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { STYLE_GROUPS, STYLE_LIBRARY, type StyleItem } from '../data/styles'
import { globalTags, notify, toggleSlotTag, ui } from '../store'

const group = ref('')
const list = computed(() => (group.value ? STYLE_LIBRARY.filter((s) => s.group === group.value) : STYLE_LIBRARY))

const activeCount = computed(() => STYLE_LIBRARY.filter((s) => has(s.en)).length)

function has(en: string) {
  return globalTags.value.some((t) => t.en === en)
}

function pick(item: StyleItem) {
  const existed = has(item.en)
  toggleSlotTag({ zh: item.zh, en: item.en }, '')
  notify(existed ? `「${item.zh}」已从全局移出` : `「${item.zh}」加到全局标签`, existed ? 'warn' : 'ok')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.styleOpen" class="mask" @click.self="ui.styleOpen = false">
      <div class="modal">
        <div class="head">
          <div class="title">
            画风库
            <small>点一下加到全局标签，再点移除</small>
          </div>
          <div class="head-right">
            <span v-if="activeCount" class="picked">已选 {{ activeCount }}</span>
            <button class="icon-btn" @click="ui.styleOpen = false"><BaseIcon name="x" /></button>
          </div>
        </div>

        <div class="bar">
          <button class="flt" :class="{ on: group === '' }" @click="group = ''">全部 {{ STYLE_LIBRARY.length }}</button>
          <button
            v-for="g in STYLE_GROUPS"
            :key="g"
            class="flt"
            :class="{ on: group === g }"
            @click="group = group === g ? '' : g"
          >
            {{ g }}
          </button>
        </div>

        <div class="body">
          <button
            v-for="item in list"
            :key="item.en"
            class="tile"
            :class="{ on: has(item.en) }"
            :title="item.hint"
            @click="pick(item)"
          >
            <span class="swatch" :style="{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }">
              <span v-if="has(item.en)" class="check"><BaseIcon name="check" :size="13" /></span>
            </span>
            <span class="name">{{ item.zh }}</span>
            <span class="tag">{{ item.en }}</span>
          </button>
        </div>

        <div class="foot">
          <span class="muted">标签进的是全局区，不归属某个角色</span>
          <button class="btn" @click="ui.styleOpen = false">关闭</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 71;
  display: grid;
  place-items: center;
  padding: 24px;
}

.modal {
  display: flex;
  flex-direction: column;
  width: min(860px, 100%);
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
  font-size: 14px;
  font-weight: 600;
}

.title small {
  color: var(--ink-3);
  font-size: 11px;
  font-weight: 400;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.picked {
  padding: 1px 8px;
  border-radius: 99px;
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-size: 10.5px;
}

.bar {
  display: flex;
  gap: 5px;
  padding: 9px 16px;
  border-bottom: 1px solid var(--line);
  background: #fcfbff;
}

.flt {
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  color: var(--ink-3);
  font-size: 11px;
}

.flt:hover {
  border-color: var(--line-2);
  color: var(--ink-2);
}

.flt.on {
  border-color: var(--accent-line);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 500;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  /* auto 行在定高容器里会被压到 min-content，把瓦片压扁，必须显式给 max-content */
  grid-auto-rows: max-content;
  align-content: start;
  gap: 10px;
  padding: 14px 16px;
}

.tile {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 0 7px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: #fff;
  text-align: left;
  overflow: hidden;
  transition: border-color 0.14s, box-shadow 0.14s, transform 0.14s;
}

.tile:hover {
  border-color: var(--accent-line);
  box-shadow: 0 6px 16px -10px rgba(83, 68, 221, 0.5);
  transform: translateY(-1px);
}

.tile.on {
  border-color: var(--accent-line);
  background: #fbfaff;
}

.swatch {
  position: relative;
  display: block;
  height: 74px;
}

.check {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--accent);
  box-shadow: 0 1px 4px rgba(20, 16, 40, 0.2);
}

.name {
  padding: 0 9px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ink);
}

.tag {
  padding: 0 9px;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 16px;
  border-top: 1px solid var(--line);
  background: #fcfbff;
}

.muted {
  margin-right: auto;
  color: var(--ink-4);
  font-size: 11px;
}
</style>
