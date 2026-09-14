import type { Instance, Params } from './types'
import { parseSrt, type SrtCue } from './srt'

/**
 * 字幕轨：口播字幕按「一句一张卡」组织。
 *
 * 设计约束（改这里之前先看这段）：
 *  1. 所有口播字幕卡共用一条轨道（Timeline 的第 1 条泳道），按 start 升序排列；
 *  2. 轨道内任意两张卡的时间区间不得重叠 —— 由 clampSubtitleRange / dedupeSubtitleTrack 保证；
 *  3. 每张卡自带文案（params.text），可以单独选中、改字、改时长、改位置、删除、新增。
 *
 * 这里只放纯函数（不依赖 React / store），方便脚本直接验证行为。
 */

export const SUBTITLE_EFFECT = 'srt-subtitle'
/** 单张字幕卡的最短时长（秒）：再短就点不中、拖不动了 */
export const MIN_SUBTITLE_DURATION = 0.2
/** 新增一张字幕卡的默认时长（秒） */
export const DEFAULT_SUBTITLE_DURATION = 2

/** 时间精度：秒 → 3 位小数（毫秒），避免浮点尾数让相邻卡片看起来重叠 */
const r3 = (n: number) => Math.round(n * 1000) / 1000

export function isSubtitle(i: Instance): boolean {
  return i.effectId === SUBTITLE_EFFECT || i.name.includes('口播字幕')
}

/** 字幕卡自带文案（拆分后的新格式）；老格式是整轨 SRT 存在 params.srt 里 */
export function subtitleTextOf(i: Instance): string {
  return String(i.params?.text ?? '')
}

/** 轨道上的字幕卡，按时间顺序排列（起点相同时保持工程里的先后顺序） */
export function subtitleTrack(instances: Instance[]): Instance[] {
  return instances
    .map((inst, index) => ({ inst, index }))
    .filter((x) => isSubtitle(x.inst))
    .sort((a, b) => a.inst.start - b.inst.start || a.index - b.index)
    .map((x) => x.inst)
}

export type TimeRange = { start: number; duration: number }

/**
 * 把一张字幕卡的目标区间夹到合法范围内：不早于上一句结尾，不晚于下一句开头。
 *
 * 空间不足以放下一张最小时长的卡时，返回它原来的区间（即拒绝这次改动）——
 * 宁可拖不动，也不制造重叠。
 */
export function clampSubtitleRange(
  instances: Instance[],
  id: string,
  next: Partial<TimeRange>,
): TimeRange {
  const track = subtitleTrack(instances)
  const k = track.findIndex((i) => i.id === id)
  const current = track[k]
  if (k < 0 || !current) {
    return { start: r3(next.start ?? 0), duration: Math.max(MIN_SUBTITLE_DURATION, next.duration ?? DEFAULT_SUBTITLE_DURATION) }
  }

  const min = k > 0 ? track[k - 1].start + track[k - 1].duration : 0
  const max = k < track.length - 1 ? track[k + 1].start : Number.POSITIVE_INFINITY
  const room = Number.isFinite(max) ? max - min : Number.POSITIVE_INFINITY
  if (room < MIN_SUBTITLE_DURATION - 1e-6) {
    return { start: r3(current.start), duration: r3(current.duration) }
  }

  const wantStart = Number.isFinite(next.start) ? (next.start as number) : current.start
  const wantDuration = Number.isFinite(next.duration)
    ? Math.max(MIN_SUBTITLE_DURATION, next.duration as number)
    : current.duration

  const latestStart = Number.isFinite(max) ? max - MIN_SUBTITLE_DURATION : Number.POSITIVE_INFINITY
  let start = Math.min(Math.max(wantStart, min), Math.max(min, latestStart))
  let duration = wantDuration
  if (Number.isFinite(max) && start + duration > max) {
    // 顶到下一句了：先试着把整张卡往回挪（保住时长 —— 拖动时用户要的是"挪位置"），
    // 实在挪不动（比如是在拉长时长）再截断时长。
    const pulled = max - duration
    if (pulled >= min) start = pulled
    else duration = Math.max(MIN_SUBTITLE_DURATION, max - start)
  }

  return { start: r3(start), duration: r3(duration) }
}

/**
 * 让整条字幕轨变得「按时间有序且不重叠」：
 * 起点早于游标的一律推到游标之后，越过下一句起点的截断。
 */
export function normalizeSubtitleTrack(instances: Instance[], projectDuration?: number): Instance[] {
  const track = subtitleTrack(instances)
  if (track.length === 0) return instances
  const next = new Map<string, TimeRange>()
  let cursor = 0
  for (let i = 0; i < track.length; i++) {
    const cur = track[i]
    const following = track[i + 1]
    const start = Math.max(cursor, cur.start)
    const limit = following ? following.start : projectDuration
    const ceiling =
      limit != null && Number.isFinite(limit) && limit > 0
        ? Math.max(start + MIN_SUBTITLE_DURATION, limit)
        : Number.POSITIVE_INFINITY
    let end = Math.max(start + MIN_SUBTITLE_DURATION, start + cur.duration)
    if (Number.isFinite(ceiling)) end = Math.min(end, ceiling)
    const duration = Math.max(MIN_SUBTITLE_DURATION, end - start)
    next.set(cur.id, { start: r3(start), duration: r3(duration) })
    cursor = start + duration
  }
  return instances.map((i) => {
    const range = next.get(i.id)
    return range ? { ...i, ...range } : i
  })
}

