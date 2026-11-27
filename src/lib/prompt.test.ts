import { describe, expect, it } from 'vitest'
import type { Character, Settings, SlotTag } from '../types'
import { CONFLICT_RULES, NEG, buildOutputs, splitTags } from './prompt'

const S = (over: Partial<Settings> = {}): Settings => ({
  withAppearance: true,
  adaptiveNeg: true,
  antiClone: true,
  hideNsfw: true,
  autoReplace: true,
  outfitReplace: true,
  handBudget: true,
  density: 'normal',
  aiBase: '',
  aiModel: '',
  aiKey: '',
  aiSystem: '',
  ...over,
})

const GANYU: Character = {
  zh: '甘雨',
  en: 'ganyu_(genshin_impact)',
  game: '原神',
  body: '少女',
  hair: '蓝紫色长发',
  eyes: '金瞳',
  outfit: '黑金仙兽服饰',
  traits: '麒麟角',
  tags: 'blue_hair, long_hair, horns',
}

const HU_TAO: Character = {
  zh: '胡桃',
  en: 'hu_tao',
  game: '原神',
  body: '少女',
  tags: 'brown_hair, twintails',
}

const tag = (en: string, zh = en, w?: number): SlotTag => (w === undefined ? { zh, en } : { zh, en, w })

const build = (chars: Character[], slots: Record<string, SlotTag[]> = {}, globals: SlotTag[] = [], over: Partial<Settings> = {}) =>
  buildOutputs(chars, slots, globals, S(over))

describe('三套输出', () => {
  it('都有正向和负向内容', () => {
    const out = build([GANYU])
    for (const target of ['moss', 'wai', 'pony'] as const) {
      expect(out[target].positive.length, target).toBeGreaterThan(0)
      expect(out[target].negative.length, target).toBeGreaterThan(0)
    }
  })

  it('WAI 以质量词开头，Pony 以 score 前缀开头', () => {
    expect(build([GANYU]).wai.positive.startsWith('masterpiece')).toBe(true)
    expect(build([GANYU]).pony.positive.startsWith('score_9')).toBe(true)
  })

  it('英文目标里带上角色 tag 和自带外观标签', () => {
    const positive = build([GANYU]).wai.positive
    expect(positive).toContain('ganyu_(genshin_impact)')
    expect(positive).toContain('blue_hair')
    expect(positive).toContain('horns')
  })

  it('MOSS 是逐角色一行的中文段落，括注里只有游戏和体型', () => {
    const positive = build([GANYU]).moss.positive
    expect(positive).toContain('甘雨（原神·少女），蓝紫色长发，金瞳，黑金仙兽服饰，麒麟角。')
    // 元素 / 武器已经删了，不该再出现在括注里
    expect(positive).not.toContain('冰')
    expect(positive).not.toContain('弓')
  })

  it('没有选角色时中文段落为空，英文只剩质量词（界面上不会显示）', () => {
    const out = build([])
    expect(out.moss.positive).toBe('')
    expect(out.wai.positive).toBe('masterpiece, best quality, amazing quality, very aesthetic, absurdres, newest')
  })
})

describe('外观开关', () => {
  it('关掉「带上外观标签」后，英文里不再出现角色自带标签，但角色 tag 还在', () => {
    const positive = build([GANYU], {}, [], { withAppearance: false }).wai.positive
    expect(positive).toContain('ganyu_(genshin_impact)')
    expect(positive).not.toContain('blue_hair')
  })

  it('这个开关只管英文标签，中文段落始终保留外观描写', () => {
    // 开关名里的「标签」指的是 tags 字段；中文段落是给人看的画面描述，
    // 去掉发色瞳色服装就画不出来了，所以两边行为有意不同
    expect(build([GANYU], {}, [], { withAppearance: false }).moss.positive).toContain('蓝紫色长发')
  })
})

describe('权重', () => {
  it('权重不等于 1 时输出 (tag:1.2)', () => {
    const positive = build([GANYU], { [GANYU.en]: [tag('smile', '微笑', 1.2)] }).wai.positive
    expect(positive).toContain('(smile:1.2)')
  })

  it('权重等于 1 时不加括号', () => {
    const positive = build([GANYU], { [GANYU.en]: [tag('smile', '微笑', 1)] }).wai.positive
    expect(positive).toContain('smile')
    expect(positive).not.toContain('(smile:1.0)')
  })

  it('一个标签有多个 token 时各自加权', () => {
    const positive = build([GANYU], { [GANYU.en]: [tag('sitting, seiza', '坐', 1.5)] }).wai.positive
    expect(positive).toContain('(sitting:1.5)')
    expect(positive).toContain('(seiza:1.5)')
  })

  it('全局标签同样带权重', () => {
    const positive = build([GANYU], {}, [tag('cinematic_lighting', '电影光', 1.3)]).wai.positive
    expect(positive).toContain('(cinematic_lighting:1.3)')
  })
})

