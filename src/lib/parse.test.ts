import { describe, expect, it } from 'vitest'
import type { Character, TagItem } from '../types'
import { buildIndex, isCjk, parsePrompt, unknownSlot } from './parse'

const TAGS: TagItem[] = [
  { zh: '坐', en: 'sitting, seiza', cat: '动作', sub: '姿势' },
  { zh: '站', en: 'standing', cat: '动作', sub: '姿势' },
  { zh: '微笑', en: 'smile', cat: '动作', sub: '表情' },
  { zh: '回头看', en: 'looking_back', cat: '动作', sub: '视线' },
  { zh: '撑着伞', en: 'holding_umbrella', cat: '动作', sub: '道具' },
  { zh: '蓝发', en: 'blue_hair', cat: '外形', sub: '头发' },
  { zh: '神社', en: 'shrine', cat: '场景', sub: '地点' },
  { zh: '樱花', en: 'cherry_blossoms', cat: '场景', sub: '植物' },
  { zh: '水彩', en: 'watercolor_(medium)', cat: '风格', sub: '媒材' },
  { zh: '两个大人', en: 'two_adults', cat: '动作', sub: '人数' },
]

const CHARS: Character[] = [
  { zh: '胡桃', en: 'hu_tao', game: '原神' },
  { zh: '甘雨', en: 'ganyu_(genshin_impact)', game: '原神' },
  { zh: '七七', en: 'qiqi_(genshin_impact)', game: '原神' },
]

const index = buildIndex(TAGS, CHARS)
const parse = (text: string) => parsePrompt(text, index)
const enOf = (tags: { en: string }[]) => tags.map((t) => t.en)

describe('角色识别', () => {
  it('带作品后缀的写法', () => {
    expect(parse('ganyu_(genshin_impact)').chars[0].en).toBe('ganyu_(genshin_impact)')
  })

  it('只写短名也能认出同一个角色', () => {
    expect(parse('ganyu').chars[0].en).toBe('ganyu_(genshin_impact)')
  })

  it('短名角色被写成带后缀的形式也能认出', () => {
    expect(parse('hu_tao_(genshin_impact)').chars[0].en).toBe('hu_tao')
  })

  it('中文名也能认出角色', () => {
    expect(parse('甘雨').chars[0].en).toBe('ganyu_(genshin_impact)')
  })
})

describe('标签归属', () => {
  it('遇到角色后，后面的标签都归它', () => {
    const result = parse('hu_tao, smile, blue_hair')
    expect(enOf(result.chars[0].tags)).toEqual(['smile', 'blue_hair'])
    expect(result.globals).toEqual([])
  })

  it('中途换角色，归属跟着换', () => {
    const result = parse('hu_tao, smile, ganyu_(genshin_impact), blue_hair')
    const byEn = new Map(result.chars.map((c) => [c.en, enOf(c.tags)]))
    expect(byEn.get('hu_tao')).toEqual(['smile'])
    expect(byEn.get('ganyu_(genshin_impact)')).toEqual(['blue_hair'])
  })

  it('场景和风格一律进全局，不挂到角色名下', () => {
    const result = parse('ganyu_(genshin_impact), shrine, cherry_blossoms, watercolor_(medium)')
    expect(result.chars[0].tags).toEqual([])
    expect(enOf(result.globals)).toEqual(['shrine', 'cherry_blossoms', 'watercolor_(medium)'])
  })

  it('还没遇到角色时，标签算全局', () => {
    expect(enOf(parse('shrine, smile').globals)).toEqual(['shrine', 'smile'])
  })

  it('同一个槽里重复的标签只留一个', () => {
    expect(enOf(parse('ganyu_(genshin_impact), smile, smile').chars[0].tags)).toEqual(['smile'])
  })
})

describe('多 token 标签', () => {
  it('用任意一个 token 都能命中，保留词库里的完整写法', () => {
    const slot = parse('hu_tao, sitting').chars[0].tags[0]
    expect(slot.en).toBe('sitting, seiza')
    expect(slot.zh).toBe('坐')
  })

  it('第二个 token 也认', () => {
    expect(parse('hu_tao, seiza').chars[0].tags[0].en).toBe('sitting, seiza')
  })
})

describe('权重', () => {
  it('保留 (tag:1.2) 的权重', () => {
    expect(parse('hu_tao, (looking_back:1.2)').chars[0].tags[0].w).toBe(1.2)
  })

  it('超出范围的权重被夹到 0.5 ~ 2.0', () => {
    expect(parse('hu_tao, (smile:5)').chars[0].tags[0].w).toBe(2)
    expect(parse('hu_tao, (smile:0.1)').chars[0].tags[0].w).toBe(0.5)
  })

  it('权重等于 1 时不写字段', () => {
    expect(parse('hu_tao, (smile:1.0)').chars[0].tags[0]).not.toHaveProperty('w')
  })

  it('普通括号不影响识别', () => {
    expect(parse('hu_tao, (smile)').chars[0].tags[0].en).toBe('smile')
    expect(parse('hu_tao, ((smile))').chars[0].tags[0].en).toBe('smile')
  })
})

describe('噪声词', () => {
  it('质量词、人数词、模型前缀都被丢掉，也不进未知列表', () => {
    const result = parse('masterpiece, best_quality, 1girl, solo, score_9, source_anime, hu_tao, smile')
    expect(enOf(result.chars[0].tags)).toEqual(['smile'])
    expect(result.unknown).toEqual([])
    expect(result.globals).toEqual([])
  })
})

describe('未知词', () => {
  it('英文未知词原样保留，交给界面决定要不要导入', () => {
    expect(parse('my_custom_tag').unknown).toEqual(['my_custom_tag'])
  })

  it('中文未知词不会被塞进英文输出', () => {
    const result = parse('一只很可爱的猫')
    expect(result.unknown).toEqual(['一只很可爱的猫'])
    expect(result.globals).toEqual([])
  })

  it('unknownSlot 把空格转成下划线、去掉括号', () => {
    expect(unknownSlot('My Custom Tag')).toEqual({ zh: 'My Custom Tag', en: 'my_custom_tag' })
    expect(unknownSlot('(some_tag)').en).toBe('some_tag')
  })

  it('isCjk', () => {
    expect(isCjk('撑伞')).toBe(true)
    expect(isCjk('holding_umbrella')).toBe(false)
  })
})

describe('中文兜底匹配', () => {
  it('差一个助词也能认：撑伞 → 撑着伞', () => {
    expect(parse('hu_tao, 撑伞').chars[0].tags[0].en).toBe('holding_umbrella')
  })

  it('输入里包含标签名就能命中', () => {
    expect(parse('hu_tao, 蓝色樱花').globals.map((t) => t.en)).toEqual(['cherry_blossoms'])
  })

  it('不会把短词反推成更长的错标签：大人 → 两个大人', () => {
    const result = parse('hu_tao, 大人')
    expect(result.chars[0].tags).toEqual([])
    expect(result.unknown).toEqual(['大人'])
  })
})

describe('分词', () => {
  it('中英文逗号、顿号、分号、换行都能切', () => {
    const result = parse('hu_tao，smile、blue_hair;shrine\nseiza')
    expect(enOf(result.chars[0].tags)).toEqual(['smile', 'blue_hair', 'sitting, seiza'])
    expect(enOf(result.globals)).toEqual(['shrine'])
  })

  it('统计 token 数量（不含空白项）', () => {
    expect(parse('hu_tao,,smile, ,\n').tokens).toBe(2)
  })
})
