import type { Character } from '../types'

/**
 * 字段别名表。⚠️ 这是「导入时认哪些字段」的唯一清单：
 * 给 Character 加字段必须在这里登记，否则导出再导入会静默丢掉那个字段
 * （avatar 就这么丢过一次：165 个头像导入后全没了）。
 */
const ALIASES: Record<string, keyof Character> = {
  zh: 'zh', 中文名: 'zh', 名字: 'zh', 角色: 'zh', 角色名: 'zh', name: 'zh', name_zh: 'zh',
  en: 'en', 英文tag: 'en', 英文标签: 'en', 英文名: 'en', tag: 'en', name_en: 'en',
  game: 'game', 游戏: 'game', 作品: 'game', 来源: 'game', 出处: 'game',
  body: 'body', 体型: 'body',
  hair: 'hair', 发型: 'hair', 发色: 'hair', 头发: 'hair',
  eyes: 'eyes', 瞳色: 'eyes', 眼睛: 'eyes',
  outfit: 'outfit', 服装: 'outfit', 衣着: 'outfit',
  traits: 'traits', 特征: 'traits', 标志: 'traits',
  tags: 'tags', 标签: 'tags', 英文标签串: 'tags', 描述标签: 'tags',
  avatar: 'avatar', 头像: 'avatar', 头像文件: 'avatar', 缩略图: 'avatar',
  note: 'note', 备注: 'note',
}

type OptionalField = Exclude<keyof Character, 'zh' | 'en' | 'game'>

/** 除 zh / en / game 之外、需要按别名表搬运的字段 */
const FIELDS = ['body', 'hair', 'eyes', 'outfit', 'traits', 'tags', 'avatar', 'note'] as const satisfies readonly OptionalField[]

type MissingField = Exclude<OptionalField, (typeof FIELDS)[number]>

/**
 * 编译期完备性检查：给 Character 加了字段却忘了登记进 FIELDS，这里会变成 `false`
 * 而赋值 `true` 报错，`npm run build` 直接失败。
 * 比等到用户「导出再导入丢字段」才发现便宜得多（avatar 就这么丢过一次）。
 */
export const FIELDS_COVER_ALL: [MissingField] extends [never] ? true : false = true

function fieldOf(key: string): keyof Character | null {
  const clean = key.trim().toLowerCase().replace(/[\s_-]/g, '')
  if (ALIASES[clean]) return ALIASES[clean]
  const merged = clean.replace(/[\s_]/g, '')
  for (const [alias, field] of Object.entries(ALIASES)) {
    if (alias.toLowerCase().replace(/[\s_-]/g, '') === merged) return field
  }
  return null
}

function normalizeRow(raw: Record<string, unknown>): Character | null {
  // 兼容参考项目的 tags_cn.json：cat = 角色，app 里放外观
  if (raw.cat === '角色' || raw.cat === 'character') {
    const app = (raw.app ?? {}) as Record<string, string | undefined>
    const zh = String(raw.zh ?? '').trim()
    const en = String(raw.en ?? '').trim()
    if (!zh || !en) return null
    const tags = [raw.hair_en, raw.eyes_en, raw.outfit_en].map((v) => String(v ?? '').trim()).filter(Boolean).join(', ')
    return {
      zh,
      en,
      game: String(raw.sub ?? raw.game ?? '未分类').trim() || '未分类',
      hair: app.hair,
      eyes: app.eyes,
      outfit: app.outfit,
      tags: tags || undefined,
    }
  }

  const out: Partial<Record<keyof Character, string>> = {}
  for (const [key, value] of Object.entries(raw)) {
    const field = fieldOf(key)
    if (!field) continue
    const text = value == null ? '' : String(value).trim()
    if (text) out[field] = text
  }
  if (!out.zh || !out.en) return null
  const char: Character = { zh: out.zh, en: out.en, game: out.game ?? '' }
  for (const field of FIELDS) {
    const value = out[field]
    if (value) char[field] = value
  }
  return char
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        quoted = false
      } else {
        cell += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      cells.push(cell)
      cell = ''
    } else {
      cell += ch
    }
  }
  cells.push(cell)
  return cells
}

function parseDelimited(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (!lines.length) return []
  const delimiter = lines[0].includes('\t') ? '\t' : ','
  const header = splitCsvLine(lines[0], delimiter).map((s) => s.trim())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter)
    const row: Record<string, unknown> = {}
    header.forEach((key, index) => {
      row[key] = cells[index] ?? ''
    })
    return row
  })
}

export interface ImportResult {
  characters: Character[]
  skipped: number
  missingGame: number
}

export function parseCharacters(text: string): ImportResult {
  const trimmed = text.trim()
  if (!trimmed) return { characters: [], skipped: 0, missingGame: 0 }

  let rows: Record<string, unknown>[] = []
  let skipped = 0

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed) as unknown
    if (Array.isArray(data)) rows = data as Record<string, unknown>[]
    else {
      const bag = data as Record<string, unknown>
      const list = bag.characters ?? bag.items ?? bag.list ?? bag.data ?? bag.tags
      rows = Array.isArray(list) ? (list as Record<string, unknown>[]) : []
    }
  } else {
    rows = parseDelimited(trimmed)
  }

  const seen = new Set<string>()
  const characters: Character[] = []
  for (const row of rows) {
    const char = normalizeRow(row ?? {})
    if (!char || seen.has(char.en)) {
      skipped++
      continue
    }
    seen.add(char.en)
    characters.push(char)
  }

  return {
    characters,
    skipped,
    missingGame: characters.filter((c) => !c.game).length,
  }
}

/** 表头顺序要和 ALIASES 对得上；这里列过的列，解析器必须认 */
export const CSV_TEMPLATE = [
  '中文名,英文tag,游戏,体型,发型,瞳色,服装,特征,头像,标签',
  '甘雨,ganyu_(genshin_impact),原神,少女,蓝紫色长发,金瞳,黑金配色仙兽服饰,麒麟角,ganyu_genshin_impact,"blue_hair, long_hair, horns"',
].join('\n')

export function downloadFile(name: string, content: string, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
