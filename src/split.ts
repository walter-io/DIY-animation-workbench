import type { HostClip, Instance, Project } from './types'
import { isSubtitle, MIN_SUBTITLE_DURATION, renumberSubtitles } from './subtitleTrack'
import { MIN_HOST_TRACK, splitHostTrack } from './hostTrack'

/**
 * 通用剪刀工具（split / 切开）。
 *
 * 用户直觉：选中时间轴上任意轨道里的一段素材，把播放头拖到它中间，
 * 点「✂️ 切开」或按 S —— 素材在播放头位置被复制成两段：
 *   前段以切口结尾，后段以切口开始，其余属性两条都复制。
 *
 * 这里只放纯函数（不依赖 React / store），方便脚本直接验证行为。
 * store 的 `splitAt` action 只是薄薄地调一下 applySplit。
 */

const r2 = (n: number) => Math.round(n * 100) / 100

/** 当前选中了什么（供 findSplitTarget / applySplit 判定切开对象） */
export type SplitSelection = {
  selectedId: string | null
  selectedHostClipId: string | null
  selectedHostTrackId: string | null
}

/** 可切开对象的判别联合 */
export type SplitTarget =
  | { kind: 'instance'; id: string }
  | { kind: 'hostClip'; id: string }
  | { kind: 'hostTrack'; id: string }

/** 非字幕的普通卡/素材切得再细也不至于看不见，最短 0.05s 兜底 */
const MIN_INSTANCE = 0.05

function inside(start: number, duration: number, min: number, t: number): boolean {
  return t > start + min && t < start + duration - min
}

/** 切开一张卡（字幕 / 动效卡通用）：前段留原 id，后段拿新 id */
export function splitInstance(
  inst: Instance,
  at: number,
  makeId: () => string,
): [Instance, Instance] | null {
  const min = isSubtitle(inst) ? MIN_SUBTITLE_DURATION : MIN_INSTANCE
  if (!inside(inst.start, inst.duration, min, at)) return null
  const end = inst.start + inst.duration
  const front: Instance = { ...inst, duration: r2(at - inst.start) }
  const back: Instance = {
    ...inst,
    id: makeId(),
    start: r2(at),
    duration: r2(end - at),
    params: { ...inst.params },
  }
  return [front, back]
}

/** 切开一个机位段：前段留原 id，后段拿新 id */
export function splitHostClip(
  clip: HostClip,
  at: number,
  makeId: () => string,
): [HostClip, HostClip] | null {
  if (!inside(clip.start, clip.duration, MIN_HOST_TRACK, at)) return null
  const end = clip.start + clip.duration
  const front: HostClip = { ...clip, duration: r2(at - clip.start) }
  const back: HostClip = { ...clip, id: makeId(), start: r2(at), duration: r2(end - at) }
  return [front, back]
}

/**
 * 判定播放头处能切开谁。优先级：选中的卡 > 选中的机位段 > 选中的素材条。
 * 三者 UI 上通常会互斥选中，但万一同时选了两个，这里取最细粒度的一个。
 */
export function findSplitTarget(
  project: Project,
  sel: SplitSelection,
  t: number,
): SplitTarget | null {
  if (sel.selectedId) {
    const inst = project.instances.find((i) => i.id === sel.selectedId)
    if (inst && splitInstance(inst, t, () => '') !== null) return { kind: 'instance', id: inst.id }
  }
  if (sel.selectedHostClipId) {
    const clip = project.hostClips.find((c) => c.id === sel.selectedHostClipId)
    if (clip && splitHostClip(clip, t, () => '') !== null) return { kind: 'hostClip', id: clip.id }
  }
  if (sel.selectedHostTrackId) {
    const track = (project.hostTracks ?? []).find((tk) => tk.id === sel.selectedHostTrackId)
    if (track && splitHostTrack(track, t, () => '') !== null) return { kind: 'hostTrack', id: track.id }
  }
  return null
}

export type SplitResult = {
  project: Project
  selectedId: string | null
  selectedHostClipId: string | null
  selectedHostTrackId: string | null
}

/**
 * 执行切开。切完后选中「后段」（即切口之后那段），符合"刚切完接着处理下一段"的习惯。
 * 返回 null = 当前播放头处没有可切开的东西。
 */
export function applySplit(
  project: Project,
  sel: SplitSelection,
  t: number,
  makeId: () => string,
): SplitResult | null {
  const target = findSplitTarget(project, sel, t)
  if (!target) return null

  if (target.kind === 'instance') {
    const inst = project.instances.find((i) => i.id === target.id)
    if (!inst) return null
    const parts = splitInstance(inst, t, makeId)
    if (!parts) return null
    let instances = project.instances.flatMap((i) => (i.id === target.id ? parts : [i]))
    // 字幕卡切开后两句文案相同、名字也撞了，重排一下自动编号
    if (isSubtitle(inst)) instances = renumberSubtitles(instances)
    return {
      project: { ...project, instances },
      selectedId: parts[1].id,
      selectedHostClipId: sel.selectedHostClipId,
      selectedHostTrackId: sel.selectedHostTrackId,
    }
  }

  if (target.kind === 'hostClip') {
    const clip = project.hostClips.find((c) => c.id === target.id)
    if (!clip) return null
    const parts = splitHostClip(clip, t, makeId)
    if (!parts) return null
    return {
      project: {
        ...project,
        hostClips: project.hostClips.flatMap((c) => (c.id === target.id ? parts : [c])),
      },
      selectedId: sel.selectedId,
      selectedHostClipId: parts[1].id,
      selectedHostTrackId: sel.selectedHostTrackId,
    }
  }

  const track = (project.hostTracks ?? []).find((tk) => tk.id === target.id)
  if (!track) return null
  const parts = splitHostTrack(track, t, makeId)
  if (!parts) return null
  return {
    project: {
      ...project,
      hostTracks: (project.hostTracks ?? []).flatMap((tk) => (tk.id === target.id ? parts : [tk])),
    },
    selectedId: sel.selectedId,
    selectedHostClipId: sel.selectedHostClipId,
    selectedHostTrackId: parts[1].id,
  }
}
