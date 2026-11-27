import { describe, expect, it } from 'vitest'
import type { Character } from '../types'
import { CSV_TEMPLATE, FIELDS_COVER_ALL, parseCharacters } from './importer'

/**
 * 键集合 = Character 的全部字段（Required 把可选字段变必填）。
 * 给 Character 加字段却忘了加这里，编译直接报错 —— 契约测试本身就要求完备。
 */
const FULL: Record<keyof Required<Character>, string> = {
  zh: '测试角色',
  en: 'test_char_(some_game)',
  game: '测试游戏',
  body: '少女',
  hair: '蓝色长发',
  eyes: '金瞳',
  outfit: '白色连衣裙',
  traits: '猫耳',
  tags: 'blue_hair, long_hair',
  avatar: 'test_char',
  note: '备注',
}

const one = (text: string) => parseCharacters(text).characters[0]

describe('parseCharacters · 字段契约', () => {
  it('字段登记表覆盖 Character 的全部字段', () => {
    expect(FIELDS_COVER_ALL).toBe(true)
  })

  it('Character 的每个字段都能经 JSON 原样往返', () => {
    // 给 Character 加字段却忘了在 importer 的 ALIASES / FIELDS 登记，这条会立刻红
    expect(one(JSON.stringify([FULL]))).toEqual(FULL)
  })

  it('导出再导入不会丢头像（avatar）', () => {
    const round = one(JSON.stringify([{ zh: '甘雨', en: 'ganyu_(genshin_impact)', game: '原神', avatar: 'ganyu_genshin_impact' }]))
    expect(round.avatar).toBe('ganyu_genshin_impact')
  })

  it('CSV 模板的每一列都能落到字段上', () => {
    const char = one(CSV_TEMPLATE)
    expect(char).toMatchObject({
      zh: '甘雨',
      en: 'ganyu_(genshin_impact)',
      game: '原神',
      body: '少女',
      hair: '蓝紫色长发',
      eyes: '金瞳',
      outfit: '黑金配色仙兽服饰',
      traits: '麒麟角',
      avatar: 'ganyu_genshin_impact',
      tags: 'blue_hair, long_hair, horns',
    })
  })

  it('模板表头里没有解析器不认识的列', () => {
    const header = CSV_TEMPLATE.split('\n')[0].split(',')
    const row = one(CSV_TEMPLATE)
    const filled = Object.entries(row).filter(([, v]) => v !== undefined && v !== '').map(([k]) => k)
    // 每一列都应该让至少一个字段有值；对不上说明表头和别名表漂移了
    expect(filled.length).toBe(header.length)
  })

  it('元素 / 武器这类已删除的字段会被忽略，而不是报错', () => {
    const char = one(JSON.stringify([{ zh: '甘雨', en: 'ganyu', game: '原神', element: '冰', path: '弓' }]))
    expect(char).not.toHaveProperty('element')
    expect(char).not.toHaveProperty('path')
  })
})

describe('parseCharacters · 输入格式', () => {
  it('中文表头', () => {
    expect(one('中文名,英文tag,游戏,体型,头像\n甘雨,ganyu_(genshin_impact),原神,少女,ganyu_genshin_impact')).toMatchObject({
      zh: '甘雨',
      en: 'ganyu_(genshin_impact)',
      game: '原神',
      body: '少女',
      avatar: 'ganyu_genshin_impact',
    })
  })

  it('带引号的 CSV 单元格里可以含逗号', () => {
    expect(one('中文名,英文tag,游戏,标签\n甘雨,ganyu,原神,"blue_hair, long_hair, horns"').tags).toBe('blue_hair, long_hair, horns')
  })

  it('TSV', () => {
    expect(one('中文名\t英文tag\t游戏\n甘雨\tganyu\t原神')).toMatchObject({ zh: '甘雨', en: 'ganyu', game: '原神' })
  })

  it('对象包着数组的 JSON', () => {
    expect(parseCharacters(JSON.stringify({ characters: [FULL] })).characters).toHaveLength(1)
    expect(parseCharacters(JSON.stringify({ data: [FULL] })).characters).toHaveLength(1)
  })

  it('兼容参考项目的格式：cat = 角色，外观放在 app 里', () => {
    const char = one(
      JSON.stringify([
        {
          zh: '胡桃',
          en: 'hu_tao_(genshin_impact)',
          cat: '角色',
          sub: '原神',
          hair_en: 'brown_hair',
          eyes_en: 'red_eyes',
          outfit_en: 'black_shirt, hat',
          app: { hair: '深棕双马尾', eyes: '梅花形红瞳', outfit: '黑色中式短衫配长帽' },
        },
      ]),
    )
    expect(char).toEqual({
      zh: '胡桃',
      en: 'hu_tao_(genshin_impact)',
      game: '原神',
      hair: '深棕双马尾',
      eyes: '梅花形红瞳',
      outfit: '黑色中式短衫配长帽',
      tags: 'brown_hair, red_eyes, black_shirt, hat',
    })
  })
})

describe('parseCharacters · 清洗', () => {
  it('同一个 en 只留第一条，其余计入 skipped', () => {
    const result = parseCharacters(
      JSON.stringify([
        { zh: '甘雨', en: 'ganyu', game: '原神' },
        { zh: '甘雨（重复）', en: 'ganyu', game: '原神' },
      ]),
    )
    expect(result.characters).toHaveLength(1)
    expect(result.characters[0].zh).toBe('甘雨')
    expect(result.skipped).toBe(1)
  })

  it('缺中文名或英文 tag 的行跳过', () => {
    const result = parseCharacters(
      JSON.stringify([
        { zh: '', en: 'a', game: '原神' },
        { zh: '有中文名', en: '', game: '原神' },
        { zh: '正常', en: 'c', game: '原神' },
      ]),
    )
    expect(result.characters.map((c) => c.en)).toEqual(['c'])
    expect(result.skipped).toBe(2)
  })

  it('值两头的空白会被去掉，空字符串当作没填', () => {
    const char = one(JSON.stringify([{ zh: '  甘雨  ', en: ' ganyu ', game: '原神', body: '   ', hair: ' 蓝色长发 ' }]))
    expect(char.zh).toBe('甘雨')
    expect(char.en).toBe('ganyu')
    expect(char).not.toHaveProperty('body')
    expect(char.hair).toBe('蓝色长发')
  })

  it('统计没有填写游戏的条数', () => {
    const result = parseCharacters(JSON.stringify([{ zh: '甲', en: 'a', game: '' }, { zh: '乙', en: 'b', game: '原神' }]))
    expect(result.missingGame).toBe(1)
  })

  it('空输入', () => {
    expect(parseCharacters('   \n  ')).toEqual({ characters: [], skipped: 0, missingGame: 0 })
  })
})
