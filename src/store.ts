import { computed, reactive, ref, watch } from 'vue'
import { SEED_CHARACTERS } from './data/characters'
import { conflictsIn, groupOf, handCost, HAND_CAPACITY, handUsage, type Clash } from './data/conflicts'
import { SEED_TAGS } from './data/tags'
import { DEFAULT_AI_BASE, DEFAULT_AI_MODEL, DEFAULT_AI_SYSTEM, LEGACY_AI_SYSTEMS } from './lib/ai'
import { buildOutputs } from './lib/prompt'
import type { ParseResult } from './lib/parse'
import type { Character, HistoryEntry, Settings, SlotTag, TagItem } from './types'

const LS_KEY = 'prompt-atlas/v3'
const HISTORY_LIMIT = 30

const DEFAULT_SETTINGS: Settings = {
  withAppearance: true,
  adaptiveNeg: true,
  antiClone: true,
  hideNsfw: true,
  autoReplace: true,
  outfitReplace: true,
  handBudget: true,
  density: 'normal',
  aiBase: DEFAULT_AI_BASE,
  aiModel: DEFAULT_AI_MODEL,
  aiKey: '',
  aiSystem: DEFAULT_AI_SYSTEM,
}

interface Snapshot {
  settings: Settings
  overrides: Character[]
  hidden: string[]
  customTags: TagItem[]
  selectedChars: string[]
  globalTags: SlotTag[]
  charTags: Record<string, SlotTag[]>
  history: HistoryEntry[]
  favorites: string[]
}

function readSnapshot(): Partial<Snapshot> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw) as Partial<Snapshot>
  } catch {
    return {}
  }
  // 从 v2（只有全局标签的版本）搬一次：保住用户造的角色和词条，选择状态重来
  try {
    const legacy = localStorage.getItem('prompt-atlas/v2')
    if (!legacy) return {}
    const old = JSON.parse(legacy) as {
      settings?: Settings
      overrides?: Character[]
      hidden?: string[]
      customTags?: TagItem[]
    }
    return {
      settings: old.settings,
      overrides: old.overrides ?? [],
      hidden: old.hidden ?? [],
      customTags: old.customTags ?? [],
      globalTags: [],
      charTags: {},
      selectedChars: [],
      history: [],
    }
  } catch {
    return {}
  }
}

const saved = readSnapshot()

export const settings = reactive<Settings>({ ...DEFAULT_SETTINGS, ...saved.settings })
// 老存档里存的是历史默认模板，原样命中就升级；用户自己改过的不动
if (LEGACY_AI_SYSTEMS.includes(settings.aiSystem)) settings.aiSystem = DEFAULT_AI_SYSTEM
export const overrides = ref<Character[]>(saved.overrides ?? [])
export const hidden = ref<string[]>(saved.hidden ?? [])
export const customTags = ref<TagItem[]>(saved.customTags ?? [])
export const selectedChars = ref<string[]>(saved.selectedChars ?? [])
/** 全局标签：场景、画风这类不归属于某个角色的 */
export const globalTags = ref<SlotTag[]>(saved.globalTags ?? [])
/** 角色槽：en -> 归给这个角色的标签 */
export const charTags = ref<Record<string, SlotTag[]>>(saved.charTags ?? {})
/** 当前收标签的槽，空串 = 全局 */
export const activeSlot = ref('')
export const history = ref<HistoryEntry[]>(saved.history ?? [])
/** 收藏的词条 en，词库里排在最前 */
export const favorites = ref<string[]>(saved.favorites ?? [])

export const ui = reactive({
  settingsOpen: false,
  guideOpen: false,
  historyOpen: false,
  importOpen: false,
  editorOpen: false,
  polishOpen: false,
  pasteOpen: false,
  styleOpen: false,
  showNegative: true,
  /** 拼装区是否展示权重调节 */
  weightMode: false,
  editing: null as Character | null,
})

/* ── 提示 ─────────────────────────────────────────── */
export interface ToastItem {
  id: number
  text: string
  tone: 'ok' | 'warn'
}
export const toasts = ref<ToastItem[]>([])
let toastSeed = 0

export function notify(text: string, tone: ToastItem['tone'] = 'ok') {
  const id = ++toastSeed
  toasts.value.push({ id, text, tone })
  if (toasts.value.length > 3) toasts.value.splice(0, toasts.value.length - 3)
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 2200)
}

/* ── 角色 ─────────────────────────────────────────── */
export const allCharacters = computed<Character[]>(() => {
  const overrideKeys = new Set(overrides.value.map((c) => c.en))
  const seeds = SEED_CHARACTERS.filter((c) => !overrideKeys.has(c.en) && !hidden.value.includes(c.en))
  return [...overrides.value, ...seeds]
})

