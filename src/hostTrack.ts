import type { HostTrack } from './types'

/**
 * 出镜素材条：把出镜视频当剪映里的一条媒体素材来管。
 *
 * 素材条在项目时间轴上占 [start, start+duration] 这一段，
 * 这段里放的是源视频的 [trimIn, trimIn+duration] 那一截 ——
 * 拖素材左边缘 = 改入点（把开头裁掉），拖右边缘 = 改出点，拖整体 = 改它出现的时刻。
 *
 * 剪刀工具「切开」会把它复制成相邻的两段，所以一个工程里可以有多条素材条
 * （同一源视频切成多段、中间挖洞都靠这个）。每条都有独立 id，选中/拖拽/切开都按 id 定位。
 *
 * 关键约定：**播放头时间 ≠ 视频内部时间**。中间隔着 start 平移与 trimIn 偏移，
 * 换算统一走 `hostSourceTime`，预览渲染与逐帧导出都用它，两边才不会错位。
 */

/** 素材最短长度（秒）：再短就拖不动、也没法看了 */
export const MIN_HOST_TRACK = 0.2

const round = (v: number) => Math.round(v * 100) / 100

let hostTrackSeq = 0
/** 生成一条素材条的唯一 id（时间戳 + 自增，够用且可读） */
export function hostTrackId(): string {
  return `ht_${Date.now().toString(36)}_${(hostTrackSeq++).toString(36)}`
}

/**
 * 播放头时间 → 出镜视频内部时间。
 *
 * @param tracks 素材条列表（可多条）
 * @returns 视频该显示第几秒；null = 此刻不在任何素材区间内（画面不显示）
 *
 * 没配素材条（空数组 / undefined）时返回原时间：老工程是"视频和项目 1:1 对齐、全程出镜"，
 * 这个返回值保证了升级上来的工程行为完全不变。
 */
export function hostSourceTime(tracks: HostTrack[] | undefined, t: number): number | null {
  if (!tracks || tracks.length === 0) return t
  for (const track of tracks) {
    const end = track.start + track.duration
    if (t >= track.start && t <= end) return t - track.start + track.trimIn
  }
  return null
}

/** 出点：源视频取到第几秒（= 入点 + 用了多长） */
export function hostTrimOut(track: HostTrack): number {
  return track.trimIn + track.duration
}

/** 导入视频时用探测到的时长建一条"整段全用"的素材条 */
export function defaultHostTrack(sourceDuration: number): HostTrack {
  const dur = Math.max(MIN_HOST_TRACK, sourceDuration)
  return { id: hostTrackId(), start: 0, duration: dur, trimIn: 0, sourceDuration: dur }
}

/**
 * 读旧工程 / 导入 JSON 时的兜底：字段缺了或越界就夹回合法范围。
 * 源时长还没探测到（=0）时返回 undefined，此时按老工程处理。
 * id 缺失时补一个，保证每条素材条都能被独立选中/切开。
 */
export function normalizeHostTrack(raw: unknown): HostTrack | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const t = raw as Partial<HostTrack>
  if (typeof t.start !== 'number' || typeof t.duration !== 'number') return undefined
  // 源时长没探测到就整条作废：此时按老工程处理（视频与项目 1:1），
  // 比拿一个 0 时长硬凑出条"看不见的素材"要好懂得多。
  const sourceDuration = typeof t.sourceDuration === 'number' ? t.sourceDuration : 0
  if (!(sourceDuration > 0)) return undefined
  const trimIn = Math.max(0, Math.min(typeof t.trimIn === 'number' ? t.trimIn : 0, sourceDuration - MIN_HOST_TRACK))
  const maxDur = Math.max(MIN_HOST_TRACK, sourceDuration - trimIn)
  return {
    id: typeof t.id === 'string' && t.id ? t.id : hostTrackId(),
    start: Math.max(0, t.start),
    duration: Math.max(MIN_HOST_TRACK, Math.min(t.duration, maxDur)),
    trimIn: round(trimIn),
    sourceDuration,
  }
}

/**
 * 把「单条素材条 or 多条素材条 or 什么都没有」统一成数组。
 * 兼容旧工程：旧字段 hostTrack 是单条，这里包成数组搬进 hostTracks。
 */
export function normalizeHostTracks(raw: unknown): HostTrack[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => normalizeHostTrack(x)).filter((x): x is HostTrack => x != null)
  }
  const single = normalizeHostTrack(raw)
  return single ? [single] : []
}

/**
 * 剪刀切开素材条：在播放头（项目时间 at）处一刀两段。
 *
 * - 前段：保持原起点与入点，长度收到切口为止（结尾 = at）
 * - 后段：起点 = at，入点往后顺延（源视频接着前段取），长度 = 剩余
 * - 两条都复制 sourceDuration 等其余字段；前段沿用原 id，后段拿新 id
 *
 * @returns [前段, 后段]；切口离任一端太近（切不出两条最小时长）时返回 null
 */
export function splitHostTrack(
  track: HostTrack,
  at: number,
  makeId: () => string = hostTrackId,
): [HostTrack, HostTrack] | null {
  const end = track.start + track.duration
  if (at <= track.start + MIN_HOST_TRACK || at >= end - MIN_HOST_TRACK) return null
  const offset = at - track.start
  const front: HostTrack = { ...track, duration: round(offset) }
  const back: HostTrack = {
    ...track,
    id: makeId(),
    start: round(at),
    duration: round(end - at),
    trimIn: round(track.trimIn + offset),
  }
  return [front, back]
}

/**
 * 拖素材条左边缘：起点与入点一起走，出点不动 —— 素材变短，开头被裁掉。
 * 往左拖则是把之前裁掉的部分还回来（受限于入点 0 与项目 0，不会还原出负数）。
 *
 * @param ds 位移（秒），正数 = 往右拖（裁掉更多开头）
 */
export function trimHostStart(track: HostTrack, ds: number): HostTrack {
  // 往左最多还原到「入点归零」或「素材贴到项目开头」，取更小的那个
  const lo = -Math.min(track.trimIn, track.start)
  const hi = track.duration - MIN_HOST_TRACK
  const d = Math.max(lo, Math.min(hi, ds))
  return {
    ...track,
    start: round(Math.max(0, track.start + d)),
    trimIn: round(Math.max(0, track.trimIn + d)),
    duration: round(track.duration - d),
  }
}

/**
 * 拖素材条右边缘：只改长度（出点 = 入点 + 长度）。
 * 受限于源视频剩余长度，不会裁出素材本身没有的画面。
 */
export function trimHostEnd(track: HostTrack, ds: number): HostTrack {
  const maxDur = Math.max(MIN_HOST_TRACK, track.sourceDuration - track.trimIn)
  const lo = MIN_HOST_TRACK - track.duration
  const hi = maxDur - track.duration
  const d = Math.max(lo, Math.min(hi, ds))
  return { ...track, duration: round(track.duration + d) }
}

/** 拖素材条整体：只改它在项目里出现的时刻，裁剪区间原封不动 */
export function moveHostTrack(track: HostTrack, ds: number, projectDuration: number): HostTrack {
  const maxStart = Math.max(0, projectDuration - track.duration)
  return { ...track, start: round(Math.max(0, Math.min(maxStart, track.start + ds))) }
}
