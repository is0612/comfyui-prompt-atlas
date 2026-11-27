<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseIcon from './BaseIcon.vue'
import {
  allCharacters,
  charFavorites,
  charMap,
  games,
  isCharFavorite,
  selectedChars,
  setActiveSlot,
  toggleChar,
  toggleCharFavorite,
  ui,
  view,
} from '../store'
import type { Character } from '../types'

const query = ref('')
/** 只看收藏的角色 */
const favOnly = ref(false)

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

const pool = computed(() => allCharacters.value.filter((char) => !view.atlasGame || char.game === view.atlasGame))

const visible = computed(() => {
  const q = query.value.trim().toLowerCase()
  return pool.value.filter((char) => {
    if (favOnly.value && !isCharFavorite(char.en)) return false
    if (!q) return true
    return [char.zh, char.en, char.body, char.hair, char.eyes, char.outfit, char.traits, char.game]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  })
})

function isOn(en: string) {
  return selectedChars.value.includes(en)
}

/** 收藏横条：只留前 8 个，横条本身不该变成第二排图鉴 */
const favItems = computed(() =>
  charFavorites.value
    .map((en) => charMap.value.get(en))
    .filter((c): c is Character => Boolean(c))
    .slice(0, 8),
)

/** 横条点一下：已经选中的切槽（去改它的标签），没选中的加进拼装 */
function pickMini(c: Character) {
  if (isOn(c.en)) setActiveSlot(c.en)
  else toggleChar(c.en)
}

/** 没有头像时用名字生成一个稳定的色相，同一个人每次都是同一个颜色。
    只取很浅的一档：色块上要压 --ink-2 的深色字，深底会把对比度吃掉 */
function nameTint(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 360
  return `hsl(${h} 20% 92%)`
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
        <button class="game" :class="{ on: view.atlasGame === '' }" @click="view.atlasGame = ''">
          全部<span>{{ allCharacters.length }}</span>
        </button>
        <button
          v-for="tab in gameTabs"
          :key="tab.name"
          class="game"
          :class="{ on: view.atlasGame === tab.name }"
          @click="view.atlasGame = tab.name"
        >
          {{ tab.name }}<span>{{ tab.count }}</span>
        </button>
        <button
          class="game star"
          :class="{ on: favOnly }"
          :title="`只看收藏（${charFavorites.length} 个）`"
          @click="favOnly = !favOnly"
        >
          <BaseIcon name="star" :size="12" :filled="favOnly" /><span>{{ charFavorites.length }}</span>
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
      <div v-if="favItems.length" class="strip">
        <span class="strip-label">收藏</span>
        <button v-for="c in favItems" :key="c.en" class="mini-ava" :class="{ on: isOn(c.en) }" :title="c.zh" @click="pickMini(c)">
          <img
            v-if="c.avatar && !failed.has(c.avatar)"
            :src="`${BASE}avatars/${c.avatar}.webp`"
            :alt="c.zh"
            loading="lazy"
            decoding="async"
            @error="failed.add(c.avatar)"
          />
          <span v-else class="mini-ph" :style="{ '--el': nameTint(c.zh) }">{{ c.zh.slice(0, 1) }}</span>
        </button>
      </div>

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
            <button
              class="fav"
              :class="{ on: isCharFavorite(char.en) }"
              :title="isCharFavorite(char.en) ? '取消收藏' : '收藏，可以从页签只看收藏'"
              @click.stop="toggleCharFavorite(char.en)"
            >
              <BaseIcon name="star" :size="11" :filled="isCharFavorite(char.en)" />
            </button>
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
  /* 静息表面：中栏才是焦点，左栏退一层 */
  background: var(--panel-rest);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-bottom: 1px solid var(--line);
  background: var(--panel-rest);
}

/* 分段控件本身已经靠 --sunken 底色区分，再套一圈描边就是三层线 */
.games {
  display: flex;
  gap: 4px;
  padding: 3px;
  border: 0;
  border-radius: var(--radius-card);
  background: var(--sunken);
}

.game {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: var(--h-seg);
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--ink-3);
  font-size: var(--fs-sm);
  font-weight: 500;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}