describe('档位', () => {
  it('精简只取第一个角色', () => {
    const out = build([GANYU, HU_TAO], {}, [], { density: 'lite' })
    expect(out.wai.positive).toContain('ganyu_(genshin_impact)')
    expect(out.wai.positive).not.toContain('hu_tao')
  })

  it('精简每个角色框最多 4 个标签、全局最多 3 个', () => {
    const many = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((en) => tag(en))
    const out = build([GANYU], { [GANYU.en]: many }, [tag('g1'), tag('g2'), tag('g3'), tag('g4')], { density: 'lite' })
    for (const en of ['a1', 'a2', 'a3', 'a4', 'g1', 'g2', 'g3']) expect(out.wai.positive, en).toContain(en)
    for (const en of ['a5', 'a6', 'g4']) expect(out.wai.positive, en).not.toContain(en)
  })

  it('复杂档位追加强化词', () => {
    const out = build([GANYU], {}, [], { density: 'rich' })
    expect(out.wai.positive).toContain('detailed')
    expect(out.moss.positive).toContain('电影级光照')
  })
})

describe('负向', () => {
  it('只有一个角色时追加防克隆负向', () => {
    expect(build([GANYU]).wai.negative).toContain('2girls')
  })

  it('多个角色时不再追加，否则会把自己压掉', () => {
    expect(build([GANYU, HU_TAO]).wai.negative).not.toContain('2girls')
  })

  it('关掉防克隆开关就不追加', () => {
    expect(build([GANYU], {}, [], { antiClone: false }).wai.negative).not.toContain('2girls')
  })

  it('正向用 chibi 时剔除打架的人体负向，关掉自适应则保留', () => {
    const slots = { [GANYU.en]: [tag('chibi', 'Q版')] }
    expect(build([GANYU], slots).wai.negative).not.toContain('bad anatomy')
    expect(build([GANYU], slots, [], { adaptiveNeg: false }).wai.negative).toContain('bad anatomy')
  })

  it('Pony 的负向词带权重写法，自适应也要能剔掉', () => {
    const slots = { [GANYU.en]: [tag('chibi', 'Q版')] }
    const negative = build([GANYU], slots).pony.negative
    // pony 词表里写的是 (bad anatomy:1.2)，去掉权重后不应再出现
    expect(negative).not.toContain('bad anatomy')
  })

  it('正向是纯风景时剔除手部相关的负向', () => {
    const negative = build([], {}, [tag('scenery', '风景')]).wai.negative
    expect(negative).not.toContain('bad hands')
    expect(negative).not.toContain('extra fingers')
  })

  it('负向里不会有重复词', () => {
    const negative = build([GANYU]).wai.negative
    const tokens = negative.split(', ').map((t) => t.toLowerCase())
    expect(new Set(tokens).size).toBe(tokens.length)
  })
})

describe('负向规则契约', () => {
  it('每条自适应规则剔除的词，必须真的存在于某个负向词表里', () => {
    const plain = (token: string) =>
      token
        .toLowerCase()
        .replace(/^\(+/, '')
        .replace(/:\s*[\d.]+\)+$/, '')
        .replace(/\)+$/, '')

    const all = new Set(
      Object.values(NEG)
        .flatMap((set) => [...set.base, ...set.anatomy, ...set.clone])
        .map(plain),
    )

    for (const rule of CONFLICT_RULES) {
      for (const drop of rule.drop) {
        // 剔一个词表里根本没有的词，规则就是摆设，还会让人误以为行为正确
        expect(all.has(plain(drop)), `规则 /${rule.test.source}/ 剔除了不存在的词「${drop}」`).toBe(true)
      }
    }
  })

  it('每个目标都有一套完整的负向（基础 + 人体 + 防克隆）', () => {
    for (const target of ['moss', 'wai', 'pony'] as const) {
      expect(NEG[target].base.length, target).toBeGreaterThan(0)
      expect(NEG[target].anatomy.length, target).toBeGreaterThan(0)
      expect(NEG[target].clone.length, target).toBeGreaterThan(0)
    }
  })
})

describe('工具函数', () => {
  it('splitTags 去掉空白项', () => {
    expect(splitTags(' a, b ,, c ')).toEqual(['a', 'b', 'c'])
    expect(splitTags(undefined)).toEqual([])
    expect(splitTags('')).toEqual([])
  })

  it('重复标签只输出一次', () => {
    const out = build([GANYU], { [GANYU.en]: [tag('blue_hair', '蓝发')] })
    expect(out.wai.positive.match(/blue_hair/g)).toHaveLength(1)
  })
})
