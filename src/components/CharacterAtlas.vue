<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { allCharacters, games, selectedChars, toggleChar, ui } from '../store'
import type { Character } from '../types'

const game = ref('')
const query = ref('')

/** public/ 下静态资源的根路径，部署到子目录时也能对上 */
const BASE = import.meta.env.BASE_URL
/** 图挂了的 avatar 名，退回首字母占位，避免出现裂图 */
const failed = ref(new Set<string>())

const counts = computed(() => {
  const map = new Map<string, number>()
  for (const char of allCharacters.value) map.set(char.game, (map.get(char.game) ?? 0) + 1)
  return map
})

const gameTabs = computed(() => games.value.map((name) => ({ name, count: counts.value.get(name) ?? 0 })))

const pool = computed(() => allCharacters.value.filter((char) => !game.value || char.game === game.value))

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return pool.value.filter((char) => {
    if (!q) return true
    return [char.zh, char.en, char.body, char.hair, char.eyes, char.outfit, char.traits, char.game]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  })
})

function isOn(en: string) {
  return selectedChars.value.includes(en)
}

/** 没有头像时用名字生成一个稳定的色相，同一个人每次都是同一个颜色 */
function nameTint(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 360
  return `hsl(${h} 42% 54%)`
}

function openEditor(char: Character | null) {
  ui.editing = char
  ui.editorOpen = true
}
</script>

<template>
  <section class="panel atlas">
    <div class="toolbar">
      <div class="games">
        <button class="game" :class="{ on: game === '' }" @click="game = ''">
          全部<span>{{ allCharacters.length }}</span>
        </button>
        <button
          v-for="tab in gameTabs"
          :key="tab.name"
          class="game"
          :class="{ on: game === tab.name }"
          @click="game = tab.name"
        >
          {{ tab.name }}<span>{{ tab.count }}</span>
        </button>
      </div>

      <div class="tools">
        <label class="search">
          <BaseIcon name="search" :size="14" />
          <input v-model="query" placeholder="搜索角色 / 英文 tag / 特征" spellcheck="false" />
          <button v-if="query" class="clear" @click="query = ''"><BaseIcon name="x" :size="12" /></button>
        </label>
        <button class="btn sm" @click="openEditor(null)"><BaseIcon name="plus" :size="14" /> 新增</button>
        <button class="btn sm" @click="ui.importOpen = true"><BaseIcon name="upload" :size="14" /> 导入</button>
      </div>

    </div>

    <div class="panel-body">
      <div v-if="visible.length" class="grid">
        <article
          v-for="char in visible"
          :key="char.en"
          class="card"
          :class="{ on: isOn(char.en) }"
          tabindex="0"
          @click="toggleChar(char.en)"
          @keydown.enter.prevent="toggleChar(char.en)"
        >
          <div class="thumb">
            <img
              v-if="char.avatar && !failed.has(char.avatar)"
              :src="`${BASE}avatars/${char.avatar}.webp`"
              :alt="char.zh"
              loading="lazy"
              decoding="async"
              @error="failed.add(char.avatar)"
            />
            <span v-else class="ph" :style="{ '--el': nameTint(char.zh) }">
              {{ char.zh.slice(0, 1) }}
            </span>
            <button class="edit" title="编辑" @click.stop="openEditor(char)">
              <BaseIcon name="pencil" :size="12" />
            </button>
            <span v-if="isOn(char.en)" class="check"><BaseIcon name="check" :size="12" /></span>
          </div>
          <h3 :title="`${char.zh} · ${char.en}`">{{ char.zh }}</h3>
        </article>
      </div>

      <div v-else class="empty">
        <BaseIcon name="grid" :size="26" />
        <div>这里还没有角色</div>
        <div class="hint">可以新增一个，或者按模板导入一批 JSON / CSV</div>
        <div class="acts">
          <button class="btn sm" @click="openEditor(null)">新增角色</button>
          <button class="btn sm" @click="ui.importOpen = true">导入数据</button>
        </div>
      </div>
    </div>

    <div class="panel-foot">
      <span>{{ visible.length }} 位角色</span>
      <span v-if="query" class="filtering">筛选中</span>
      <span class="tip">点卡片加入拼装</span>
    </div>
  </section>
</template>

<style scoped>
.atlas {
  flex: 1;
  min-width: 0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.games {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--sunken);
}

.game {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  font-weight: 500;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.game span {
  font-size: 10px;
  color: var(--ink-4);
}

.game:hover {
  color: var(--ink-2);
}

.game.on {
  background: var(--panel);
  border-color: var(--line-2);
  color: var(--ink);
  font-weight: 600;
}

.game.on span {
  color: var(--accent);
}

.tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  width: 210px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--sunken);
  color: var(--ink-3);
  transition: border-color 0.15s, background 0.15s;
}

.search:focus-within {
  border-color: var(--accent-line);
  background: #fff;
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}

.search input::placeholder {
  color: var(--ink-4);
}

.clear {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  padding: 0;
}

.grid {
  display: grid;
  /* 三列，列宽随面板伸缩；图占满列宽，实际约 150px 见方 */
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  padding: 12px;
}

.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 6px 6px 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  cursor: pointer;
  outline: none;
  /* 扁平：只过渡颜色，不位移、不加投影 */
  transition: border-color 0.12s, background 0.12s;
}

.card:hover {
  border-color: var(--line-2);
}

.card:hover .thumb::after {
  opacity: 1;
}

.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.card.on {
  border-color: var(--accent-line);
  background: var(--accent-soft);
}

.card.on h3 {
  font-weight: 600;
}

/* 图区：正方，圆角裁切，图本身就是 160×160，几乎 1:1 显示 */
.thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 7px;
  overflow: hidden;
  background: var(--sunken);
}

/* 悬停时把图压暗 4%：唯一的反馈，比位移和投影安静得多 */
.thumb::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(34, 30, 53, 0.04);
  opacity: 0;
  transition: opacity 0.12s;
  pointer-events: none;
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 没有图 / 图挂了：按名字取色的纯色块 + 首字，别留个破图标。
   纯色而不是渐变：扁平方向里渐变属于装饰噪音 */
.thumb .ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 30px;
  font-weight: 600;
  line-height: 1;
  background: var(--el, #b9b2d6);
}

.edit {
  position: absolute;
  top: 5px;
  right: 5px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--ink-3);
  opacity: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.card:hover .edit,
.card:focus-within .edit {
  opacity: 1;
}

.edit:hover {
  background: #fff;
  color: var(--accent);
}

.check {
  position: absolute;
  top: 5px;
  left: 5px;
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 99px;
  background: var(--accent);
  color: #fff;
}

.card h3 {
  margin: 8px 2px 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-3);
  font-size: 11px;
  background: #fcfbff;
}

.filtering {
  padding: 1px 7px;
  border-radius: 99px;
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.tip {
  margin-left: auto;
  color: var(--ink-4);
}

.empty .hint {
  font-size: 11.5px;
  color: var(--ink-4);
}

.empty .acts {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>