export const charMap = computed(() => {
  const map = new Map<string, Character>()
  for (const char of allCharacters.value) map.set(char.en, char)
  return map
})

export const selectedCharItems = computed<Character[]>(() =>
  selectedChars.value.map((en) => charMap.value.get(en)).filter((c): c is Character => Boolean(c)),
)

/** 种子里的游戏顺序固定，用户后加的排后面 */
const SEED_GAME_ORDER = [...new Set(SEED_CHARACTERS.map((c) => c.game))]

export const games = computed<string[]>(() => {
  const present: string[] = []
  for (const char of allCharacters.value) {
    if (char.game && !present.includes(char.game)) present.push(char.game)
  }
  return [...SEED_GAME_ORDER.filter((g) => present.includes(g)), ...present.filter((g) => !SEED_GAME_ORDER.includes(g))]
})

/* ── 补充标签 ─────────────────────────────────────── */
export const allTags = computed<TagItem[]>(() => {
  const overrideKeys = new Set(customTags.value.map((t) => t.en))
  return [...customTags.value, ...SEED_TAGS.filter((t) => !overrideKeys.has(t.en))]
})

/* ── 角色槽 ───────────────────────────────────────── */
export function slotTags(slot: string): SlotTag[] {
  return slot ? (charTags.value[slot] ?? []) : globalTags.value
}

export function hasSlotTag(slot: string, en: string): boolean {
  return slotTags(slot).some((t) => t.en === en)
}

/** 同类互斥：加新标签时把同组的旧标签挤掉 */
function enforceExclusive(list: SlotTag[], tag: SlotTag) {
  if (!settings.autoReplace) return
  const group = groupOf(tag.en)
  if (!group) return
  if (group.key === 'outfit' && !settings.outfitReplace) return
  let index = list.findIndex((t) => t.en !== tag.en && groupOf(t.en)?.key === group.key)
  while (index >= 0) {
    const [removed] = list.splice(index, 1)
    if (removed) notify(`「${removed.zh}」换成「${tag.zh}」，${group.label}只留一个`, 'warn')
    index = list.findIndex((t) => t.en !== tag.en && groupOf(t.en)?.key === group.key)
  }
}

/** 手部预算：一个槽两只手，超了从最旧的手部动作开始顶 */
function enforceHands(list: SlotTag[], tag: SlotTag) {
  if (!settings.handBudget) return
  const cost = handCost(tag.en)
  if (!cost) return
  let used = handUsage(list)
  let guard = 0
  while (used + cost > HAND_CAPACITY && guard++ < 20) {
    const victim = list.find((t) => t.en !== tag.en && handCost(t.en) > 0)
    if (!victim) break
    list.splice(list.indexOf(victim), 1)
    used -= handCost(victim.en)
    notify(`手不够用，「${victim.zh}」被「${tag.zh}」顶掉`, 'warn')
  }
}

/** 直接设权重，夹在 0.5~2.0；等于 1 就删字段（输出里不带括号） */
export function setTagWeight(slot: string, en: string, weight: number) {
  const tag = slotTags(slot).find((t) => t.en === en)
  if (!tag) return
  const clamped = Math.min(2, Math.max(0.5, Math.round(weight * 10) / 10))
  if (clamped === 1) delete tag.w
  else tag.w = clamped
}

export function bumpWeight(slot: string, en: string, delta: number) {
  const tag = slotTags(slot).find((t) => t.en === en)
  if (!tag) return
  setTagWeight(slot, en, (tag.w ?? 1) + delta)
}

export function toggleSlotTag(tag: SlotTag, slot = activeSlot.value) {
  if (slot && !charTags.value[slot]) charTags.value[slot] = []
  const list = slotTags(slot)
  const index = list.findIndex((t) => t.en === tag.en)
  if (index >= 0) {
    list.splice(index, 1)
    return
  }
  enforceExclusive(list, tag)
  enforceHands(list, tag)
  list.push({ zh: tag.zh, en: tag.en })
}

export function removeSlotTag(slot: string, en: string) {
  const list = slotTags(slot)
  const index = list.findIndex((t) => t.en === en)
  if (index >= 0) list.splice(index, 1)
}

/** 二次编辑：就地改中文名 / 英文标签，空值表示这一项不改 */
export function renameSlotTag(slot: string, en: string, patch: { zh: string; en: string }) {
  const list = slotTags(slot)
  const tag = list.find((t) => t.en === en)
  if (!tag) return
  const nextZh = patch.zh.trim() || tag.zh
  const nextEn = patch.en.trim() || tag.en
  if (nextZh === tag.zh && nextEn === tag.en) return
  tag.zh = nextZh
  tag.en = nextEn
  // 改成已存在的同一个标签时，去掉旧的那条
  const dup = list.findIndex((t) => t !== tag && t.en === nextEn)
  if (dup >= 0) list.splice(dup, 1)
}

