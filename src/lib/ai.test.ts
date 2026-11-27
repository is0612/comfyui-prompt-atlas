import { describe, expect, it } from 'vitest'
import { DEFAULT_AI_SYSTEM, EN_MARK, LEGACY_AI_SYSTEMS, splitPolish } from './ai'

const ZH = '甘雨：蓝紫色长发，金瞳，黑金配色仙兽服饰，站在鸟居前。\n场景：黄昏的神社。'
const EN = 'ganyu (genshin impact): 1girl, blue_hair, long_hair, horns'

describe('splitPolish · 分隔符兼容', () => {
  it('模板里的 ====EN====', () => {
    expect(splitPolish(`${ZH}\n${EN_MARK}\n${EN}`)).toEqual({ zh: ZH, en: EN })
  })

  it('【英文】', () => {
    expect(splitPolish(`${ZH}\n【英文】\n${EN}`)).toEqual({ zh: ZH, en: EN })
  })

  it('英文：', () => {
    expect(splitPolish(`${ZH}\n英文：\n${EN}`)).toEqual({ zh: ZH, en: EN })
  })

  it('English:', () => {
    expect(splitPolish(`${ZH}\nEnglish:\n${EN}`)).toEqual({ zh: ZH, en: EN })
  })

  it('写在同一行的「英文：tag1, tag2」', () => {
    expect(splitPolish(`${ZH}\n英文：${EN}`)).toEqual({ zh: ZH, en: EN })
  })

  it('等号数量不固定也能认', () => {
    expect(splitPolish(`${ZH}\n==EN==\n${EN}`).en).toBe(EN)
    expect(splitPolish(`${ZH}\n=========EN=========\n${EN}`).en).toBe(EN)
  })
})

describe('splitPolish · 清洗', () => {
  it('没有分隔行时整段算中文，英文留空', () => {
    expect(splitPolish(ZH)).toEqual({ zh: ZH, en: '' })
  })

  it('去掉模型自作主张加的【中文】标记', () => {
    expect(splitPolish(`【中文】\n${ZH}\n${EN_MARK}\n${EN}`)).toEqual({ zh: ZH, en: EN })
    expect(splitPolish(`【中文段落】\n${ZH}\n${EN_MARK}\n${EN}`).zh).toBe(ZH)
  })

  it('两段都去掉首尾空白', () => {
    const parsed = splitPolish(`\n\n${ZH}\n\n${EN_MARK}\n\n${EN}\n\n`)
    expect(parsed.zh).toBe(ZH)
    expect(parsed.en).toBe(EN)
  })

  it('正文里出现 English 但后面不跟冒号时不会误切', () => {
    const text = 'English is her second language, 她说得很流利。'
    expect(splitPolish(text)).toEqual({ zh: text, en: '' })
  })

  it('空字符串', () => {
    expect(splitPolish('')).toEqual({ zh: '', en: '' })
  })
})

describe('提示词模板', () => {
  it('默认模板里带分隔符，模型才知道往哪切', () => {
    expect(DEFAULT_AI_SYSTEM).toContain(EN_MARK)
  })

  it('历史模板数组里不含当前默认值，否则每次启动都会自我替换', () => {
    expect(LEGACY_AI_SYSTEMS).not.toContain(DEFAULT_AI_SYSTEM)
  })

  it('历史模板都是中英双语版之前的旧版，本身不带新的分隔约定', () => {
    // 这一条是为了防止有人把新版模板塞进 LEGACY 数组：命中就会把用户改好的模板覆盖掉
    for (const legacy of LEGACY_AI_SYSTEMS) {
      expect(legacy).not.toBe(DEFAULT_AI_SYSTEM)
    }
  })
})
