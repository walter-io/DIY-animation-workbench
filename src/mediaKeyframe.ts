import type { ClipVisual, ImageClip, KeyframeEase, MediaKeyframe } from './types'

/** 关键帧补间缓动（独立于动效卡的 EasingId，取值更基础） */
export function applyKeyframeEasing(t: number, ease: KeyframeEase = 'smooth'): number {
  const x = Math.max(0, Math.min(1, t))
  switch (ease) {
    case 'linear':
      return x
    case 'ease-in':
      return x * x
    case 'ease-out':
      return 1 - (1 - x) * (1 - x)
    case 'smooth':
    default:
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
  }
}

export type { ClipVisual }

/** 片段自身那一份静态属性（关键帧之外的兜底值） */
export function baseVisual(clip: ImageClip): ClipVisual {
  return {
    x: clip.x,
    y: clip.y,
    w: clip.w,
    h: clip.h,
    opacity: clip.opacity,
    radius: clip.radius,
    focalX: clip.focalX,
    focalY: clip.focalY,
    zoom: clip.zoom,
  }
}

export function kfToVisual(k: MediaKeyframe): ClipVisual {
  return {
    x: k.x,
    y: k.y,
    w: k.w,
    h: k.h,
    opacity: k.opacity,
    radius: k.radius,
    focalX: k.focalX,
    focalY: k.focalY,
    zoom: k.zoom,
  }
}

/** 把"此刻的外观"固化成一个关键帧（参数面板「＋ 关键帧」用） */
export function visualToKf(t: number, v: ClipVisual, ease: KeyframeEase = 'smooth'): MediaKeyframe {
  return { t, ...v, ease }
}

function lerp(a: number, b: number, m: number) {
  return a + (b - a) * m
}

function lerpVisual(a: ClipVisual, b: ClipVisual, m: number): ClipVisual {
  return {
    x: lerp(a.x, b.x, m),
    y: lerp(a.y, b.y, m),
    w: lerp(a.w, b.w, m),
    h: lerp(a.h, b.h, m),
    opacity: lerp(a.opacity, b.opacity, m),
    radius: lerp(a.radius, b.radius, m),
    focalX: lerp(a.focalX, b.focalX, m),
    focalY: lerp(a.focalY, b.focalY, m),
    zoom: lerp(a.zoom, b.zoom, m),
  }
}

/**
 * 求片段在"片段内第 localTime 秒"时的实际外观。
 * 没有关键帧 → 用静态属性；有一个 → 恒定不变；多个 → 相邻两帧之间按后一帧的 ease 插值。
 */
export function sampleClipVisual(clip: ImageClip, localTime: number): ClipVisual {
  const keys = [...(clip.keyframes ?? [])].sort((a, b) => a.t - b.t)
  if (keys.length === 0) return baseVisual(clip)
  if (keys.length === 1) return kfToVisual(keys[0])
  const t = Math.max(0, localTime)
  if (t <= keys[0].t) return kfToVisual(keys[0])
  const last = keys[keys.length - 1]
  if (t >= last.t) return kfToVisual(last)
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      const raw = span <= 0 ? 1 : (t - a.t) / span
      return lerpVisual(kfToVisual(a), kfToVisual(b), applyKeyframeEasing(raw, b.ease ?? 'smooth'))
    }
  }
  return baseVisual(clip)
}

/** 视频片段：播放头落在片段内时源视频该播第几秒；不在区间内返回 null */
export function clipSourceTime(clip: ImageClip, currentTime: number): number | null {
  if (currentTime < clip.start || currentTime > clip.start + clip.duration) return null
  const src = (clip.trimIn ?? 0) + (currentTime - clip.start)
  const total = clip.sourceDuration
  if (total && total > 0) return Math.max(0, Math.min(src, total - 0.001))
  return Math.max(0, src)
}
