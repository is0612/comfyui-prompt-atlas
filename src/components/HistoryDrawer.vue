<script setup lang="ts">
import BaseIcon from './BaseIcon.vue'
import { applyHistory, history, removeHistory, ui } from '../store'

function timeOf(ts: number) {
  const date = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function tagCount(entry: { tags: unknown[]; slots: Record<string, unknown[]> }) {
  const inSlots = Object.values(entry.slots ?? {}).reduce((n, list) => n + list.length, 0)
  return entry.tags.length + inSlots
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.historyOpen" class="mask" @click.self="ui.historyOpen = false">
      <Transition name="slide" appear>
        <aside class="drawer">
          <div class="head">
            <div class="title">
              历史记录
              <small>最近 30 条</small>
            </div>
            <button class="icon-btn" @click="ui.historyOpen = false"><BaseIcon name="x" /></button>
          </div>

          <div class="body">
            <div v-if="!history.length" class="empty">
              <BaseIcon name="clock" :size="24" />
              <div>还没有记录</div>
              <div class="hint">在拼装区点「存历史」就会留一条</div>
            </div>

            <article v-for="entry in history" :key="entry.id" class="item">
              <div class="meta">
                <span>{{ timeOf(entry.time) }}</span>
                <span class="tags">{{ entry.chars.length }} 角色 · {{ tagCount(entry) }} 标签</span>
                <button class="del" title="删除" @click="removeHistory(entry.id)"><BaseIcon name="trash" :size="12" /></button>
              </div>
              <pre class="preview">{{ entry.wai || entry.moss || '（空）' }}</pre>
              <button class="btn sm" @click="applyHistory(entry.id)">回填这次选择</button>
            </article>
          </div>
        </aside>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 65;
}

.drawer {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  width: 380px;
  max-width: 92vw;
  height: 100%;
  background: var(--panel);
  border-left: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 14px;
  border-bottom: 1px solid var(--line);
}

.title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: var(--fs-body);
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
  padding: 12px;
}

.item {
  margin-bottom: 10px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--panel);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
  color: var(--ink-2);
  font-size: var(--fs-sm);
}

.tags {
  padding: 1px 6px;
  border-radius: 99px;
  background: var(--sunken);
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.del {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-left: auto;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-4);
}

.del:hover {
  background: var(--sunken);
  color: var(--danger);
}

.preview {
  margin: 0 0 8px;
  padding: 8px 9px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--ink-2);
  font-family: var(--mono);
  font-size: var(--fs-caption);
  line-height: 1.65;
  max-height: 76px;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}

.hint {
  color: var(--ink-4);
  font-size: var(--fs-sm);
}
</style>
