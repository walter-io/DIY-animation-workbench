import { applyEasing } from './easing'
import { hostLayout, hostRects, type HostLayoutId, type Rect } from './hostLayouts'
import { hostSourceTime } from './hostTrack'
import type { EasingId, HostClip, HostConfig, Project } from './types'

/**
 * 机位关键帧解算（出镜画面的补间）。
 *
 * 背景：机位段（hostClips）本身就是关键帧 —— 每个段声明了「从这一刻起，出镜画面长什么样」。
 * 但之前只是用 find() 按时间点查到哪一段就直接用，段与段之间是硬切：
 * 半屏突然变成左下角小窗，卡片位置也跟着瞬移，看着很跳。
 *
 * 这里补上关键帧之间的插值：进入某一段时，在 transition 秒的窗口里，
 * 从「上一个关键帧的终态」平滑过渡到「本段的状态」，逐帧连续。
 * 因为解算只依赖 currentTime，导出时逐帧 seek 拿到的也是正确的中间态。
 */

/** 新建机位段时的默认过渡时长（秒） */
export const DEFAULT_HOST_TRANSITION = 0.6

/** 过渡时长滑竿的上限：再长就盖住大半个镜头了 */
export const MAX_HOST_TRANSITION = 2

export const HOST_EASE_OPTIONS: { id: EasingId; name: string; hint: string }[] = [
  { id: 'easeInOut', name: '平滑', hint: '两头慢中间快，最自然（默认）' },
  { id: 'easeOut', name: '快出', hint: '起步快、到位慢' },
  { id: 'easeOutQuart', name: '急停', hint: '冲过去然后迅速刹住' },
  { id: 'linear', name: '匀速', hint: '机械感，适合刻意的效果' },
]

export const DEFAULT_HOST_EASE: EasingId = 'easeInOut'

/** 读旧工程 / 导入 JSON 时兜底：只认 HOST_EASE_OPTIONS 里列过的几种 */
export function normalizeEase(v: unknown): EasingId {
  return HOST_EASE_OPTIONS.some((o) => o.id === v) ? (v as EasingId) : DEFAULT_HOST_EASE
}

/** 某一帧上出镜画面的完整状态（所有可插值属性都已解算到位） */
export type HostFrameState = {
  /** 当前归属的布局（决定 shape 语义与 layer；过渡中为目标布局） */
  layout: HostLayoutId
  /** 出镜画面矩形（画布像素，已插值） */
  frame: Rect
  /** 内容可用区（画布像素，已插值）—— 卡片在这个框里定位 */
  content: Rect
  /** 圆角（画布像素）：圆形 = min(w,h)/2，矩形 = 0，所以形状变化也能平滑过渡 */
  radius: number
  focalX: number
  focalY: number
  zoom: number
  opacity: number
  layer: 'back' | 'front'
  /** 补间进度 0~1；不在过渡窗口内时恒为 1 */
  mix: number
  /** 是否处于过渡窗口内（UI 提示用） */
  transitioning: boolean
  /** 过渡起点是谁：用于面板显示「从 X 过渡过来」 */
  fromLayout: HostLayoutId | null
  /** 当前生效的机位段 id（落在全局默认区间时为 null） */
  clipId: string | null
  /**
   * 出镜视频该显示第几秒（已算上素材条的起点与入点偏移）。
   * null = 播放头落在出镜素材区间之外，此刻没有出镜画面。
   * 预览与逐帧导出都读它，保证两边时间对得上。
   */
  srcTime: number | null
}

/** 一个关键帧：某个时刻出镜画面应该是什么样 */
type Keyframe = {
  t: number
  clipId: string | null
  layout: HostLayoutId
  focalX: number
  focalY: number
  zoom: number
  transition: number
  ease: EasingId
}

/** 关键帧解算成具体数值后的样子 */
type Resolved = {
  layout: HostLayoutId
  frame: Rect
  content: Rect
  radius: number
  focalX: number
  focalY: number
  zoom: number
  opacity: number
  layer: 'back' | 'front'
}

function lerp(a: number, b: number, m: number): number {
  return a + (b - a) * m
}

function lerpRect(a: Rect, b: Rect, m: number): Rect {
  return {
    x: lerp(a.x, b.x, m),
    y: lerp(a.y, b.y, m),
    w: lerp(a.w, b.w, m),
    h: lerp(a.h, b.h, m),
  }
}

/** 取某一段的过渡时长：段上没写就跟随工程默认 */
export function hostClipTransition(clip: HostClip | null, project: Project): number {
  if (!clip) return 0
  const v = clip.transition ?? project.hostTransition ?? DEFAULT_HOST_TRANSITION
  return Math.max(0, Math.min(MAX_HOST_TRANSITION, v))
}

/**
 * 关键帧序列：全局默认（t=0）+ 所有机位段，按起点排序。
 * 机位段之间的空隙本来就走全局默认，所以序列里不必插补空档 ——
 * 只要"落在哪一段"的判定与原来一致即可。
 */
function buildKeyframes(host: HostConfig, clips: HostClip[], project: Project): Keyframe[] {
  const base: Keyframe = {
    t: 0,
    clipId: null,
    layout: host.layout,
    focalX: host.focalX,
    focalY: host.focalY,
    zoom: host.zoom,
    transition: 0,
    ease: project.hostEase ?? DEFAULT_HOST_EASE,
  }
  const rest: Keyframe[] = clips.map((c) => ({
    t: c.start,
    clipId: c.id,
    layout: c.layout,
    focalX: c.focalX ?? host.focalX,
    focalY: c.focalY ?? host.focalY,
    zoom: c.zoom ?? host.zoom,
    transition: hostClipTransition(c, project),
    ease: c.ease ?? project.hostEase ?? DEFAULT_HOST_EASE,
  }))
  return [base, ...rest].sort((a, b) => a.t - b.t)
}

