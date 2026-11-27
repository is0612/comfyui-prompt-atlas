/** 角色：图鉴的主对象，一条 = 一张角色卡 */
export interface Character {
  /** 中文名 */
  zh: string
  /** 英文 tag，同时作为唯一键 */
  en: string
  /** 所属游戏 / 作品，任意字符串，界面自动聚合成页签 */
  game: string
  /** 体型 */
  body?: string
  /** 发型发色（中文） */
  hair?: string
  /** 瞳色（中文） */
  eyes?: string
  /** 默认服装（中文） */
  outfit?: string
  /** 标志性特征（中文） */
  traits?: string
  /** 英文外观标签，逗号分隔 */
  tags?: string
  /**
   * 卡片头像文件名，对应 public/avatars 下的图（不带扩展名）。
   * 留空就退回按发色渲染的渐变块，所以老数据 / 自定义角色不用补。
   */
  avatar?: string
  /** 备注 */
  note?: string
}

/** 通用补充标签：外形 / 服装 / 动作 / 道具 / 场景 / 风格 */
export const CATEGORIES = ['外形', '服装', '动作', '道具', '场景', '风格', '自定义'] as const
export type Category = (typeof CATEGORIES)[number]

export interface TagItem {
  zh: string
  en: string
  cat: Category
  sub?: string
  nsfw?: boolean
}

export type Density = 'lite' | 'normal' | 'rich'
export type Target = 'moss' | 'wai' | 'pony'

export interface Settings {
  /** 输出时带上角色自带的外观标签 */
  withAppearance: boolean
  /** 正向命中特殊词时剔除冲突负向 */
  adaptiveNeg: boolean
  /** 只有一个角色时追加防克隆负向 */
  antiClone: boolean
  /** 隐藏标记 nsfw 的词条 */
  hideNsfw: boolean
  /** 同一槽内姿态 / 视线 / 景别 / 视角 / 表情互斥，新的替换旧的 */
  autoReplace: boolean
  /** 整体装束（和服 / 泳装 / 女仆装…）也只留一套 */
  outfitReplace: boolean
  /** 一个槽最多两只手，超了顶掉最旧的手部动作 */
  handBudget: boolean
  density: Density
  /** AI 润色：OpenAI 兼容接口 */
  aiBase: string
  aiModel: string
  aiKey: string
  aiSystem: string
}

/** 挂在角色槽或全局里的一个标签 */
export interface SlotTag {
  zh: string
  en: string
  /** 权重，1 = 不加权；输出成 (tag:1.2) */
  w?: number
}

export interface PromptPair {
  positive: string
  negative: string
}

export type Outputs = Record<Target, PromptPair>

export interface HistoryEntry {
  id: string
  time: number
  chars: string[]
  /** 全局标签；早期版本存的是纯 en 字符串 */
  tags: (SlotTag | string)[]
  /** 角色槽：en -> 标签（早期版本是纯 en 字符串） */
  slots: Record<string, (SlotTag | string)[]>
  moss: string
  wai: string
  pony: string
}
