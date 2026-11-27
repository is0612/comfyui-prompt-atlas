import type { Character, SlotTag, TagItem } from '../types'

export interface ParsedChar {
  en: string
  zh: string
  tags: SlotTag[]
  /** 输入里这个角色占了几段，用来在预览里排序 */
  index: number
}

export interface ParseResult {
  chars: ParsedChar[]
  globals: SlotTag[]
  unknown: string[]
  tokens: number
}

/** 质量词、模型前缀这类不算内容，直接丢掉 */
const NOISE = new Set([
  'masterpiece',
  'best_quality',
  'amazing_quality',
  'very_aesthetic',
  'high_quality',
  'highres',
  'absurdres',
  'newest',
  'ultra_detailed',
  'detailed',
  'solo',
  'solo_focus',
  '1girl',
  '1boy',
  '2girls',
  '2boys',
  '3girls',
  'multiple_girls',
  'multiple_boys',
])

const NOISE_RE = /^(score_\d|source_|year_?\d|rating_|quality|very_awa)/

const CJK = /[\u3400-\u9fff]/

interface Index {
  byEn: Map<string, TagItem>
  byZh: Map<string, TagItem>
  chars: Character[]
  charByKey: Map<string, Character>
  zhTags: TagItem[]
}

export function buildIndex(tags: TagItem[], characters: Character[]): Index {
  const byEn = new Map<string, TagItem>()
  const byZh = new Map<string, TagItem>()
  const charByKey = new Map<string, Character>()
  for (const tag of tags) {
    // 一个词条可能带多个英文 token（sitting, seiza），逐个都能命中
    for (const part of tag.en.split(',')) {
      const key = normEn(part)
      if (key && !byEn.has(key)) byEn.set(key, tag)
    }
    byZh.set(tag.zh.trim(), tag)
  }
  const zhTags = [...tags].filter((t) => t.zh.trim().length >= 2).sort((a, b) => b.zh.length - a.zh.length)
  for (const char of characters) {
    charByKey.set(char.en.trim().toLowerCase(), char)
    // 只写 ganyu 也能认出来
    const short = char.en.split('_(')[0]
    if (short && !charByKey.has(short)) charByKey.set(short, char)
  }
  return { byEn, byZh, chars: characters, charByKey, zhTags }
}

function normEn(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, '_')
}

/** 词库里没有的词：英文原样转成 token，中文名就填原文 */
export function unknownSlot(token: string): SlotTag {
  const en = normEn(token.replace(/[()]/g, '')) || token
  return { zh: token.trim(), en }
}

/** 去掉权重括号，返回内层文本和权重 */
function unwrap(token: string): { text: string; weight?: number } {
  const weighted = /^\((.+):\s*([\d.]+)\)$/.exec(token)
  if (weighted) return { text: weighted[1], weight: Number(weighted[2]) }
  const plain = /^\(+(.+?)\)+$/.exec(token)
  if (plain) return { text: plain[1] }
  return { text: token }
}

function toSlot(tag: TagItem, weight?: number): SlotTag {
  const slot: SlotTag = { zh: tag.zh, en: tag.en }
  if (weight && Number.isFinite(weight) && weight !== 1) {
    slot.w = Math.min(2, Math.max(0.5, Math.round(weight * 10) / 10))
  }
  return slot
}

function findChar(text: string, index: Index): Character | undefined {
  const key = normEn(text)
  const direct = index.charByKey.get(key)
  if (direct) return direct
  // 词的写法常和角色卡不一致：hu_tao_(genshin_impact) vs hu_tao
  const bare = index.charByKey.get(key.replace(/_\([^)]*\)$/, ''))
  if (bare) return bare
  if (CJK.test(text)) return index.chars.find((c) => text.includes(c.zh))
  return undefined
}

/** 一句中文里能命中几个标签：中文名被包含即算 */
function zhMatches(text: string, index: Index): TagItem[] {
  const out: TagItem[] = []
  const used = new Set<string>()
  for (const tag of index.zhTags) {
    if (used.has(tag.en)) continue
    if (text.includes(tag.zh)) {
      out.push(tag)
      used.add(tag.en)
      if (out.length >= 3) break
    }
  }
  if (out.length) return out
  // 反向兜底：撑伞 → 撑着伞、樱花 → 樱花枝。
  // 只收"差一两个字"的短词，否则「女孩」会被反推到「两个女孩」这种错标签
  const compact = (s: string) => s.replace(/[着了]/g, '')
  const plain = compact(text)
  const reverse = index.zhTags.find((tag) => {
    if (tag.zh.length > 5) return false
    const body = compact(tag.zh)
    if (body === plain) return true
    return tag.zh.length <= 4 && tag.zh.includes(text) && tag.zh.length - text.length <= 1
  })
  return reverse ? [reverse] : []
}

export function isCjk(text: string) {
  return CJK.test(text)
}

/**
 * 把一段提示词或中文描述拆成「角色 → 标签」和全局标签。
 * 规则：遇到角色就切换归属，之后遇到的标签都归这个角色；没遇到角色前算全局。
 */
export function parsePrompt(text: string, index: Index): ParseResult {
  const raw = text.replace(/\r/g, '')
  const tokens = raw
    .split(/[,，、;；\n]+/)
    .map((t) => t.trim().replace(/^[.·\s]+|[.·\s]+$/g, ''))
    .filter(Boolean)

  const chars = new Map<string, ParsedChar>()
  const globals: SlotTag[] = []
  const unknown: string[] = []
  let current = ''

  const pushChar = (char: Character) => {
    current = char.en
    if (!chars.has(char.en)) chars.set(char.en, { en: char.en, zh: char.zh, tags: [], index: chars.size })
  }
  /** 场景、画风是整张图的事，不管当前跟着谁，一律进全局 */
  const GLOBAL_CATS = new Set(['场景', '风格'])
  const pushTag = (item: TagItem, weight?: number) => {
    const slot = toSlot(item, weight)
    const bucket = !current || GLOBAL_CATS.has(item.cat) ? globals : chars.get(current)?.tags
    if (!bucket) return
    if (bucket.some((t) => t.en === slot.en)) return
    bucket.push(slot)
  }

  for (const token of tokens) {
    const { text: inner, weight } = unwrap(token)
    const noiseKey = normEn(inner.replace(/[()]/g, ''))
    if (NOISE.has(noiseKey) || NOISE_RE.test(noiseKey)) continue

    let matched = false
    const char = findChar(inner, index)
    if (char) {
      pushChar(char)
      matched = true
    }

    if (CJK.test(inner)) {
      const hits = zhMatches(inner, index)
      if (hits.length) {
        for (const hit of hits) pushTag(hit, weight)
        matched = true
      }
    } else {
      const tag = index.byEn.get(normEn(inner))
      if (tag) {
        pushTag(tag, weight)
        matched = true
      }
    }

    if (!matched && !char) unknown.push(token)
  }

  return {
    chars: [...chars.values()],
    globals,
    unknown,
    tokens: tokens.length,
  }
}
