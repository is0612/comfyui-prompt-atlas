import type { SlotTag } from '../types'

export interface ExclusiveGroup {
  key: string
  label: string
  members: string[]
}

/**
 * 同一槽内互斥的标签组。
 * 只收语义上真的不能共存的词：姿态、视线、景别、视角、表情。
 * 道具、手势、服装故意不收 —— 那些叠加是常态。
 */
export const EXCLUSIVE_GROUPS: ExclusiveGroup[] = [
  {
    key: 'pose',
    label: '姿态',
    members: [
      'standing', 'sitting', 'seiza', 'lying', 'on_back', 'on_stomach',
      'squatting', 'crouching', 'kneeling', 'walking', 'running', 'jumping',
      'dancing', 'sleeping', 'floating',
    ],
  },
  {
    key: 'gaze',
    label: '视线',
    members: [
      'looking_at_viewer', 'looking_up', 'looking_down', 'looking_to_the_side',
      'looking_away', 'head_down',
    ],
  },
  {
    key: 'shot',
    label: '景别',
    members: ['close-up', 'portrait', 'upper_body', 'cowboy_shot', 'full_body', 'wide_shot'],
  },
  {
    key: 'angle',
    label: '视角',
    members: ['from_above', 'high_angle', 'from_below', 'low_angle', 'dutch_angle', 'tilted_frame'],
  },
  {
    key: 'face',
    label: '表情',
    members: [
      'smile', 'gentle_smile', 'grin', 'angry', 'pout', 'crying', 'tears',
      'surprised', 'expressionless', 'emotionless',
    ],
  },
  {
    key: 'facing',
    label: '朝向',
    members: ['from_behind', 'from_side', 'profile', 'facing_away', 'back'],
  },
  {
    key: 'outfit',
    label: '整体装束',
    members: [
      'serafuku', 'sailor_collar', 'school_uniform', 'maid', 'military_uniform',
      'police_uniform', 'labcoat', 'nurse', 'kimono', 'yukata', 'china_dress',
      'qipao', 'hanfu', 'gothic_lolita', 'wedding_dress', 'magical_girl',
      'swimsuit', 'one-piece_swimsuit', 'bikini', 'school_swimsuit', 'plugsuit',
      'miko', 'pirate', 'jester', 'idol',
    ],
  },
]

const GROUP_INDEX = new Map<string, ExclusiveGroup>()
for (const group of EXCLUSIVE_GROUPS) {
  for (const member of group.members) GROUP_INDEX.set(member, group)
}

/** 一个标签可能写多个英文 token，命中任一就算属于该组 */
export function groupOf(en: string): ExclusiveGroup | null {
  for (const token of en.split(',')) {
    const hit = GROUP_INDEX.get(token.trim().toLowerCase())
    if (hit) return hit
  }
  return null
}

export interface Clash {
  group: ExclusiveGroup
  tags: SlotTag[]
}

/** 找出一个槽里同组重复的标签 */
export function conflictsIn(tags: SlotTag[]): Clash[] {
  const buckets = new Map<string, SlotTag[]>()
  for (const tag of tags) {
    const group = groupOf(tag.en)
    if (!group) continue
    const list = buckets.get(group.key) ?? []
    list.push(tag)
    buckets.set(group.key, list)
  }
  const out: Clash[] = []
  for (const [key, list] of buckets) {
    if (list.length < 2) continue
    const group = EXCLUSIVE_GROUPS.find((g) => g.key === key)
    if (group) out.push({ group, tags: list })
  }
  return out
}

/** 一个人只有两只手 */
export const HAND_CAPACITY = 2

const HAND_COST = new Map<string, number>()

function cost(members: string[], value: number) {
  for (const member of members) HAND_COST.set(member, value)
}

// 两只手都占住
cost(
  ['crossed_arms', 'own_hands_together', 'praying', 'stretching', 'arms_up', 'heart_hands', 'holding_bouquet', 'hug', 'hugging', 'playing_instrument'],
  2,
)
// 只占一只手
cost(
  [
    'waving', 'hand_up', 'hand_on_own_cheek', 'hand_in_hair', 'playing_with_hair', 'finger_to_mouth',
    'holding_flower', 'holding_sword', 'holding_katana', 'holding_spear', 'holding_bow', 'holding_staff',
    'holding_umbrella', 'reading', 'holding_book', 'drinking_tea', 'holding_cup', 'holding_hands',
    'holding_handgun', 'holding_fan', 'salute',
  ],
  1,
)

/** 这个标签占几只手；一个标签写多个 token 时取最大值 */
export function handCost(en: string): number {
  let max = 0
  for (const token of en.split(',')) {
    const value = HAND_COST.get(token.trim().toLowerCase()) ?? 0
    if (value > max) max = value
  }
  return max
}

export function handUsage(tags: SlotTag[]): number {
  return tags.reduce((sum, tag) => sum + handCost(tag.en), 0)
}