/** 一条轨上的相邻卡片真的没有重叠（供脚本自检用，容差 1ms） */
export function subtitleTrackHasOverlap(instances: Instance[]): boolean {
  const track = subtitleTrack(instances)
  for (let i = 1; i < track.length; i++) {
    const prevEnd = track[i - 1].start + track[i - 1].duration
    if (track[i].start < prevEnd - 0.001) return true
  }
  return false
}

export type SubtitlePlan = { text: string; start: number; duration: number }

/**
 * SRT cue → 字幕卡计划（秒）。
 * 口播稿常常有重叠/回退的时间码，这里统一修成「按时间有序、互不重叠」。
 */
export function planSubtitleCards(cues: SrtCue[]): SubtitlePlan[] {
  const sorted = [...cues]
    .map((c, i) => ({ c, i }))
    .sort((a, b) => a.c.start - b.c.start || a.i - b.i)
    .map((x) => x.c)
  const plan: SubtitlePlan[] = sorted.map((c) => ({
    text: c.text.replace(/\r/g, '').replace(/\n+/g, ' ').trim(),
    start: Math.max(0, c.start / 1000),
    duration: Math.max(MIN_SUBTITLE_DURATION, (c.end - c.start) / 1000),
  }))
  // 起点早于上一句结尾 → 推到上一句之后
  let cursor = 0
  for (const p of plan) {
    p.start = Math.max(p.start, cursor)
    cursor = p.start + p.duration
  }
  // 结尾越过下一句起点 → 截断
  for (let i = 0; i < plan.length - 1; i++) {
    const limit = plan[i + 1].start - plan[i].start
    if (plan[i].duration > limit) plan[i].duration = Math.max(MIN_SUBTITLE_DURATION, limit)
  }
  return plan.map((p) => ({ text: p.text, start: r3(p.start), duration: r3(p.duration) }))
}

/** 字幕卡默认命名：口播字幕 01 / 02 … */
export function subtitleName(index: number): string {
  return `口播字幕 ${String(index + 1).padStart(2, '0')}`
}

const AUTO_NAME = /^口播字幕\s*\d+$/

/** 只重命名「没人动过」的字幕卡，用户自己改过的名字不动 */
export function renumberSubtitles(instances: Instance[]): Instance[] {
  const track = subtitleTrack(instances)
  const rename = new Map<string, string>()
  track.forEach((inst, i) => {
    if (AUTO_NAME.test(inst.name.trim())) rename.set(inst.id, subtitleName(i))
  })
  if (!rename.size) return instances
  return instances.map((i) => (rename.has(i.id) ? { ...i, name: rename.get(i.id)! } : i))
}

/** 用 SRT 计划生成一批字幕卡实例（id / 名称 / 时间都由这里定） */
export function buildSubtitleInstances(
  plan: SubtitlePlan[],
  base: Params,
  makeId: () => string,
): Instance[] {
  return plan.map((p, i) => ({
    id: makeId(),
    effectId: SUBTITLE_EFFECT,
    name: subtitleName(i),
    start: p.start,
    duration: p.duration,
    slot: 'bottom',
    fit: 'auto',
    paint: [],
    params: { ...base, text: p.text, srt: '' },
  }))
}

/**
 * 老格式迁移：一张装着整轨 SRT 的长卡 → 拆成一句一张卡。
 * 已经是新格式（有 params.text）或没有 SRT 内容时返回 null，可安全重复调用。
 */
export function splitLegacySubtitleInstance(
  inst: Instance,
  makeId: () => string,
): Instance[] | null {
  if (!isSubtitle(inst)) return null
  if (subtitleTextOf(inst).trim()) return null
  const raw = String(inst.params?.srt ?? '')
  if (!raw.trim()) return null
  const offset = inst.start * 1000
  const cues = parseSrt(raw).map((c) => ({ ...c, start: c.start + offset, end: c.end + offset }))
  const plan = planSubtitleCards(cues)
  if (!plan.length) return null
  const { srt: _legacy, ...rest } = inst.params
  return plan.map((p, i) => ({
    ...inst,
    id: makeId(),
    name: subtitleName(i),
    start: p.start,
    duration: p.duration,
    params: { ...rest, text: p.text, srt: '' },
  }))
}

export type InsertResult = { instances: Instance[]; id: string }

/**
 * 在字幕轨上插一张新卡：默认插在 afterId 那张之后（不传则追加到轨尾），
 * 后面的句子整体后移，保证依然不重叠。
 */
export function insertSubtitleCard(
  instances: Instance[],
  afterId: string | null,
  base: Params,
  makeId: () => string,
  opts: { text?: string; duration?: number } = {},
): InsertResult {
  const track = subtitleTrack(instances)
  const duration = Math.max(MIN_SUBTITLE_DURATION, opts.duration ?? DEFAULT_SUBTITLE_DURATION)
  const at = afterId ? track.findIndex((i) => i.id === afterId) : -1
  const start =
    at >= 0
      ? track[at].start + track[at].duration
      : track.length
        ? track[track.length - 1].start + track[track.length - 1].duration
        : 0
  const id = makeId()

  // 起点 >= 插入点的句子整体后移，让出新卡的位子
  const shifted = instances.map((i) => {
    if (!isSubtitle(i)) return i
    if (i.start < start - 0.001) return i
    return { ...i, start: r3(i.start + duration) }
  })

  const card: Instance = {
    id,
    effectId: SUBTITLE_EFFECT,
    name: subtitleName(track.length),
    start: r3(start),
    duration: r3(duration),
    slot: 'bottom',
    fit: 'auto',
    paint: [],
    params: { ...base, text: opts.text ?? '', srt: '' },
  }
  return { instances: renumberSubtitles(normalizeSubtitleTrack([...shifted, card])), id }
}