/** 拖拽移动：把标签从某个槽挪到另一个槽 */
export function moveSlotTag(from: string, to: string, en: string) {
  if (from === to) return
  const source = slotTags(from)
  const index = source.findIndex((t) => t.en === en)
  if (index < 0) return
  const [tag] = source.splice(index, 1)
  if (!tag) return
  if (to && !charTags.value[to]) charTags.value[to] = []
  const target = slotTags(to)
  if (target.some((t) => t.en === en)) return
  enforceExclusive(target, tag)
  enforceHands(target, tag)
  target.push(tag)
}

/** 当前槽里同一维度重复的标签 */
export function slotConflicts(slot: string): Clash[] {
  return conflictsIn(slotTags(slot))
}

/* ── 收藏 ─────────────────────────────────────────── */
export function isFavorite(en: string) {
  return favorites.value.includes(en)
}

export function toggleFavorite(en: string) {
  const index = favorites.value.indexOf(en)
  if (index >= 0) {
    favorites.value.splice(index, 1)
    return false
  }
  favorites.value.push(en)
  return true
}

/* ── 粘贴拆解 ─────────────────────────────────────── */
/** 把解析结果并进拼装区：已有的标签保留，只补新的 */
export function applyParsed(result: ParseResult) {
  let addedTags = 0
  let addedChars = 0
  for (const parsed of result.chars) {
    const char = charMap.value.get(parsed.en)
    if (!char) continue
    if (!selectedChars.value.includes(char.en)) {
      selectedChars.value.push(char.en)
      addedChars++
    }
    if (!charTags.value[char.en]) charTags.value[char.en] = []
    const bucket = charTags.value[char.en]
    for (const tag of parsed.tags) {
      if (bucket.some((t) => t.en === tag.en)) continue
      bucket.push({ ...tag })
      addedTags++
    }
  }
  for (const tag of result.globals) {
    if (globalTags.value.some((t) => t.en === tag.en)) continue
    globalTags.value.push({ ...tag })
    addedTags++
  }
  if (!addedChars && !addedTags) {
    notify('没有新东西可以加，可能都已经在拼装区了', 'warn')
    return
  }
  notify(
    `拆解完成：${addedChars ? `新增 ${addedChars} 个角色，` : ''}${addedTags} 个标签`,
  )
}

function keepLastOfEachGroup(list: SlotTag[]): SlotTag[] {
  const seen = new Set<string>()
  const out: SlotTag[] = []
  for (let i = list.length - 1; i >= 0; i--) {
    const tag = list[i]
    if (!tag) continue
    const group = groupOf(tag.en)
    if (group) {
      if (seen.has(group.key)) continue
      seen.add(group.key)
    }
    out.unshift(tag)
  }
  return out
}

function trimHands(list: SlotTag[]): SlotTag[] {
  const kept: SlotTag[] = []
  let used = 0
  for (let i = list.length - 1; i >= 0; i--) {
    const tag = list[i]
    if (!tag) continue
    const cost = handCost(tag.en)
    if (cost && used + cost > HAND_CAPACITY) continue
    used += cost
    kept.unshift(tag)
  }
  return kept
}

/** 冲突修正：每组只留最后加进去的那个 */
export function fixSlotConflicts(slot: string) {
  const cleaned = trimHands(keepLastOfEachGroup(slotTags(slot)))
  if (slot) charTags.value[slot] = cleaned
  else globalTags.value = cleaned
  notify('已按每组留最新一个、两只手收拢完成')
}

export function clearSlot(slot: string) {
  if (slot) charTags.value[slot] = []
  else globalTags.value = []
}

export function setActiveSlot(slot: string) {
  activeSlot.value = slot
}

/* ── 选择 ─────────────────────────────────────────── */
export function toggleChar(en: string) {
  const index = selectedChars.value.indexOf(en)
  if (index >= 0) {
    selectedChars.value.splice(index, 1)
    delete charTags.value[en]
    if (activeSlot.value === en) activeSlot.value = ''
  } else {
    selectedChars.value.push(en)
    if (!charTags.value[en]) charTags.value[en] = []
    activeSlot.value = en
  }
}

export function clearSelection() {
  selectedChars.value = []
  charTags.value = {}
  globalTags.value = []
  activeSlot.value = ''
}

export const totalTagCount = computed(
  () => globalTags.value.length + selectedChars.value.reduce((n, en) => n + (charTags.value[en]?.length ?? 0), 0),
)

export const outputs = computed(() => buildOutputs(selectedCharItems.value, charTags.value, globalTags.value, settings))

