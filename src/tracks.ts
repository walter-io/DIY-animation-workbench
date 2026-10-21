import type { CardFit, Instance, SlotId } from './types'
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

/** 槽位尝试顺序（左右中下上）：新卡默认槽位被占了，就按这个顺序另找一块地方 */
export const SLOT_ORDER: SlotId[] = ['left', 'right', 'center', 'bottom', 'top']

/** 两条卡的时间区间是否重叠（0.01s 容差，与 lint 体检器同一口径） */
export function timeOverlap(aStart: number, aDur: number, bStart: number, bDur: number): boolean {
  return aStart < bStart + bDur - 0.01 && bStart < aStart + aDur - 0.01
}

/** 轨道尝试顺序：先默认轨道，再从 1 号往上找（轨道号越小越靠上，新卡优先落在上层） */
function laneOrder(preferred: number, maxLane: number): number[] {
  const out = [preferred]
  for (let lane = 1; lane <= Math.max(1, maxLane); lane += 1) {
    if (lane !== preferred) out.push(lane)
  }
  return out
}

export type Placement = { slot: SlotId; track: number; start: number }

/**
 * 给新卡挑一个"不压在已有卡身上"的落位。
 *
 * 背景（用户反馈）：从库里连点几张卡，新卡会和已有的卡落在**同一条轨道**上、
 * 时段也重叠 —— 时间轴上两条卡条完全叠在一起（后画的盖住先画的），
 * 画布上也是同一块地方硬压。根因是 addInstance 直接写死 start=播放头、
 * track=槽位默认轨道，完全没看这块地方有没有人。
 *
 * 规则（按顺序试，第一组不冲突的落位就用它）：
 *   1. 默认槽位 + 它的默认轨道（绝大多数情况走到这里，行为与过去一致）；
 *   2. 同槽位换一条**这段时段空闲**的轨道（换轨道就不算叠在同一行）；
 *   3. 换一个空闲槽位（同槽位被占了，说明画布上这块地方有人）再走 1、2；
 *   4. 实在挤不下 → 顺延时间：往后挪到最近一个空档（保持默认槽位/轨道）。
 *
 * 冲突判定：
 *   - 轨道冲突：任一非字幕卡与它同轨道且时间重叠（时间轴会叠行）；
 *   - 画面冲突：同槽位的两张"非铺满卡"时间重叠（画布上互相压）。
 *     铺满卡不参与画面冲突 —— 它铺的是整屏，本身就是拿来垫底/压在别人身上的，
 *     层级由轨道决定；但两张铺满卡之间算冲突（整屏就一块地方，只能一前一后）。
 *
 * @param maxLane 现有轨道条数上限（不允许凭空造新轨道）
 */
export function pickPlacement(
  instances: Instance[],
  cand: { start: number; duration: number; fit: CardFit; slots: SlotId[] },
  maxLane: number,
): Placement {
  const cards = instances.filter((i) => !isSubtitle(i))
  const dur = Math.max(0.1, cand.duration)
  const naturalSlot = cand.slots[0] ?? 'center'
  const naturalLane = SLOT_TRACK[naturalSlot] ?? 1

  /** 画布上这块地方这段时段有人吗 */
  const regionTaken = (slot: SlotId, start: number) =>
    cards.some((i) => {
      if (!timeOverlap(start, dur, i.start, i.duration)) return false
      if (cand.fit === 'full' && i.fit === 'full') return true
      if (cand.fit === 'full' || i.fit === 'full') return false
      return i.slot === slot
    })

  /** 这条轨道这段时段有人吗 */
  const laneTaken = (lane: number, start: number) =>
    cards.some((i) => laneOf(i) === lane && timeOverlap(start, dur, i.start, i.duration))

  const start = Math.max(0, cand.start)
  for (const slot of cand.slots) {
    if (regionTaken(slot, start)) continue
    for (const lane of laneOrder(SLOT_TRACK[slot] ?? 1, maxLane)) {
      if (laneTaken(lane, start)) continue
      return { slot, track: lane, start }
    }
  }

  // 这一时刻全占满了：往后顺延，直到默认槽位 / 默认轨道都空出来（保持"一页接一页"的直觉）
  let queued = start
  for (let guard = 0; guard < 64; guard += 1) {
    const blockers = cards.filter(
      (i) =>
        timeOverlap(queued, dur, i.start, i.duration) &&
        (laneOf(i) === naturalLane || (i.fit !== 'full' && i.slot === naturalSlot)),
    )
    if (!blockers.length) break
    const next = Math.max(...blockers.map((i) => i.start + i.duration))
    if (next <= queued + 0.001) break
    queued = next
  }
  return { slot: naturalSlot, track: naturalLane, start: queued }
}
