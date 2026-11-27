import type { Character, Density, Outputs, Settings, SlotTag, TagItem, Target } from '../types'

/** 精简档：每组最多留几个 */
const LITE_SLOT_CAP = 4
const LITE_GLOBAL_CAP = 3

const QUALITY_WAI = ['masterpiece', 'best quality', 'amazing quality', 'very aesthetic', 'absurdres', 'newest']
const QUALITY_PONY = ['score_9', 'score_8_up', 'score_7_up', 'score_6_up', 'score_5_up', 'score_4_up', 'source_anime']
const RICH_EXTRA_EN = ['detailed', 'intricate_details', 'cinematic_lighting', 'depth_of_field', 'sharp_focus']

interface NegSet {
  base: string[]
  anatomy: string[]
  clone: string[]
}

/** 每个目标的基础负向词表。导出是为了让测试能检查「规则引用的词是否真实存在」 */
export const NEG: Record<Target, NegSet> = {
  moss: {
    base: ['低质量', '最差质量', '粗糙线条', '模糊', '噪点', '过曝', '画面裁切', '水印', '文字', '签名', '标志'],
    anatomy: ['畸形', '比例失调', '多余的手指', '缺失的手指', '错位的肢体'],
    clone: ['两个女孩', '多个人物', '分屏', '角色设定图'],
  },
  wai: {
    base: [
      'bad quality', 'worst quality', 'worst detail', 'sketch', 'lowres', 'jpeg artifacts', 'blurry',
      'text', 'watermark', 'signature', 'username', 'logo', 'cropped', 'out of frame',
    ],
    anatomy: ['bad anatomy', 'bad hands', 'extra fingers', 'fewer fingers', 'extra limbs', 'missing limbs', 'deformed', 'bad proportions'],
    clone: ['2girls', 'multiple_girls', 'split_screen', 'character_sheet'],
  },
  pony: {
    base: [
      'score_4', 'score_5', 'score_6', 'score_1', 'score_2', 'score_3',
      'worst quality', '(bad quality:1.1)', 'jpeg artifacts', 'blurry',
      'watermark', 'signature', 'text', 'cropped', 'out of frame',
    ],
    anatomy: ['(bad anatomy:1.2)', '(bad hands:1.2)', 'extra fingers', 'fewer fingers', 'extra limbs', 'deformed'],
    clone: ['2girls', 'multiple_girls', 'split_screen', 'character_sheet'],
  },
}

/** 正向命中左侧条件时，从负向里剔除右侧的词。导出理由同上 */
export const CONFLICT_RULES: { test: RegExp; drop: string[] }[] = [
  { test: /chibi|super_deformed/, drop: ['bad anatomy', 'bad proportions', 'deformed', 'bad hands', 'extra fingers', 'fewer fingers', '畸形', '比例失调', '多余的手指', '缺失的手指'] },
  { test: /no_humans|scenery/, drop: ['bad hands', 'extra fingers', 'fewer fingers', '多余的手指', '缺失的手指'] },
]

function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const token = raw.trim()
    const key = token.toLowerCase()
    if (!token || seen.has(key)) continue
    seen.add(key)
    out.push(token)
  }
  return out
}

export function splitTags(value?: string): string[] {
  if (!value) return []
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/** 权重 ≠ 1 时输出 (tag:1.2)；一个标签写多个 token 就各自加权 */
function weighted(token: string, w?: number): string {
  if (!w || Math.abs(w - 1) < 0.01) return token
  return `(${token}:${w.toFixed(1)})`
}

/** 补全标签没有分类信息，按出现顺序截断即可 */
function capTags(list: SlotTag[], limit: number, density: Density): SlotTag[] {
  return density === 'lite' ? list.slice(0, limit) : list
}

/**
 * 去掉负向词的权重写法：`(bad anatomy:1.2)` → `bad anatomy`。
 * Pony 的词表里带权重，不剥掉的话自适应规则永远匹配不中，形同虚设。
 */
function plainNeg(token: string): string {
  return token
    .toLowerCase()
    .replace(/^\(+/, '')
    .replace(/:\s*[\d.]+\)+$/, '')
    .replace(/\)+$/, '')
}