/* ── 增删改 ───────────────────────────────────────── */
export function saveCharacter(char: Character) {
  const index = overrides.value.findIndex((c) => c.en === char.en)
  if (index >= 0) overrides.value[index] = { ...char }
  else overrides.value.unshift({ ...char })
  hidden.value = hidden.value.filter((en) => en !== char.en)
  notify(index >= 0 ? '已更新角色' : '已新增角色')
}

export function removeCharacter(en: string) {
  overrides.value = overrides.value.filter((c) => c.en !== en)
  if (SEED_CHARACTERS.some((c) => c.en === en) && !hidden.value.includes(en)) hidden.value.push(en)
  selectedChars.value = selectedChars.value.filter((key) => key !== en)
  delete charTags.value[en]
  notify('已从图鉴移除')
}

export function addTag(tag: TagItem) {
  if (allTags.value.some((t) => t.en === tag.en)) {
    notify('这个词条已经存在了', 'warn')
    return false
  }
  customTags.value.unshift(tag)
  notify('已加入词库')
  return true
}

export function removeTag(en: string) {
  customTags.value = customTags.value.filter((t) => t.en !== en)
}

export function importCharacters(list: Character[], fallbackGame = '') {
  let added = 0
  let updated = 0
  for (const char of list) {
    const target: Character = { ...char, game: char.game || fallbackGame }
    const index = overrides.value.findIndex((c) => c.en === target.en)
    if (index >= 0) {
      overrides.value[index] = target
      updated++
    } else {
      overrides.value.unshift(target)
      added++
    }
  }
  notify(`导入完成：新增 ${added} 个${updated ? `，更新 ${updated} 个` : ''}`)
}

export function exportCharacters(): string {
  return JSON.stringify(allCharacters.value, null, 2)
}

/* ── 历史 ─────────────────────────────────────────── */
export function saveHistory() {
  if (!selectedChars.value.length && !globalTags.value.length) {
    notify('先选点东西再存', 'warn')
    return
  }
  const slots: Record<string, SlotTag[]> = {}
  for (const en of selectedChars.value) {
    slots[en] = (charTags.value[en] ?? []).map((t) => ({ ...t }))
  }
  const entry: HistoryEntry = {
    id: `${Date.now()}`,
    time: Date.now(),
    chars: [...selectedChars.value],
    tags: globalTags.value.map((t) => ({ ...t })),
    slots,
    moss: outputs.value.moss.positive,
    wai: outputs.value.wai.positive,
    pony: outputs.value.pony.positive,
  }
  history.value = [entry, ...history.value].slice(0, HISTORY_LIMIT)
  notify('已存入历史')
}

export function applyHistory(id: string) {
  const entry = history.value.find((item) => item.id === id)
  if (!entry) return
  const lookup = new Map(allTags.value.map((t) => [t.en, t]))
  const resolve = (items: (SlotTag | string)[]): SlotTag[] =>
    items
      .map((item) => {
        if (typeof item !== 'string') return { zh: item.zh, en: item.en, w: item.w }
        const tag = lookup.get(item)
        return tag ? { zh: tag.zh, en: tag.en } : null
      })
      .filter((t): t is SlotTag => Boolean(t))

  selectedChars.value = entry.chars.filter((en) => charMap.value.has(en))
  globalTags.value = resolve(entry.tags)
  const slots: Record<string, SlotTag[]> = {}
  for (const en of selectedChars.value) slots[en] = resolve(entry.slots[en] ?? [])
  charTags.value = slots
  activeSlot.value = ''
  ui.historyOpen = false
  notify('已回填这次的选择')
}

export function removeHistory(id: string) {
  history.value = history.value.filter((item) => item.id !== id)
}

export function resetAll() {
  Object.assign(settings, DEFAULT_SETTINGS)
  overrides.value = []
  hidden.value = []
  customTags.value = []
  selectedChars.value = []
  charTags.value = {}
  globalTags.value = []
  history.value = []
  favorites.value = []
  notify('本地数据已清空')
}

/* ── 持久化 ───────────────────────────────────────── */
let timer: number | undefined
let quotaWarned = false

function persist() {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    const snapshot: Snapshot = {
      settings: { ...settings },
      overrides: overrides.value,
      hidden: hidden.value,
      customTags: customTags.value,
      selectedChars: selectedChars.value,
      globalTags: globalTags.value,
      charTags: charTags.value,
      history: history.value,
      favorites: favorites.value,
    }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(snapshot))
    } catch {
      if (!quotaWarned) {
        quotaWarned = true
        notify('本地存储写满了，本次改动只在当前页面生效', 'warn')
      }
    }
  }, 250)
}

watch(
  [settings, overrides, hidden, customTags, selectedChars, globalTags, charTags, history, favorites],
  persist,
  { deep: true },
)
