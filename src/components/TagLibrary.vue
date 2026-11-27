<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseIcon from './BaseIcon.vue'
import { LIB_SLOT, asSlotTag, endDrag, startDrag } from '../lib/dnd'
import {
  activeSlot,
  addTag,
  allTags,
  charMap,
  customTags,
  favorites,
  hasSlotTag,
  isFavorite,
  notify,
  removeTag,
  settings,
  toggleFavorite,
  toggleSlotTag,
} from '../store'
import { CATEGORIES, type Category, type TagItem } from '../types'

const active = ref<Category>('动作')
const query = ref('')
const sub = ref('')
const favOnly = ref(false)
const adding = ref(false)
const form = ref({ zh: '', en: '', sub: '' })

const target = computed(() => (activeSlot.value ? charMap.value.get(activeSlot.value)?.zh ?? '角色' : '全局'))

const pool = computed(() => allTags.value.filter((tag) => !(settings.hideNsfw && tag.nsfw)))

const subs = computed(() => {
  const out: string[] = []
  for (const tag of pool.value) {
    if (tag.cat !== active.value || !tag.sub || out.includes(tag.sub)) continue
    out.push(tag.sub)
  }
  return out
})

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  const fav = new Set(favorites.value)
  const items = pool.value.filter((tag) => {
    if (favOnly.value && !fav.has(tag.en)) return false
    if (q) return [tag.zh, tag.en, tag.sub].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
    if (tag.cat !== active.value) return false
    return !sub.value || tag.sub === sub.value
  })
  // 收藏的排最前，其余保持原顺序
  return [...items].sort((a, b) => Number(fav.has(b.en)) - Number(fav.has(a.en)))
})

const isCustom = (en: string) => customTags.value.some((t) => t.en === en)

watch(active, () => {
  sub.value = ''
  if (active.value === '自定义') adding.value = true
})

function pick(tag: TagItem) {
  const existed = hasSlotTag(activeSlot.value, tag.en)
  toggleSlotTag(asSlotTag(tag))
  if (existed) notify(`已从「${target.value}」移出`, 'warn')
}

function onDragStart(tag: TagItem, event: DragEvent) {
  startDrag({ from: LIB_SLOT, zh: tag.zh, en: tag.en }, event)
}

function submit() {
  const zh = form.value.zh.trim()
  const en = form.value.en.trim()
  if (!zh || !en) {
    notify('中文名和英文标签都要填', 'warn')
    return
  }
  addTag({ zh, en, cat: '自定义', sub: form.value.sub.trim() || undefined })
  form.value = { zh: '', en: '', sub: '' }
}
</script>

<template>
  <section class="panel">
    <div class="panel-head">
      <div class="panel-title">
        补充标签
        <small>{{ list.length }} 条</small>
      </div>
      <span class="target">点一下加到 <b>{{ target }}</b></span>
    </div>

    <div class="bar">
      <div class="cats">
        <button
          v-for="cat in CATEGORIES"
          :key="cat"
          class="cat"
          :class="{ on: active === cat && !query && !favOnly }"
          @click="active = cat; favOnly = false"
        >
          {{ cat }}
        </button>
        <button
          class="cat star"
          :class="{ on: favOnly }"
          :title="`只看收藏（${favorites.length} 个）`"
          @click="favOnly = !favOnly"
        >
          ★{{ favOnly || !favorites.length ? '' : favorites.length }}
        </button>
      </div>
      <div class="search">
        <BaseIcon name="search" :size="14" />
        <input v-model="query" placeholder="搜中文 / 英文" spellcheck="false" />
        <button v-if="query" class="mini" @click="query = ''"><BaseIcon name="x" :size="12" /></button>
      </div>
      <div v-if="subs.length && !query" class="subs">
        <button class="sub" :class="{ on: sub === '' }" @click="sub = ''">全部</button>
        <button v-for="item in subs" :key="item" class="sub" :class="{ on: sub === item }" @click="sub = sub === item ? '' : item">
          {{ item }}
        </button>
      </div>
    </div>

    <div class="panel-body">
      <button
        v-for="tag in list"
        :key="tag.en"
        class="row"
        :class="{ on: hasSlotTag(activeSlot, tag.en) }"
        draggable="true"
        @dragstart="onDragStart(tag, $event)"
        @dragend="endDrag"
        @click="pick(tag)"
      >
        <span class="zh">{{ tag.zh }}</span>
        <span class="en">{{ tag.en }}</span>
        <span v-if="tag.sub" class="sub-tag">{{ tag.sub }}</span>
        <span v-if="isCustom(tag.en)" class="del" title="删除自定义词条" @click.stop="removeTag(tag.en)">
          <BaseIcon name="trash" :size="11" />
        </span>
        <span
          class="fav"
          :class="{ on: isFavorite(tag.en) }"
          :title="isFavorite(tag.en) ? '取消收藏' : '收藏，排到分类最前'"
          @click.stop="toggleFavorite(tag.en)"
        >
          <BaseIcon name="star" :size="11" :filled="isFavorite(tag.en)" />
        </span>
        <span class="tick"><BaseIcon :name="hasSlotTag(activeSlot, tag.en) ? 'check' : 'plus'" :size="12" /></span>
      </button>
      <div v-if="!list.length" class="empty">
        <div>这里还没词条</div>
        <div class="hint">可以自己加一个，会存到本地</div>
      </div>
    </div>

    <div class="foot">
      <button v-if="!adding" class="btn sm" @click="adding = true"><BaseIcon name="plus" :size="13" /> 自定义词条</button>
      <form v-else class="form" @submit.prevent="submit">
        <input v-model="form.zh" placeholder="中文名" />
        <input v-model="form.en" placeholder="english_tag" />
        <input v-model="form.sub" placeholder="子分类（可空）" />
        <button class="btn primary sm" type="submit">加入</button>
        <button class="btn sm ghost" type="button" @click="adding = false">收起</button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.target {
  color: var(--ink-3);
  font-size: 11px;
}

