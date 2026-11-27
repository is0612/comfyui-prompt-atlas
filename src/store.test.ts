import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Category, SlotTag, TagItem } from './types'
import {
  applyParsed,
  bumpWeight,
  charTags,
  clearSelection,
  clearSlot,
  favorites,
  fixSlotConflicts,
  globalTags,
  moveSlotTag,
  removeSlotTag,
  renameSlotTag,
  selectedChars,
  settings,
  setTagWeight,
  slotConflicts,
  slotTags,
  toasts,
  toggleChar,
  toggleSlotTag,
  toggleLibraryTag,
  totalTagCount,
} from './store'
import { handCost, handUsage } from './data/conflicts'

const t = (en: string, zh = en): SlotTag => ({ zh, en })

/** 依次往槽里加标签 */
function add(slot: string, ...ens: string[]) {
  for (const en of ens) toggleSlotTag(t(en), slot)
}

const ens = (slot: string) => slotTags(slot).map((x) => x.en)

beforeEach(() => {
  // store 的持久化会碰 window，用假定时器拦住，避免测试结束后回调还在跑
  vi.useFakeTimers()
  vi.stubGlobal('window', { setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout })

  clearSelection()
  settings.autoReplace = true
  settings.outfitReplace = true
  settings.handBudget = true
  settings.withAppearance = true
  favorites.value = []
  toasts.value = []
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('互斥替换', () => {
  it('同一组里加新的，旧的被挤掉', () => {
    add('A', 'sitting', 'standing')
    expect(ens('A')).toEqual(['standing'])
  })

  it('替换时给一条警告提示', () => {
    add('A', 'sitting', 'standing')
    expect(toasts.value.some((x) => x.tone === 'warn')).toBe(true)
    expect(toasts.value.map((x) => x.text).join()).toContain('姿态')
  })

  it('关掉「同类自动替换」后可以共存', () => {
    settings.autoReplace = false
    add('A', 'sitting', 'standing')
    expect(ens('A')).toEqual(['sitting', 'standing'])
  })

  it('整体装束单独受「服装互斥」控制', () => {
    add('A', 'kimono', 'swimsuit')
    expect(ens('A')).toEqual(['swimsuit'])

    clearSlot('A')
    settings.outfitReplace = false
    add('A', 'kimono', 'swimsuit')
    expect(ens('A')).toEqual(['kimono', 'swimsuit'])
  })

  it('不同组的标签可以共存', () => {
    add('A', 'sitting', 'smile', 'looking_at_viewer')
    expect(ens('A')).toEqual(['sitting', 'smile', 'looking_at_viewer'])
  })

  it('不在互斥表里的标签随便叠加', () => {
    add('A', 'sword', 'book', 'waving')
    expect(ens('A')).toEqual(['sword', 'book', 'waving'])
  })

  it('同一个标签再点一次是移除', () => {
    add('A', 'smile')
    add('A', 'smile')
    expect(ens('A')).toEqual([])
  })
})

describe('手部预算', () => {
  it('两只手占满后，加双手动作会把旧的一个个顶掉', () => {
    add('A', 'waving', 'holding_cup') // 1 + 1 = 2
    expect(handUsage(slotTags('A'))).toBe(2)

    add('A', 'crossed_arms') // 需要 2，得先腾空
    expect(ens('A')).toEqual(['crossed_arms'])
  })

  it('单手动作之间互相挤', () => {
    add('A', 'waving', 'holding_cup', 'finger_to_mouth')
    expect(ens('A')).toEqual(['holding_cup', 'finger_to_mouth'])
  })

  it('关掉「两只手限额」就不管了', () => {
    settings.handBudget = false
    add('A', 'crossed_arms', 'holding_bouquet')
    expect(ens('A')).toHaveLength(2)
  })

  it('道具本身不占手（道具可能挂在脖子上）', () => {
    for (const prop of ['sword', 'book', 'bow_(weapon)']) expect(handCost(prop), prop).toBe(0)
    add('A', 'sword', 'book', 'waving', 'holding_cup')
    expect(ens('A')).toEqual(['sword', 'book', 'waving', 'holding_cup'])
  })

  it('道具和两个单手动作可以同时存在', () => {
    add('A', 'sword', 'waving', 'holding_cup')
    expect(handUsage(slotTags('A'))).toBe(2)
    expect(ens('A')).toHaveLength(3)
  })
})

describe('权重', () => {
  it('设成 1.3 会写进字段', () => {
    add('A', 'smile')
    setTagWeight('A', 'smile', 1.3)
    expect(slotTags('A')[0].w).toBe(1.3)
  })

  it('四舍五入到一位小数', () => {
    add('A', 'smile')
    setTagWeight('A', 'smile', 1.25)
    expect(slotTags('A')[0].w).toBe(1.3)
  })

  it('夹在 0.5 ~ 2.0', () => {
    add('A', 'smile')
    setTagWeight('A', 'smile', 9)
    expect(slotTags('A')[0].w).toBe(2)
    setTagWeight('A', 'smile', 0.01)
    expect(slotTags('A')[0].w).toBe(0.5)
  })

  it('回到 1 就把字段删掉，输出里不带括号', () => {
    add('A', 'smile')
    setTagWeight('A', 'smile', 1.3)
    setTagWeight('A', 'smile', 1)
    expect(slotTags('A')[0]).not.toHaveProperty('w')
  })

  it('bumpWeight 在原值上加减', () => {
    add('A', 'smile')
    bumpWeight('A', 'smile', 0.1)
    expect(slotTags('A')[0].w).toBe(1.1)
    bumpWeight('A', 'smile', -0.2)
    expect(slotTags('A')[0].w).toBe(0.9)
  })

  it('对不存在的标签设权重不会崩', () => {
    expect(() => setTagWeight('A', 'nope', 1.5)).not.toThrow()
  })
})

describe('二次编辑', () => {
  it('改中文名和英文标签', () => {
    add('A', 'smile')
    renameSlotTag('A', 'smile', { zh: '轻笑', en: 'gentle_smile' })
    expect(slotTags('A')[0]).toEqual({ zh: '轻笑', en: 'gentle_smile' })
  })

  it('空值表示这一项不改', () => {
    add('A', 'smile')
    renameSlotTag('A', 'smile', { zh: '微笑', en: '' })
    expect(slotTags('A')[0]).toEqual({ zh: '微笑', en: 'smile' })
  })

  it('改成一个槽里已存在的标签时，旧的去掉只留一个', () => {
    // 用两个不同组的标签，否则加第二个时就被互斥规则挤掉了
    add('A', 'blue_hair', 'long_hair')
    renameSlotTag('A', 'blue_hair', { zh: '蓝发', en: 'long_hair' })
    expect(ens('A')).toEqual(['long_hair'])
    expect(slotTags('A')[0].zh).toBe('蓝发')
  })
})

describe('跨槽移动', () => {
  it('从角色 A 挪到角色 B', () => {
    add('A', 'smile')
    moveSlotTag('A', 'B', 'smile')
    expect(ens('A')).toEqual([])
    expect(ens('B')).toEqual(['smile'])
  })

  it('可以挪进全局区', () => {
    add('A', 'smile')
    moveSlotTag('A', '', 'smile')
    expect(ens('A')).toEqual([])
    expect(ens('')).toEqual(['smile'])
  })

  it('目标槽已经有同一个标签时，源槽的标签不能被吃掉', () => {
    add('A', 'smile')
    add('B', 'smile')
    moveSlotTag('A', 'B', 'smile')
    expect(ens('A')).toEqual(['smile'])
    expect(ens('B')).toEqual(['smile'])
  })

  it('同一个槽之间移动不做任何事', () => {
    add('A', 'smile')
    moveSlotTag('A', 'A', 'smile')
    expect(ens('A')).toEqual(['smile'])
  })

  it('挪过去之后同样要遵守互斥和手部预算', () => {
    add('A', 'crossed_arms')
    add('B', 'waving', 'holding_cup')
    moveSlotTag('A', 'B', 'crossed_arms')
    expect(ens('B')).toEqual(['crossed_arms'])
  })
})

describe('冲突修正', () => {
  it('每组只留最后加进去的，并按两只手收拢', () => {
    settings.autoReplace = false
    settings.handBudget = false
    add('A', 'sitting', 'standing', 'waving', 'crossed_arms')
    expect(slotConflicts('A').map((c) => c.group.key)).toEqual(['pose'])

    fixSlotConflicts('A')
    // pose 组留后来的 standing；waving 被 crossed_arms 的两只手挤掉
    expect(ens('A')).toEqual(['standing', 'crossed_arms'])
    expect(slotConflicts('A')).toEqual([])
  })

  it('全局槽也能修正', () => {
    settings.autoReplace = false
    toggleSlotTag(t('sitting'), '')
    toggleSlotTag(t('standing'), '')
    fixSlotConflicts('')
    expect(ens('')).toEqual(['standing'])
  })
})

describe('选择角色', () => {
  it('选中时建一个空槽，并把它设为当前收标签的槽', () => {
    toggleChar('hu_tao')
    expect(selectedChars.value).toEqual(['hu_tao'])
    expect(charTags.value.hu_tao).toEqual([])
  })

  it('取消选中时连槽里的标签一起清掉', () => {
    toggleChar('hu_tao')
    add('hu_tao', 'smile')
    toggleChar('hu_tao')
    expect(selectedChars.value).toEqual([])
    expect(charTags.value.hu_tao).toBeUndefined()
  })

  it('清空选择会同时清掉全局标签', () => {
    toggleChar('hu_tao')
    add('hu_tao', 'smile')
    toggleSlotTag(t('shrine'), '')
    clearSelection()
    expect(selectedChars.value).toEqual([])
    expect(globalTags.value).toEqual([])
  })

  it('标签总数 = 全局 + 各角色框之和', () => {
    toggleChar('hu_tao')
    toggleChar('ganyu')
    add('hu_tao', 'smile', 'blue_hair')
    add('ganyu', 'sitting')
    toggleSlotTag(t('shrine'), '')
    expect(totalTagCount.value).toBe(4)
  })
})

describe('粘贴结果合并', () => {
  it('只补新的，已有的不重复', () => {
    toggleChar('hu_tao')
    add('hu_tao', 'smile')

    applyParsed({
      chars: [{ en: 'hu_tao', zh: '胡桃', index: 0, tags: [t('smile'), t('blue_hair')] }],
      globals: [t('shrine')],
      unknown: [],
      tokens: 3,
    })

    expect(ens('hu_tao')).toEqual(['smile', 'blue_hair'])
    expect(ens('')).toEqual(['shrine'])
  })

  it('不认识的英文角色直接跳过', () => {
    applyParsed({ chars: [{ en: 'nobody', zh: '不存在', index: 0, tags: [t('smile')] }], globals: [], unknown: [], tokens: 1 })
    expect(selectedChars.value).toEqual([])
  })
})

describe('词库点选：场景 / 风格强制归全局', () => {
  const lib = (zh: string, en: string, cat: Category): TagItem => ({ zh, en, cat })

  it('场景标签进全局区，即使在给角色收标签', () => {
    toggleChar('hu_tao')
    toggleLibraryTag(lib('教室', 'classroom', '场景'))
    expect(ens('')).toEqual(['classroom'])
    expect(ens('hu_tao')).toEqual([])
  })

  it('风格标签同样进全局', () => {
    toggleChar('hu_tao')
    toggleLibraryTag(lib('水彩', 'watercolor_(medium)', '风格'))
    expect(ens('')).toEqual(['watercolor_(medium)'])
    expect(ens('hu_tao')).toEqual([])
  })

  it('动作标签进当前收标签的角色槽', () => {
    toggleChar('hu_tao')
    toggleLibraryTag(lib('微笑', 'smile', '动作'))
    expect(ens('hu_tao')).toEqual(['smile'])
    expect(ens('')).toEqual([])
  })

  it('没有选角色时，动作标签也只是进全局', () => {
    toggleLibraryTag(lib('微笑', 'smile', '动作'))
    expect(ens('')).toEqual(['smile'])
  })

  it('再点一次从全局移除', () => {
    toggleLibraryTag(lib('教室', 'classroom', '场景'))
    toggleLibraryTag(lib('教室', 'classroom', '场景'))
    expect(ens('')).toEqual([])
  })

  it('和粘贴拆解的归属保持一致', () => {
    toggleChar('hu_tao')
    // 拆解路径：场景进全局
    applyParsed({ chars: [{ en: 'hu_tao', zh: '胡桃', index: 0, tags: [] }], globals: [t('classroom')], unknown: [], tokens: 1 })
    // 点选路径：同一个标签也该进全局
    toggleLibraryTag(lib('教室', 'classroom', '场景'))
    expect(ens('hu_tao')).toEqual([])
  })
})

describe('移除标签', () => {
  it('按 en 移除', () => {
    add('A', 'smile')
    removeSlotTag('A', 'smile')
    expect(ens('A')).toEqual([])
  })

  it('移除不存在的标签不会崩', () => {
    expect(() => removeSlotTag('A', 'nope')).not.toThrow()
  })
})