.game span {
  font-size: var(--fs-caption);
  color: var(--ink-3);
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
  color: var(--ink-3);
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
  height: var(--h-input);
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
  background: var(--panel);
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: var(--fs-sm);
}

.search input::placeholder {
  color: var(--ink-4);
}

.clear {
  display: grid;
  place-items: center;
  width: var(--hit-min);
  height: var(--hit-min);
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

/* 无框卡片：144 张 1px 描边叠在一起是这屏最大的噪音源。
   层次交给图本身的边缘，选中靠 2px 品牌色外环 */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 0;
  border-radius: var(--radius-card);
  background: transparent;
  cursor: pointer;
  outline: none;
}

.card:hover .thumb::after {
  opacity: 1;
}

.card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.card.on {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  background: transparent;
}

.card.on h3 {
  color: var(--accent-ink);
  font-weight: 600;
}

/* 收藏星标：默认藏起来，收藏过的常驻（否则看不出哪些被收了） */
.card .fav {
  position: absolute;
  right: 5px;
  bottom: 5px;
  display: grid;
  place-items: center;
  width: var(--hit-min);
  height: var(--hit-min);
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink-3);
  opacity: 0;
  transition: opacity 0.12s, color 0.12s;
}

.card:hover .fav,
.card .fav.on {
  opacity: 1;
}

.card .fav:hover,
.card .fav.on {
  color: var(--warn);
}

/* 图区：正方，圆角裁切，图本身就是 160×160，几乎 1:1 显示。
   卡片不描边之后，这里补一条 1px 内描边，否则浅色图会和背景糊在一起 */
.thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--sunken);
  outline: 1px solid rgba(34, 30, 53, 0.08);
  outline-offset: -1px;
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

/* 宽屏上同时能看到的图多，整片饱和度收 10%，焦点自然回到拼装区。
   ⚠️ 只在 ≥1320px 开，且不给 filter 加 transition：
   上百张图同时重算滤镜是滚动掉帧的典型来源 */
@media (min-width: 1320px) {
  .thumb img {
    filter: saturate(0.85);
  }

  .card:hover .thumb img {
    filter: saturate(1);
  }
}

/* 没有图 / 图挂了：按名字取色的纯色块 + 首字，别留个破图标。
   纯色而不是渐变：扁平方向里渐变属于装饰噪音。
   ⚠️ 必须是浅底 + 深字：原来的 hsl(…42% 54%) 压白字只有 2.6:1 */
.thumb .ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--ink-2);
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  background: var(--el, #eceaf2);
}

.edit {
  position: absolute;
  top: 5px;
  right: 5px;
  display: grid;
  place-items: center;
  width: var(--h-chip);
  height: var(--h-chip);
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
  background: var(--panel);
  color: var(--accent);
}

.check {
  position: absolute;
  top: 5px;
  left: 5px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 99px;
  background: var(--accent);
  color: var(--on-accent);
}

/* 名字不用最深的一档：选中时名字才提到品牌色，平时让图当主角 */
.card h3 {
  margin: 6px 2px 0;
  font-size: var(--fs-body);
  font-weight: 500;
  color: var(--ink-2);
  letter-spacing: 0.2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 最近 / 收藏横条：常用角色横着排一行，比在 168 张卡里翻快得多 */
.strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 0;
}

.strip-label {
  flex: none;
  width: 26px;
  color: var(--ink-3);
  font-size: var(--fs-caption);
}

.mini-ava {
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: var(--sunken);
}

.mini-ava img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mini-ava.on {
  border-color: var(--accent);
}

.mini-ph {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--ink-2);
  font-size: var(--fs-sm);
  background: var(--el, #eceaf2);
}

.panel-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-top: 1px solid var(--line);
  color: var(--ink-3);
  font-size: var(--fs-caption);
  background: var(--panel-rest);
}

.filtering {
  padding: 1px 7px;
  border-radius: 99px;
  background: var(--accent-soft);
  color: var(--accent-ink);
}

.tip {
  margin-left: auto;
  color: var(--ink-3);
}

.empty .hint {
  font-size: var(--fs-sm);
  color: var(--ink-3);
}

.empty .acts {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
</style>