.target b {
  color: var(--accent-ink);
  font-weight: 600;
}

.bar {
  padding: 9px 12px 10px;
  border-bottom: 1px solid var(--line);
  background: #fcfbff;
}

/* 等分网格会把「自定义」这种三字分类压到溢出，改成可换行 */
.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cat {
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--panel);
  color: var(--ink-3);
  font-size: 12px;
}

.cat:hover {
  border-color: var(--line-2);
  color: var(--ink-2);
}

.cat.on {
  border-color: var(--accent-line);
  background: var(--accent-soft);
  color: var(--accent-ink);
  font-weight: 500;
}

.cat.star {
  color: #b9a24a;
}

.cat.star.on {
  border-color: #e6d79a;
  background: #fdf8e6;
  color: #8a7320;
}

.fav {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: var(--ink-4);
  opacity: 0;
}

.row:hover .fav {
  opacity: 1;
}

.fav.on {
  color: #d3a838;
  opacity: 1;
}

.fav:hover {
  background: #fff;
  color: #b8901f;
}

.search {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  margin-top: 7px;
  padding: 0 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--ink-3);
}

.search:focus-within {
  border-color: var(--accent-line);
}

.search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 12px;
}

.mini {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--ink-3);
  padding: 0;
}

.subs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 7px;
}

.sub {
  height: 21px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--sunken);
  color: var(--ink-3);
  font-size: 10.5px;
}

.sub.on {
  background: var(--accent-soft);
  color: var(--accent-ink);
  border-color: var(--accent-line);
}

.panel-body {
  padding: 6px 6px 8px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  text-align: left;
  cursor: grab;
  transition: background 0.12s;
}

.row:active {
  cursor: grabbing;
}

.row:hover {
  background: var(--sunken);
}

.row.on {
  background: var(--accent-soft);
}

.row .zh {
  flex: none;
  font-size: 12.5px;
}

.row .en {
  flex: 1;
  min-width: 0;
  font-family: var(--mono);
  font-size: 9.5px;
  color: var(--ink-4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub-tag {
  flex: none;
  padding: 0 5px;
  border-radius: 4px;
  background: var(--sunken-2);
  color: var(--ink-4);
  font-size: 9.5px;
}

.row.on .zh {
  color: var(--accent-ink);
  font-weight: 500;
}

.del {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: var(--ink-4);
  opacity: 0;
}

.row:hover .del {
  opacity: 1;
}

.del:hover {
  background: #fff;
  color: #c0392b;
}

.tick {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  color: var(--ink-4);
  opacity: 0;
}

.row:hover .tick,
.row.on .tick {
  opacity: 1;
}

.row.on .tick {
  color: var(--accent);
}

.hint {
  font-size: 11.5px;
  color: var(--ink-4);
}

.foot {
  padding: 8px 12px;
  border-top: 1px solid var(--line);
  background: #fcfbff;
}

.foot > .btn {
  width: 100%;
}

.form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.form input {
  height: 27px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;
  font-size: 12px;
  outline: 0;
}

.form input:focus {
  border-color: var(--accent-line);
}

.form input:nth-child(3) {
  grid-column: 1 / -1;
}
</style>
