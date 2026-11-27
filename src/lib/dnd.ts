import type { SlotTag } from '../types'

export const LIB_SLOT = '__lib__'

export interface DragPayload {
  /** 来源槽：LIB_SLOT = 从左下词库拖出来的，'' = 全局，其他 = 角色 en */
  from: string
  zh: string
  en: string
}

let current: DragPayload | null = null

export function startDrag(payload: DragPayload, event: DragEvent) {
  current = payload
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', payload.en)
}

export function readDrag(): DragPayload | null {
  return current
}

export function endDrag() {
  current = null
}

export function asSlotTag(tag: { zh: string; en: string }): SlotTag {
  return { zh: tag.zh, en: tag.en }
}
