import type { Instance, SlotId } from './types'
import { isSubtitle } from './subtitleTrack'

/** slot（画布左/右/中/下/上）→ 默认所在通用轨道号（字幕轨是第 0 条，所以动效卡从 1 起算） */
export const SLOT_TRACK: Record<SlotId, number> = {
  left: 1,
  right: 2,
  center: 3,
  bottom: 4,
  top: 5,
}

/**
 * 一条卡落在第几行（0 = 字幕轨）。
 * 优先用显式 track（拖拽换轨道写入的），没写就按 slot 反推一个默认行。
 * track 与 slot 是解耦的：track = 时间轴上的行，slot = 画布上的左右/居中位置。
 */
export function laneOf(inst: Instance): number {
  if (isSubtitle(inst)) return 0
  return inst.track ?? SLOT_TRACK[inst.slot] ?? 1
}

/**
 * 轨道层级（画布 z-index）：**轨道号越小 = 越靠上 = 越优先显示**，会盖住下面的轨道。
 * 时间轴和画布共用这一个口径，避免"轨道1盖住轨道2"在两边表现不一致。
 * 字幕轨是 0 号，天然压在最上面（ActiveCard 里还有一层 SUBTITLE_Z 兜底）。
 */
export function trackZIndex(track: number, maxTrack: number): number {
  return 20 + Math.max(0, maxTrack - track)
}