/** 把一个关键帧解算成具体数值（矩形按画布尺寸换成像素，形状换成圆角数值） */
function resolveKf(k: Keyframe, host: HostConfig, cw: number, ch: number, portrait: boolean): Resolved {
  const preset = hostLayout(k.layout)
  const { frame, content } = hostRects(
    k.layout,
    cw,
    ch,
    portrait,
    { x: host.x, y: host.y, w: host.w, h: host.h },
  )
  const shape = k.layout === 'custom' ? (host.circular ? 'circle' : 'rounded') : preset.shape
  // 圆形用 min(w,h)/2 表达，矩形用 0 —— 于是"圆 → 圆角卡 → 矩形"只是数值渐变，
  // 不需要对 shape 做离散切换，过渡才不会在中间某一帧突然变形。
  const radius =
    shape === 'circle'
      ? Math.min(frame.w, frame.h) / 2
      : k.layout === 'custom'
        ? host.radius
        : preset.radius
  return {
    layout: k.layout,
    frame,
    content,
    radius,
    focalX: k.focalX,
    focalY: k.focalY,
    zoom: k.zoom,
    // off 段本身不画出镜，用 opacity 0 表达，出场 / 入场走淡入淡出
    opacity: k.layout === 'off' ? 0 : host.opacity,
    layer: preset.layer,
  }
}

/**
 * off 态的形状是 0×0，直接插值会"从无到有长出来"，很怪。
 * 这里让 off 沿用对方的矩形与圆角，只用 opacity 表达显隐 ——
 * 于是「半屏 → 不显示」是原地淡出，「不显示 → 左下角」是在左下角淡入。
 */
function withOffBorrowed(a: Resolved, b: Resolved): [Resolved, Resolved] {
  const from: Resolved = a.layout === 'off' ? { ...a, frame: b.frame, radius: b.radius } : a
  const to: Resolved = b.layout === 'off' ? { ...b, frame: a.frame, radius: a.radius } : b
  return [from, to]
}

/**
 * layer（垫底 / 叠加）是离散的，没法插值。
 * 过渡期间只要有一方是 front 就全程用 front，避免小窗在过渡中途被卡片盖住一层；
 * 过渡结束再落到目标的 layer 上。
 */
function blendLayer(from: Resolved, to: Resolved, transitioning: boolean): 'back' | 'front' {
  if (!transitioning) return to.layer
  return from.layer === 'front' || to.layer === 'front' ? 'front' : 'back'
}

/**
 * 解算某一时刻的出镜画面状态。
 *
 * @param project 工程（读 host 全局设置与 hostClips 轨道）
 * @param currentTime 播放头位置（秒）
 * @param cw/ch 画布尺寸
 * @param portrait 是否竖屏
 */
export function resolveHostState(
  project: Project,
  currentTime: number,
  cw: number,
  ch: number,
  portrait: boolean,
): HostFrameState {
  const host = project.host
  const keys = buildKeyframes(host, project.hostClips, project)

  // 找到"最后一个起点不晚于 currentTime"的关键帧，它就是当前生效的那一帧
  let idx = 0
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i].t <= currentTime) idx = i
    else break
  }
  const cur = keys[idx]
  const target = resolveKf(cur, host, cw, ch, portrait)

  // 第 0 帧是全局默认（t=0），它没有"上一帧"，也就没有入场过渡
  let mix = 1
  let transitioning = false
  let fromLayout: HostLayoutId | null = null

  // cur.t === 0 的段（含起点就是 0 的第一段）没有"上一帧"可以过渡过来，
  // 它本身就是片头状态 —— 少了这个判断，t=0 会被误判成"正从全局默认过渡过来"。
  if (idx > 0 && cur.t > 0 && cur.transition > 0) {
    const prev = keys[idx - 1]
    const raw = (currentTime - cur.t) / cur.transition
    if (raw < 1) {
      transitioning = true
      mix = applyEasing(raw, cur.ease)
      fromLayout = prev.layout
    }
  }

  const prev = idx > 0 ? keys[idx - 1] : null
  const prevResolved = prev ? resolveKf(prev, host, cw, ch, portrait) : target
  const [from, to] = withOffBorrowed(prevResolved, target)

  const frame = transitioning ? lerpRect(from.frame, to.frame, mix) : to.frame
  const content = transitioning ? lerpRect(from.content, to.content, mix) : to.content

  return {
    layout: to.layout,
    frame,
    content,
    radius: transitioning ? lerp(from.radius, to.radius, mix) : to.radius,
    focalX: transitioning ? lerp(from.focalX, to.focalX, mix) : to.focalX,
    focalY: transitioning ? lerp(from.focalY, to.focalY, mix) : to.focalY,
    zoom: transitioning ? lerp(from.zoom, to.zoom, mix) : to.zoom,
    opacity: transitioning ? lerp(from.opacity, to.opacity, mix) : to.opacity,
    layer: blendLayer(from, to, transitioning),
    mix,
    transitioning,
    fromLayout,
    clipId: cur.clipId,
    srcTime: hostSourceTime(project.hostTracks, currentTime),
  }
}
