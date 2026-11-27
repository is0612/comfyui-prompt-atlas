import { describe, expect, it } from 'vitest'
import type { SlotTag } from '../types'
import { EXCLUSIVE_GROUPS, HAND_CAPACITY, conflictsIn, groupOf, handCost, handUsage } from './conflicts'

const tag = (en: string, zh = en): SlotTag => ({ zh, en })

describe('互斥组', () => {
  it('按单个 token 命中', () => {
    expect(groupOf('sitting')?.key).toBe('pose')
    expect(groupOf('looking_at_viewer')?.key).toBe('gaze')
    expect(groupOf('from_below')?.key).toBe('angle')
    expect(groupOf('kimono')?.key).toBe('outfit')
  })

  it('一个标签写多个 token，命中任一就算属于该组', () => {
    expect(groupOf('sitting, seiza')?.key).toBe('pose')
    expect(groupOf('smile, closed_mouth')?.key).toBe('face')
  })

  it('大小写和前后空格不影响判定', () => {
    expect(groupOf('  Sitting  ')?.key).toBe('pose')
    expect(groupOf('SMILING')).toBeNull() // 词表里没有 smiling，只有 smile
  })

  it('不在表里的标签返回 null（道具、手势、服装单品都不该互斥）', () => {
    for (const en of ['sword', 'holding_umbrella', 'waving', 'pleated_skirt', 'blue_hair']) {
      expect(groupOf(en), en).toBeNull()
    }
  })

  it('每个组的 key 唯一、成员不重复', () => {
    const keys = EXCLUSIVE_GROUPS.map((g) => g.key)
    expect(new Set(keys).size).toBe(keys.length)

    const seen = new Map<string, string>()
    for (const group of EXCLUSIVE_GROUPS) {
      expect(group.members.length).toBeGreaterThan(0)
      for (const member of group.members) {
        // 同一个词登记在两个组里，后一个会静默覆盖前一个，排查起来很痛苦
        expect(seen.has(member), `「${member}」同时属于 ${seen.get(member)} 和 ${group.key}`).toBe(false)
        seen.set(member, group.key)
      }
    }
  })
})

describe('手部预算', () => {
  it('两只手的动作算 2，单手算 1，无关动作算 0', () => {
    expect(handCost('crossed_arms')).toBe(2)
    expect(handCost('holding_bouquet')).toBe(2)
    expect(handCost('waving')).toBe(1)
    expect(handCost('holding_umbrella')).toBe(1)
    expect(handCost('sword')).toBe(0)
    expect(handCost('standing')).toBe(0)
  })

  it('一个标签写多个 token 时取最大值', () => {
    expect(handCost('sword, crossed_arms')).toBe(2)
    expect(handCost('standing, waving')).toBe(1)
  })

  it('大小写不影响判定，但只认下划线写法', () => {
    expect(handCost(' Waving ')).toBe(1)
    // 词库里的 en 一律用下划线，空格写法不会被认出来（有意为之，避免模糊匹配误伤）
    expect(handCost('Crossed Arms')).toBe(0)
  })

  it('累加整个槽的用量', () => {
    expect(handUsage([tag('waving'), tag('holding_cup')])).toBe(2)
    expect(handUsage([tag('crossed_arms'), tag('standing')])).toBe(2)
    expect(handUsage([])).toBe(0)
  })

  it('容量是 2', () => {
    expect(HAND_CAPACITY).toBe(2)
  })
})

describe('冲突检测', () => {
  it('同组两个标签算冲突，并带上组信息', () => {
    const clashes = conflictsIn([tag('sitting'), tag('standing')])
    expect(clashes).toHaveLength(1)
    expect(clashes[0].group.key).toBe('pose')
    expect(clashes[0].tags.map((t) => t.en)).toEqual(['sitting', 'standing'])
  })

  it('不同组各算一处冲突', () => {
    const clashes = conflictsIn([tag('sitting'), tag('standing'), tag('smile'), tag('angry')])
    expect(clashes.map((c) => c.group.key).sort()).toEqual(['face', 'pose'])
  })

  it('每组只有一个标签、或者没有互斥标签时不算冲突', () => {
    expect(conflictsIn([tag('sitting'), tag('smile'), tag('sword')])).toEqual([])
    expect(conflictsIn([])).toEqual([])
  })
})