function buildNegative(target: Target, positiveTokens: string[], settings: Settings, charCount: number): string {
  const set = NEG[target]
  let list = [...set.base, ...set.anatomy]
  if (settings.antiClone && charCount === 1) list.push(...set.clone)
  if (settings.adaptiveNeg) {
    const joined = positiveTokens.join(', ').toLowerCase()
    for (const rule of CONFLICT_RULES) {
      if (!rule.test.test(joined)) continue
      list = list.filter((token) => !rule.drop.includes(plainNeg(token)))
    }
  }
  return dedupe(list).join(target === 'moss' ? '，' : ', ')
}

function charZhLine(char: Character, slot: SlotTag[]): string {
  const meta = [char.game, char.body].filter(Boolean).join('·')
  const detail = [char.hair, char.eyes, char.outfit, char.traits, ...slot.map((t) => t.zh)].filter(Boolean).join('，')
  const head = meta ? `${char.zh}（${meta}）` : char.zh
  return detail ? `${head}，${detail}` : head
}

function buildMoss(chars: Character[], slots: Record<string, SlotTag[]>, globals: SlotTag[], settings: Settings): string {
  const lines = chars.map((char) => `${charZhLine(char, slots[char.en] ?? [])}。`)
  if (globals.length) lines.push(`画面补充：${globals.map((t) => t.zh).join('，')}。`)
  const extras = settings.density === 'rich' ? ['电影级光照', '浅景深', '细节刻画'] : []
  if (chars.length || globals.length) lines.push(`${dedupe([...extras, '最佳质量', '细节丰富', '高分辨率']).join('，')}。`)
  return lines.join('\n')
}

function buildTagPrompt(
  chars: Character[],
  slots: Record<string, SlotTag[]>,
  globals: SlotTag[],
  target: 'wai' | 'pony',
  settings: Settings,
): string {
  const quality = target === 'wai' ? QUALITY_WAI : QUALITY_PONY
  const charTokens = chars.flatMap((char) => {
    const own = slots[char.en] ?? []
    const look = settings.withAppearance ? splitTags(char.tags) : []
    return [char.en, ...look, ...own.flatMap((t) => splitTags(t.en).map((token) => weighted(token, t.w)))]
  })
  const tagTokens = globals.flatMap((t) => splitTags(t.en).map((token) => weighted(token, t.w)))
  const extras = settings.density === 'rich' ? RICH_EXTRA_EN : []
  return dedupe([...quality, ...charTokens, ...tagTokens, ...extras]).join(', ')
}

export function buildOutputs(
  allChars: Character[],
  allSlots: Record<string, SlotTag[]>,
  allGlobals: SlotTag[],
  settings: Settings,
): Outputs {
  const chars = settings.density === 'lite' ? allChars.slice(0, 1) : allChars
  const slots: Record<string, SlotTag[]> = {}
  for (const char of chars) slots[char.en] = capTags(allSlots[char.en] ?? [], LITE_SLOT_CAP, settings.density)
  const globals = capTags(allGlobals, LITE_GLOBAL_CAP, settings.density)

  const tokensEn = [
    ...chars.flatMap((c) => [
      c.en,
      ...(settings.withAppearance ? splitTags(c.tags) : []),
      ...(slots[c.en] ?? []).flatMap((t) => splitTags(t.en)),
    ]),
    ...globals.flatMap((t) => splitTags(t.en)),
  ]
  const tokensZh = [
    ...chars.map((c) => c.zh),
    ...chars.flatMap((c) => (slots[c.en] ?? []).map((t) => t.zh)),
    ...globals.map((t) => t.zh),
  ]

  return {
    moss: {
      positive: buildMoss(chars, slots, globals, settings),
      negative: buildNegative('moss', tokensZh, settings, chars.length),
    },
    wai: {
      positive: buildTagPrompt(chars, slots, globals, 'wai', settings),
      negative: buildNegative('wai', tokensEn, settings, chars.length),
    },
    pony: {
      positive: buildTagPrompt(chars, slots, globals, 'pony', settings),
      negative: buildNegative('pony', tokensEn, settings, chars.length),
    },
  }
}

export function tagsOfSlot(items: TagItem[], keys: string[]): SlotTag[] {
  const map = new Map(items.map((t) => [t.en, t]))
  return keys.map((key) => map.get(key)).filter((t): t is TagItem => Boolean(t)).map((t) => ({ zh: t.zh, en: t.en }))
}
