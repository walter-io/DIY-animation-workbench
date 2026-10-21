import { useEffect, useMemo, useRef, useState } from 'react'
import { useEditor, usePlayhead, subtitleRenderParams } from '../store'
import { skins, styleOptions, fontOptions, paletteVars } from '../themes'
import { cardSizeScale } from '../cardSize'
import { projectCanvasBg } from '../canvasBg'
import { isSubtitle } from '../subtitleTrack'
import type { CardFit, ImageClip, Instance, MediaAsset, Palette } from '../types'
import { defaultFitFor } from '../hyperframes/modes'
import {
  sampleCardVisual,
  visualToCardKf,
  cardVisualIsIdentity,
  measureCardFrame,
  type CardVisual,
} from '../cardKeyframe'
import HostLayer from './HostLayer'
import { useVideoSync, exportRateOf } from '../useVideoSync'
import type { Rect } from '../hostLayouts'
import { resolveHostState } from '../hostTween'
import { clipSourceTime, sampleClipVisual, visualToKf } from '../mediaKeyframe'
import { laneOf, trackZIndex } from '../tracks'

const CANVAS_W = 1920
const CANVAS_H = 1080
/** 卡槽内边距（画布坐标） */
const SLOT_MARGIN = 56
const BOTTOM_MARGIN = 72
/** 字幕层：高于动效卡（无 z-index）与出镜画面（最高 12），保证口播字幕永远在最上面 */
const SUBTITLE_Z = 50
/** 铺满模式的安全区留白 */
const FULL_PAD_X = 48
const FULL_PAD_Y = 40

/**
 * 编辑态（未播放、非导出）时播放头进度的最小值。
 *
 * 卡片组件的入场动画在 progress=0 时一律是全透明（实测各卡 opacity 均为 0），
 * 所以「刚加进来」或「播放头正好停在片段开头」时，画面上根本看不到这张卡 ——
 * 看不见就没法编排。这里把进度抬到能看清内容的位置；
 * 播放与导出仍用真实进度，动画本身不受影响。
 */
const EDIT_MIN_PROGRESS = 0.4

/** 入场动画的基准时长（秒）与左右进入的位移（画布像素） */
const ENTER_BASE_SEC = 0.5
const ENTER_SHIFT = 140

/**
 * 整卡入场变换。
 *
 * 按「卡片内已经过的秒数」而不是 progress 比例推进：
 * 按比例的话，10 秒的卡会比 2 秒的卡慢 5 倍，同一档速度在不同卡上手感完全不一样。
 */
function enterStyleFor(inst: Instance, progress: number): React.CSSProperties {
  const mode = inst.enter ?? 'fade'
  if (mode === 'none') return {}
  const speed = Math.max(0.2, Number(inst.enterSpeed ?? 1))
  const dur = Math.min(2, ENTER_BASE_SEC / speed)
  const elapsed = progress * (inst.duration || 1)
  const raw = Math.max(0, Math.min(1, elapsed / Math.max(0.01, dur)))
  const e = 1 - Math.pow(1 - raw, 3) // easeOutCubic
  const dx =
    mode === 'left' ? -ENTER_SHIFT * (1 - e) : mode === 'right' ? ENTER_SHIFT * (1 - e) : 0
  return {
    opacity: Number(e.toFixed(4)),
    ...(dx ? { transform: `translateX(${dx.toFixed(1)}px)` } : null),
  }
}

function fmtTime(t: number) {
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(1).padStart(4, '0')
  return `${m}:${s}`
}

/**
 * 统一尺寸解算：所有动效卡（含 hyperframes 全屏模板）走同一套逻辑，
 * 杜绝"有的卡全屏、有的卡小屏"以及宽高与文字比例互相打架的问题。
 *
 *  - full：铺满"内容可用区"（不是整块画布 —— 出镜画面占掉的部分要避开）
 *  - box ：固定宽高；内容按 1/scale 反向补偿后再 zoom，最终视觉尺寸恒等于 w×h
 *  - auto：宽高由内容决定，只受 maxWidth 约束
 *
 * @param box 内容可用区（画布像素）。由主持视频布局决定，没人出镜时 = 整块画布。
 * @param scale 内容整体缩放（单卡设置优先，否则取工程默认尺寸档）。full 档不参与。
 */
function resolveBox(
  inst: Instance,
  fit: CardFit,
  box: Rect,
  padX: number,
  padY: number,
  scale: number,
): { pos: React.CSSProperties; bodyW?: number; bodyH?: number } {
  const { x: bx, y: by, w: bw, h: bh } = box

  if (fit === 'full') {
    return {
      pos: { left: bx, top: by, width: bw, height: bh, padding: `${padY}px ${padX}px` },
      bodyW: bw - padX * 2,
      bodyH: bh - padY * 2,
    }
  }

  // 半屏：外框占内容可用区的一半宽、整屏高。左半屏贴左边，右半屏贴右半边起点。
  // 与 full 一样由模式决定位置，因此忽略 inst.slot / free 的 x、y。
  //
  // 半屏：真正的「半屏面板」——卡片铺满整个半屏区域（宽 × 整屏高），
  // 卡内内容垂直居中（CSS 里 justify-content: center）。这样"半屏"和自定义尺寸
  // 有肉眼可见的区别：宽度占一半、高度占满整屏。
  if (fit === 'leftHalf' || fit === 'rightHalf') {
    const halfW = bw / 2
    const left = fit === 'leftHalf' ? bx : bx + halfW
    return {
      pos: {
        left,
        top: by,
        width: halfW,
        height: bh,
        padding: `${padY}px ${padX}px`,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      },
      bodyW: halfW - padX * 2,
      bodyH: bh - padY * 2,
    }
  }

  // 自由定位用的是画布绝对坐标，不随内容区收窄而漂移
  if (inst.free && inst.x != null && inst.y != null) {
    if (fit === 'auto') {
      return { pos: { left: inst.x, top: inst.y } }
    }
    const w = inst.w ?? 560
    const h = inst.h ?? 320
    return { pos: { left: inst.x, top: inst.y, width: w, height: h }, bodyW: w, bodyH: h }
  }

  // 卡槽锚点：全部换算到内容区内，用 transform 做居中 / 贴边。
  // 内容自适应的卡离边更远一点（1.5 倍边距），免得文字贴到画面边缘；
  // 只放宽它自己靠的那一侧：左侧卡加左边距，右侧卡加右边距。
  const edgeMargin = fit === 'auto' ? Math.round(SLOT_MARGIN * 1.5) : SLOT_MARGIN
  let anchor: React.CSSProperties
  switch (inst.slot) {
    case 'right':
      anchor = {
        left: bx + bw - edgeMargin,
        top: by + bh / 2,
        transform: 'translate(-100%, -50%)',
      }
      break
    case 'center':
      anchor = {
        left: bx + bw / 2,
        top: by + bh / 2,
        transform: 'translate(-50%, -50%)',
      }
      break
    case 'bottom':
      anchor = {
        left: bx + bw / 2,
        top: by + bh - BOTTOM_MARGIN,
        transform: 'translate(-50%, -100%)',
      }
      break
    case 'top':
      anchor = {
        left: bx + bw / 2,
        top: by + BOTTOM_MARGIN,
        transform: 'translate(-50%, 0)',
      }
      break
    default:
      anchor = { left: bx + edgeMargin, top: by + bh / 2, transform: 'translateY(-50%)' }
  }

  if (fit === 'auto') {
    // 居中 / 贴底 / 贴顶的卡横跨整个内容区；左右两侧的卡只占一半，给画面留白。
    // 贴边的卡还要给另一侧留一份基础边距，否则边距加大后可能溢出内容区。
    const hardMax =
      inst.slot === 'center' || inst.slot === 'bottom' || inst.slot === 'top'
        ? bw - SLOT_MARGIN * 2
        : Math.max(0, Math.min(Math.round(bw * 0.56), bw - edgeMargin - SLOT_MARGIN))
    // 小档把宽度上限也收窄一档，避免"内容按小档缩了、外框还顶着上限"的割裂感；
    // 大档不突破上限（上限本来就是防溢出的边界），放大交给内容 zoom 完成。
    const maxWidth = scale < 1 ? Math.round(hardMax * scale) : hardMax
    return { pos: { ...anchor, maxWidth } }
  }

  const w = inst.w ?? 640
  const h = inst.h ?? 360
  return { pos: { ...anchor, width: w, height: h }, bodyW: w, bodyH: h }
}

/** 编辑交互：拖拽移动 / 右下角拖拽缩放（仅选中态，导出 stage 与着色模式下关闭） */
/**
 * 有卡关键帧时，画布上的拖动 / 缩放要写进"播放头处那一帧"，
 * 而不是改静态布局 —— 这样"拖一下"就等于给这一帧设了外观，两帧之间自然补间。
 */
type CardKfDragCtx = {
  hasKeys: boolean
  /** 起始外观（当前帧解算出来的值），拖动时在它基础上加增量 */
  base: CardVisual
  write: (p: Partial<CardVisual>) => void
}

function useFreeDrag(
  inst: Instance,
  interactive: boolean,
  cw: number,
  ch: number,
  kf: CardKfDragCtx,
) {
  const { dispatch } = useEditor()

  const onPointerDown = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!interactive) return
    e.preventDefault()
    e.stopPropagation()
    const canvasEl = (e.currentTarget as HTMLElement).closest('.os-canvas') as HTMLElement
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const kx = cw / rect.width
    const ky = ch / rect.height
    const host = (e.currentTarget as HTMLElement).closest('.os-inst') as HTMLElement | null
    const cardEl = host?.querySelector('.os-card') ?? host ?? (e.currentTarget as HTMLElement)
    const cardRect = cardEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = inst.free ? inst.x ?? 0 : Math.round((cardRect.left - rect.left) * kx)
    const origY = inst.free ? inst.y ?? 0 : Math.round((cardRect.top - rect.top) * ky)
    const origW = Math.max(160, Math.round(cardRect.width * kx))
    const origH = Math.max(80, Math.round(cardRect.height * ky))
    const fit: CardFit = inst.fit ?? defaultFitFor(inst.effectId)

    // ===== 有关键帧：拖动只写"相对增量"，不碰 free / fit / w / h =====
    // 关键帧本就是相对布局的增量，改布局会打乱已有动画；拖尺寸则换算成缩放倍率
    // （视觉等价：整卡连文字一起缩放），这样关键帧语义保持干净。
    if (kf.hasKeys) {
      const baseOffX = kf.base.offsetX
      const baseOffY = kf.base.offsetY
      const baseScale = kf.base.scale
      const onMove = (ev: PointerEvent) => {
        const dx = (ev.clientX - startX) * kx
        const dy = (ev.clientY - startY) * ky
        if (mode === 'move') {
          kf.write({ offsetX: Math.round(baseOffX + dx), offsetY: Math.round(baseOffY + dy) })
        } else {
          const ratio = origW > 0 ? (origW + dx) / origW : 1
          const next = Math.max(0.2, Math.min(3, baseScale * ratio))
          kf.write({ scale: Math.round(next * 100) / 100 })
        }
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      return
    }

    if (mode === 'resize') {
      // 拖拽缩放即进入"自定义尺寸"档，宽高由用户说了算
      dispatch({
        type: 'updateMeta',
        id: inst.id,
        patch: {
          fit: 'box',
          free: inst.free ?? true,
          x: origX,
          y: origY,
          w: origW,
          h: origH,
          baseW: origW,
          baseH: origH,
          autoFit: false,
        },
      })
    } else if (!inst.free) {
      dispatch({
        type: 'updateMeta',
        id: inst.id,
        patch: {
          free: true,
          x: origX,
          y: origY,
          w: fit === 'auto' ? undefined : origW,
          h: fit === 'auto' ? undefined : origH,
          baseW: origW,
          baseH: origH,
        },
      })
    }

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * kx
      const dy = (ev.clientY - startY) * ky
      if (mode === 'move') {
        dispatch({
          type: 'updateMeta',
          id: inst.id,
          patch: { x: Math.round(origX + dx), y: Math.round(origY + dy) },
        })
      } else {
        dispatch({
          type: 'updateMeta',
          id: inst.id,
          patch: {
            fit: 'box',
            w: Math.max(160, Math.round(origW + dx)),
            h: Math.max(80, Math.round(origH + dy)),
            autoFit: false,
          },
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return onPointerDown
}

function ActiveCard({
  inst,
  progress,
  editable,
  interactive,
  cw,
  ch,
  alpha,
  palette,
  projectCardOpacity,
  projectCardScale,
  contentBox,
  zIndex,
}: {
  inst: Instance
  progress: number
  editable: boolean
  interactive: boolean
  cw: number
  ch: number
  alpha: boolean
  palette: Palette
  projectCardOpacity: number
  /** 工程默认尺寸档（小 / 中 / 大）对应的缩放系数；单卡调过缩放时以单卡为准 */
  projectCardScale: number
  /** 内容可用区（出镜画面占掉的部分已经排除） */
  contentBox: Rect
  /** 层级：轨道号越小越靠上（字幕轨永远最顶） */
  zIndex: number
}) {
  const { effectFor, dispatch } = useEditor()
  const currentTime = usePlayhead()
  // 卡内本地时间 + 此刻外观：既给渲染用，也给"画布上拖动直接写进当前关键帧"用，
  // 所以要在 useFreeDrag 之前算出来（hook 参数需要它）。
  /**
   * 卡内本地时间 = 播放头相对卡起点的真实时间。
   *
   * 这里**不能用 progress**：编辑态下 progress 会被抬高一点
   * （因为卡组件的入场动画在 progress=0 时是全透明的，见 shownProgress 的处理），
   * 拿它算关键帧时间会让画布采样到偏后的时刻 —— 表现为"在第一个关键帧上看到的是
   * 第二个关键帧的值"，看起来就像第一帧被改掉了。参数面板用的是真实时间，两者必须一致。
   */
  const localTime = Math.max(0, Math.min(inst.duration || 0, currentTime - inst.start))
  const cardAnim = sampleCardVisual(inst, localTime)
  const hasCardAnim = !cardVisualIsIdentity(cardAnim)
  const cardKeys = inst.keyframes ?? []
  const onFreePointerDown = useFreeDrag(inst, interactive, cw, ch, {
    hasKeys: cardKeys.length > 0,
    base: cardAnim,
    write: (p) => {
      const merged = { ...cardAnim, ...p }
      if (cardKeys.length === 0) {
        // 没关键帧 → 写静态值（等于原来的行为）
        dispatch({
          type: 'updateMeta',
          id: inst.id,
          patch: {
            offsetX: merged.offsetX,
            offsetY: merged.offsetY,
            animScale: merged.scale,
            animOpacity: merged.opacity,
          },
        })
        return
      }
      // 有关键帧 → 覆盖"播放头处那一帧"，两帧之间自然补间。
      // 卡片已有完整姿态（x/y/w/h）时**直接在采样值上叠加改动，禁止重新量 DOM**：
      // 拖拽是连续写入，闭包里的 cardAnim 停留在按下瞬间，而画布已渲染上一次写入
      // 的结果 —— 拿旧状态反解新画面，位置每步漂移一截，卡片会越拖越飞。
      // 只在姿态缺失（旧关键帧 / 未打过帧）时量一次补齐。
      const box =
        cardAnim.w == null || cardAnim.h == null || cardAnim.x == null || cardAnim.y == null
          ? measureCardFrame(inst.id, cardAnim, cw, ch)
          : null
      dispatch({
        type: 'addCardKeyframe',
        id: inst.id,
        kf: visualToCardKf(localTime, box ? { ...cardAnim, ...box, ...p } : merged),
      })
    },
  })
  const def = effectFor(inst.effectId)
  if (!def) return null
  const Comp = def.component

  // dimAt：超过该秒点后整卡渐隐到 0.3（localTime / cardAnim / hasCardAnim 已在上面算好）
  let dimOpacity = 1
  if (inst.dimAt != null && localTime > inst.dimAt) {
    const fade = Math.min(1, (localTime - inst.dimAt) / 0.5)
    dimOpacity = 1 - fade * 0.7
  }

  const fit: CardFit = inst.fit ?? defaultFitFor(inst.effectId)
  // 缩放优先级：单卡「整体缩放」> 工程默认尺寸档 > 1（不动）。
  // 铺满画布的卡不吃工程默认档 —— 它本来就占满内容区，再缩放只会露出空隙。
  const scale = inst.contentScale ?? (fit === 'full' ? 1 : projectCardScale)
  const padX = alpha ? 0 : FULL_PAD_X
  const padY = alpha ? 0 : FULL_PAD_Y
  const boxResult = resolveBox(inst, fit, contentBox, padX, padY, scale)
  /**
   * 关键帧尺寸 / 位置覆盖：帧里记了外框尺寸（及位置）时，用插值出来的结果盖掉布局。
   * 这是让"内容自适应 → 铺满画布"这种**布局模式差异**能逐帧补间的关键 ——
   * fit 是离散枚举插值没意义，但尺寸和位置可以。
   *
   * 位置必须一并覆盖：铺满与自适应的**锚点规则**不同，位置若还走布局锚点，
   * 两帧只能共用当前布局的锚点，另一帧的内容就会跑偏。帧里带了 x/y 就整帧
   * 自持（绝对定位 + box 的"卡片撑满外框"填充规则），不再参与槽位锚点。
   */
  const kfSized = cardAnim.w != null && cardAnim.h != null
  const kfPosed = kfSized && cardAnim.x != null && cardAnim.y != null
  const pos: React.CSSProperties = kfPosed
    ? { left: cardAnim.x, top: cardAnim.y, width: cardAnim.w, height: cardAnim.h }
    : kfSized
      ? { ...boxResult.pos, width: cardAnim.w, height: cardAnim.h, maxWidth: undefined }
      : boxResult.pos
  const bodyW = kfSized ? cardAnim.w : boxResult.bodyW
  const bodyH = kfSized ? cardAnim.h : boxResult.bodyH

  /**
   * 把布局解（含定位样式、body 尺寸与档位）发布到 data 属性上：切布局档打帧时按它
   * 套回纯布局探测，不受"采样钳到上一帧、关键帧覆盖画面"的影响。
   * body 必须一起发布 —— 半屏档的外框是 flex 居中，探针若不给 body 宽度，
   * body 会缩成内容宽，量出来的框就错了。
   */
  const layoutPosJson = JSON.stringify({
    fit,
    pos: boxResult.pos,
    body: {
      zoom: scale,
      // 用布局自身的 bodyW（非关键帧覆盖值）：auto 档没有宽 = 内容自适应
      ...(boxResult.bodyW != null ? { width: Math.round(boxResult.bodyW / scale) } : {}),
      ...(boxResult.bodyH != null ? { height: Math.round(boxResult.bodyH / scale) } : {}),
    },
  })

  // 颜色：单卡强调色优先，否则跟随工程主题色；点缀色始终取主题（保持层次）
  const cardAccent = String(inst.params.accent ?? '').trim()
  // 背景透明度：单卡设置优先，否则跟随工程
  const cardOpacity =
    typeof inst.cardOpacity === 'number' ? inst.cardOpacity : projectCardOpacity
  const colorVars: React.CSSProperties = {
    '--stage-accent': cardAccent || palette.accent,
    '--stage-accent-strong': cardAccent || palette.accent,
    '--stage-primary': cardAccent || palette.accent,
    '--stage-data': cardAccent || palette.data,
    '--stage-special': palette.special,
    '--stage-assist': palette.special,
    '--stage-card-opacity': String(cardOpacity),
  } as React.CSSProperties

  // hyperframes 卡是 iframe，拿不到外层 CSS 变量，把解析后的颜色与透明度回填进 params
  const isHf = inst.effectId.startsWith('hf-')
  const params =
    isHf && !cardAccent
      ? { ...inst.params, accent: palette.accent, __cardOpacity: cardOpacity }
      : isHf
        ? { ...inst.params, __cardOpacity: cardOpacity }
        : inst.params

  // 卡内内容偏移：只平移内容本体，卡片外框不动（所有卡通用）
  const offX = Math.round(inst.contentOffsetX ?? 0)
  const offY = Math.round(inst.contentOffsetY ?? 0)
  const shiftStyle: React.CSSProperties =
    offX !== 0 || offY !== 0 ? { transform: `translate(${offX}px, ${offY}px)` } : {}

  const bodyStyle: React.CSSProperties = {
    // 有关键帧尺寸的帧按"固定外框"处理（卡片撑满外框），即使全局布局是 auto ——
    // 否则 .os-inst-auto 的 fit-content 规则会把卡缩回内容尺寸，帧记的尺寸就白记了
    ...(fit === 'auto' && !kfSized
      ? { zoom: scale }
      : {
          zoom: scale,
          width: Math.round((bodyW ?? 640) / scale),
          height: bodyH != null ? Math.round(bodyH / scale) : undefined,
          overflow: 'hidden',
        }),
    ...shiftStyle,
  }

  // 卡内内容拖动手柄：直接把文字拖到想要的位置
  const onContentPointerDown = (e: React.PointerEvent) => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()
    const canvasEl = (e.currentTarget as HTMLElement).closest('.os-canvas') as HTMLElement | null
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) return
    const kx = cw / rect.width
    const ky = ch / rect.height
    const sx = e.clientX
    const sy = e.clientY
    const ox = inst.contentOffsetX ?? 0
    const oy = inst.contentOffsetY ?? 0
    const move = (ev: PointerEvent) => {
      dispatch({
        type: 'updateMeta',
        id: inst.id,
        patch: {
          contentOffsetX: Math.round(ox + (ev.clientX - sx) * kx),
          contentOffsetY: Math.round(oy + (ev.clientY - sy) * ky),
        },
      })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const selectedCls = editable ? 'os-card-selected' : ''

  /**
   * 关键帧的 transform 必须与布局自带的 transform 合并。
   * resolveBox 会给非 free 定位的卡下发 `translate(-50%,-50%)` 这类居中修正，
   * 如果关键帧的 transform 单独放在 ...pos 之前，会被 pos 直接覆盖 ——
   * 表现就是"改了位移，画布上一点反应都没有"。
   * 顺序：布局定位在最内层 → 再按中心缩放 → 最后叠加关键帧平移。
   */
  const posTransform = typeof pos.transform === 'string' ? pos.transform : ''
  const mergedTransform = hasCardAnim
    ? `translate(${cardAnim.offsetX}px, ${cardAnim.offsetY}px) scale(${cardAnim.scale})${posTransform ? ' ' + posTransform : ''}`
    : posTransform

  return (
    <div
      className={`os-inst os-inst-${kfPosed ? 'box' : fit} ${selectedCls}`}
      data-paint-id={inst.id}
      data-layout-pos={layoutPosJson}
      data-fit={fit}
      style={{
        position: 'absolute',
        opacity: dimOpacity * cardAnim.opacity,
        transition: 'opacity 0.1s linear',
        ...(hasCardAnim ? { transformOrigin: '50% 50%' } : null),
        // 轨道号越小越靠上；字幕轨永远压在一切之上
        ...(zIndex != null ? { zIndex } : null),
        ...pos,
        // 放在 ...pos 之后：保证合并后的 transform 覆盖掉 pos 自带的那个
        ...(mergedTransform ? { transform: mergedTransform } : null),
        ...colorVars,
      }}
      onPointerDown={(e) => {
        dispatch({ type: 'select', id: inst.id })
        onFreePointerDown(e, 'move')
      }}
      onClick={() => dispatch({ type: 'select', id: inst.id })}
    >
      {/* 入场层单独包一层：位移只作用在这层，不会干扰卡片内部的定位与缩放，
          也避免和 .os-inst 自己的 transform（槽位居中用的 translate）打架 */}
      <div className="os-inst-enter" style={enterStyleFor(inst, progress)}>
        <div className="os-inst-body" data-paint-root style={bodyStyle}>
          <Comp params={params} progress={progress} meta={inst} isPreview={false} />
        </div>
      </div>
      {editable && (
        <>
          {inst.free && <span className="os-free-tag">拖拽移动</span>}
          <span
            className="os-free-resize"
            onPointerDown={(e) => onFreePointerDown(e, 'resize')}
            title="拖拽缩放（自动切到自定义尺寸）"
          />
          <span
            className="os-content-move"
            onPointerDown={onContentPointerDown}
            title="拖动这里调整卡内文字位置（也可在右侧「内容位置」里精确设置）"
          >
            ✥
          </span>
        </>
      )}
    </div>
  )
}

/** 垫底视频层：跟随播放头同步；object-fit: cover 直接填满画布（横屏 16:9 视频与画布比例一致时完美铺满） */
function VideoLayer({ opacity }: { opacity: number }) {
  const { state, dispatch } = useEditor()
  const currentTime = usePlayhead()
  const ref = useRef<HTMLVideoElement>(null)
  const { videoUrl, playing } = state

  // 播放头是主时钟，视频跟着它走（含「视频自己停了要重新拉起来」的兜底）。
  // 第 5 个参数是录屏导出倍速：有值时视频按该倍率真播放，而不是每帧硬 seek。
  useVideoSync(ref, currentTime, playing, !!videoUrl, exportRateOf())

  // 换视频时允许重新上报尺寸
  const sizeReportedRef = useRef(false)
  useEffect(() => {
    sizeReportedRef.current = false
  }, [videoUrl])

  const reportSize = (v: HTMLVideoElement) => {
    if (sizeReportedRef.current) return
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      dispatch({ type: 'setVideoSize', w: v.videoWidth, h: v.videoHeight })
      sizeReportedRef.current = true
    }
  }

  if (!videoUrl) return null
  return (
    <video
      ref={ref}
      src={videoUrl}
      muted
      playsInline
      onLoadedMetadata={(e) => reportSize(e.currentTarget)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        background: '#000',
        opacity,
      }}
    />
  )
}

/**
 * 素材片段图层：图像或视频，按片段自己的矩形显示在画布上。
 *
 * 图片 → <img>；视频 → <video> 并按片段位置换算源时间（和播放头帧同步，导出也对得上）。
 * 位置 / 大小 / 形状 / 镜头焦点都来自"此刻解算出来的外观" —— 有关键帧就按关键帧插值，
 * 没有就用片段的静态属性。这样镜头切换不再需要单独的机位轨道，每个片段自己打关键帧即可。
 */
/**
 * 素材片段入场动画：在片段开始后的 entranceDur 秒内，从"初始态"平滑过渡到正常态。
 * - fade：透明度 0→1
 * - slideLeft/Right/Up/Down：从对应方向（画布像素）平移进入，位移随缓动收敛到 0
 * 与关键帧插值互不干扰（叠加在最外层容器上），且 stage 导出同样生效。
 */
function computeEntrance(
  mode: string | undefined,
  dur: number | undefined,
  localT: number,
  w: number,
): { op: number; dx: number; dy: number } {
  if (!mode || mode === 'none') return { op: 1, dx: 0, dy: 0 }
  const t = Math.min(1, Math.max(0, localT) / Math.max(0.05, dur ?? 0.6))
  const e = 1 - Math.pow(1 - t, 3) // easeOutCubic
  const dist = Math.max(160, w * 0.25)
  const op = mode === 'fade' ? e : 1
  let dx = 0
  let dy = 0
  if (mode === 'slideLeft') dx = -dist * (1 - e)
  else if (mode === 'slideRight') dx = dist * (1 - e)
  else if (mode === 'slideUp') dy = -dist * (1 - e)
  else if (mode === 'slideDown') dy = dist * (1 - e)
  return { op, dx, dy }
}

function MediaClipLayer({
  clip,
  asset,
  scale,
  stage,
  selected,
  currentTime,
  zIndex,
}: {
  clip: ImageClip
  asset: MediaAsset
  scale: number
  stage: boolean
  selected: boolean
  currentTime: number
  zIndex: number
}) {
  const { dispatch, state } = useEditor()
  // 视频要跟着播放头走，所以每一帧都要重算；图片没有这个问题但复用同一套解算更省心
  const visual = sampleClipVisual(clip, currentTime - clip.start)
  // 入场动画只在片段开头一小段生效，超出时长后退回正常值（1 / 0）
  const localT = Math.max(0, currentTime - clip.start)
  const ent = computeEntrance(clip.entrance, clip.entranceDur, localT, visual.w)
  const srcTime = clipSourceTime(clip, currentTime)
  const videoRef = useRef<HTMLVideoElement>(null)
  useVideoSync(
    videoRef,
    srcTime ?? 0,
    state.playing,
    asset.kind === 'video' && srcTime != null,
    exportRateOf(),
  )

  const onDown = (e: React.PointerEvent) => {
    if (stage) return
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'selectImageClip', id: clip.id })
    const sx = e.clientX
    const sy = e.clientY
    // 关键帧存在时，拖动改的是"当前关键帧"的值，而不是静态属性 —— 否则拖完一松手就被插值覆盖回去
    const hasKeys = (clip.keyframes ?? []).length > 0
    const localT = Math.max(0, Math.min(clip.duration, currentTime - clip.start))
    const ox = visual.x
    const oy = visual.y
    const move = (ev: PointerEvent) => {
      const x = Math.round(ox + (ev.clientX - sx) / scale)
      const y = Math.round(oy + (ev.clientY - sy) / scale)
      if (hasKeys) {
        dispatch({
          type: 'addMediaKeyframe',
          id: clip.id,
          kf: { ...visualToKf(localT, { ...visual, x, y }) },
        })
      } else {
        dispatch({ type: 'updateImageClip', id: clip.id, patch: { x, y } })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onResize = (e: React.PointerEvent) => {
    if (stage) return
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'selectImageClip', id: clip.id })
    const sx = e.clientX
    const sy = e.clientY
    const hasKeys = (clip.keyframes ?? []).length > 0
    const localT = Math.max(0, Math.min(clip.duration, currentTime - clip.start))
    const ow = visual.w
    const oh = visual.h
    const move = (ev: PointerEvent) => {
      const w = Math.max(40, Math.round(ow + (ev.clientX - sx) / scale))
      const h = Math.max(40, Math.round(oh + (ev.clientY - sy) / scale))
      if (hasKeys) {
        dispatch({
          type: 'addMediaKeyframe',
          id: clip.id,
          kf: visualToKf(localT, { ...visual, w, h }),
        })
      } else {
        dispatch({ type: 'updateImageClip', id: clip.id, patch: { w, h } })
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // 先把镜像做了，再按焦点缩放 —— 顺序反了会导致放大方向跑偏
  const transform = [clip.mirror ? 'scaleX(-1)' : '', visual.zoom > 1.001 ? `scale(${visual.zoom})` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={`os-media-layer ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: visual.x,
        top: visual.y,
        width: visual.w,
        height: visual.h,
        zIndex,
        borderRadius: visual.radius,
        opacity: visual.opacity * ent.op,
        border: clip.borderWidth > 0 ? `${clip.borderWidth}px solid ${clip.borderColor}` : 'none',
        transform: ent.dx || ent.dy ? `translate(${ent.dx}px, ${ent.dy}px)` : undefined,
        boxShadow: clip.shadow ? '0 18px 48px rgba(0,0,0,0.45)' : 'none',
        boxSizing: 'border-box',
        pointerEvents: stage ? 'none' : 'auto',
        cursor: stage ? 'default' : 'move',
        outline: selected && !stage ? '2px solid var(--ui-accent, #8b9dff)' : 'none',
        outlineOffset: 1,
      }}
      onPointerDown={onDown}
      onClick={(e) => {
        if (stage) return
        e.stopPropagation()
        dispatch({ type: 'selectImageClip', id: clip.id })
      }}
    >
      {/* 内层专门负责裁剪（圆角 / 溢出），外层不裁 —— resize 手柄要露在圆角外可点 */}
      <div
        className="os-media-frame"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: visual.radius,
          overflow: 'hidden',
          background: asset.kind === 'video' ? '#000' : 'transparent',
        }}
      >
        {asset.kind === 'video' ? (
          <video
            ref={videoRef}
            src={asset.url || undefined}
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              // 焦点：决定保留原画面的哪一块（人不在正中间时靠这个）
              objectPosition: `${visual.focalX}% ${visual.focalY}%`,
              transform: transform || undefined,
              transformOrigin: `${visual.focalX}% ${visual.focalY}%`,
            }}
          />
        ) : (
          <img
            src={asset.url || undefined}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              objectPosition: `${visual.focalX}% ${visual.focalY}%`,
              transform: transform || undefined,
              transformOrigin: `${visual.focalX}% ${visual.focalY}%`,
            }}
          />
        )}
      </div>
      {selected && !stage && (
        <span
          className="os-media-resize"
          onPointerDown={onResize}
          title="拖拽改变大小"
        />
      )}
    </div>
  )
}

export default function PreviewCanvas({
  stage = false,
  forceScale = null,
  alpha = false,
}: {
  stage?: boolean
  forceScale?: number | null
  alpha?: boolean
}) {
  const { state } = useEditor()
  const currentTime = usePlayhead()
  const { project } = state
  const skin = skins[project.skin]
  const {
    videoUrl,
    videoVisible,
    videoOpacity,
    previewMode,
    zoom,
    canvasOrientation,
    showGrid,
  } = state

  // 画布尺寸：横屏 1920×1080 / 竖屏 1080×1920 两档固定；导出 stage 恒为横屏
  const isPortrait = canvasOrientation === 'portrait'
  const canvasW = isPortrait ? CANVAS_H : CANVAS_W
  const canvasH = isPortrait ? CANVAS_W : CANVAS_H

  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [autoScale, setAutoScale] = useState(0.5)

  // 用 ResizeObserver 监听画布容器真实尺寸：切布局 / 首屏布局未稳 / 字体加载
  // 导致的尺寸变化都能即时重算，避免一次性 window.resize 在尺寸为 0 时算出 scale=0
  // 把画布缩没（表现为「编辑模式黑屏、专注模式才显形」）。
  useEffect(() => {
    if (forceScale != null) return
    const el = wrapperRef.current
    if (!el) return
    const compute = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return // 布局未就绪，暂不改变
      const s = Math.min(rect.width / canvasW, rect.height / canvasH)
      if (s > 0) setAutoScale(s)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [forceScale, canvasW, canvasH])

  useEffect(() => {
    ;(window as unknown as { __stageCardOpacity?: number }).__stageCardOpacity = project.cardOpacity
  }, [project.cardOpacity])

  const scale = forceScale != null ? forceScale : autoScale * zoom

  const inWindow = (i: Instance) =>
    currentTime >= i.start && currentTime <= i.start + i.duration
  // 字幕总开关：关掉后预览与导出都不画字幕（卡片还在时间轴上，随时能开回来）
  const subtitlesVisible = project.subtitlesVisible !== false
  const onScreen =
    previewMode === 'video'
      ? []
      : project.instances.filter((i) => inWindow(i) && (subtitlesVisible || !isSubtitle(i)))
  // 图片素材片段：在时间窗内才显示；素材像素来自素材库里对应 asset 的 objectURL
  const imageOnScreen: ImageClip[] =
    previewMode === 'video'
      ? []
      : project.imageClips.filter((c) => currentTime >= c.start && currentTime <= c.start + c.duration)
  // 字幕必须压在所有动效卡之上。画布里的卡都没设 z-index，层级由 DOM 顺序决定，
  // 所以先把字幕排到最后渲染，再在 ActiveCard 里叠一个明确的 z-index 兜底。
  const active = [
    ...onScreen.filter((i) => !isSubtitle(i)),
    ...onScreen.filter((i) => isSubtitle(i)),
  ]

  // 轨道层级用的最大轨道号：动效卡与素材片段都算进去，保证 z-index 的上下限一致。
  // 轨道号越小 = 越靠上，所以 zIndex = 20 + (maxTrack - track)。
  const maxTrack = Math.max(
    1,
    ...onScreen.map((i) => laneOf(i)),
    ...imageOnScreen.map((c) => c.track ?? 1),
  )

  const styleVars = styleOptions.find((s) => s.id === project.style)?.vars ?? {}
  const fontFamily = fontOptions.find((f) => f.id === project.font)?.family ?? undefined

  const canvasStyle: React.CSSProperties = {
    width: canvasW,
    height: canvasH,
    transform: `scale(${scale})`,
    ...(skin.canvasVars as React.CSSProperties),
    ...(paletteVars(project.palette) as React.CSSProperties),
    ...(styleVars as React.CSSProperties),
    fontFamily,
    fontWeight: project.font === 'sans' ? 700 : undefined,
    ...({ '--stage-card-opacity': String(project.cardOpacity) } as React.CSSProperties),
    // 画布背景：工程级设置（跟随主题 / 米白 / 白 / 黑 / 自定义），透明导出时不画
    background: alpha ? 'transparent' : projectCanvasBg(project, `${skin.canvasVars['--stage-bg']}`),
  }

  const showVideo = videoUrl != null && videoVisible && !alpha
  const isSplit = previewMode === 'split' && showVideo
  /*
   * 出镜画面在「这一帧」的状态。
   *
   * 机位段就是关键帧：每段声明从某刻起画面长什么样，段与段之间按 transition 补间。
   * 所以半屏 → 左下角是慢慢挪过去，而不是瞬间跳 —— 内容可用区同样参与插值，
   * 卡片跟着一起让位，不会出现"人动了、卡片还在原地"的割裂。
   * 解算只依赖 currentTime，导出时逐帧 seek 拿到的也是正确的中间态。
   */
  const hostState = useMemo(
    () => resolveHostState(project, currentTime, canvasW, canvasH, isPortrait),
    [project, currentTime, canvasW, canvasH, isPortrait],
  )
  // 出镜功能已移除（不再有 hostUrl）：即使老工程里还残留 hostClips/host.layout，
  // 内容可用区也必须回到整块画布，否则卡片会被一个「看不见的出镜画面」挤到角落。
  const contentBox =
    state.hostUrl != null
      ? hostState.content
      : { x: 0, y: 0, w: canvasW, h: canvasH }
  // 出镜画面只要还有一点不透明度就得画：过渡中的淡入 / 淡出靠这个判断，
  // 不能再用 layout !== 'off'，否则淡出的最后几帧会提前消失。
  // srcTime == null = 播放头落在出镜素材区间之外（素材被截断/挪走后留下的空档），
  // 那一刻本来就没有出镜画面，连 video 元素都不必挂。
  const showHost = state.hostUrl != null && !alpha && hostState.opacity > 0.01 && hostState.srcTime != null

  const chapterMap = new Map<string, number>()
  for (const inst of project.instances) {
    if (inst.seg && !chapterMap.has(inst.seg)) chapterMap.set(inst.seg, inst.start)
  }
  const chapterSegs = [...chapterMap.entries()].sort((a, b) => a[1] - b[1])
  const activeSeg = [...chapterSegs].reverse().find(([, start]) => currentTime >= start)?.[0]

  const stageContent = (
    <>
      {!stage && (
        <>
          <div className="os-canvas-spec">
            <span>{canvasW}×{canvasH}</span>
            <span>{project.fps} FPS</span>
            <span>{fmtTime(currentTime)}</span>
          </div>
          <span className="os-canvas-safe">SAFE AREA</span>
          {chapterSegs.length > 0 && (
            <div className="os-chapter-bar">
              {chapterSegs.map(([seg]) => (
                <span key={seg} className={activeSeg === seg ? 'active' : ''}>{seg}</span>
              ))}
            </div>
          )}
        </>
      )}
      <div className="os-canvas-ambient" style={{ background: skin.ambient.join(', ') }} />
      {showGrid && <div className="os-canvas-grid" />}
      {active.map((inst) => {
        const local = Math.max(0, Math.min(1, (currentTime - inst.start) / inst.duration))
        // 编辑态（未播放、非导出）把刚起步的进度抬起来：progress=0 时卡片是全透明的，
        // 抬一下才看得到画面上有这张卡。播放与导出一律用真实进度。
        const shownProgress =
          !stage && !state.playing ? Math.max(local, EDIT_MIN_PROGRESS) : local
        const editable = !stage && state.selectedId === inst.id
        // 字幕统一走工程里那一份全局样式：字号 / 对齐 / 颜色 / 背景 / 位置都从它取，
        // 每句自己的 params.text 仍然保留（文案各不相同，不能联动）。
        const shown = isSubtitle(inst)
          ? {
              ...inst,
              slot: project.subtitleStyle.slot,
              params: subtitleRenderParams(inst, project.subtitleStyle),
            }
          : inst
        return (
          <ActiveCard
            key={inst.id}
            inst={shown}
            progress={shownProgress}
            editable={editable}
            interactive={!stage}
            cw={canvasW}
            ch={canvasH}
            alpha={alpha}
            palette={project.palette}
            projectCardOpacity={project.cardOpacity}
            projectCardScale={cardSizeScale(project.cardSize)}
            contentBox={contentBox}
            zIndex={isSubtitle(inst) ? SUBTITLE_Z : trackZIndex(laneOf(inst), maxTrack)}
          />
        )
      })}
      {/* 素材片段：在时间窗内显示，位于动效卡之上、出镜画面之下 */}
      {!alpha &&
        imageOnScreen.map((clip) => {
          const asset = state.project.mediaAssets.find((a) => a.id === clip.assetId)
          if (!asset) return null
          return (
            <MediaClipLayer
              key={clip.id}
              clip={clip}
              asset={asset}
              scale={scale}
              stage={stage}
              selected={state.selectedImageClipId === clip.id}
              currentTime={currentTime}
              zIndex={trackZIndex(clip.track ?? 1, maxTrack)}
            />
          )
        })}
      {/* 出镜画面：back 布局垫在内容下面，front 布局叠在内容之上。
          layer 由当前生效的机位段决定，所以两种分支都可能走到。 */}
      {showHost && hostState.srcTime != null && hostState.layer === 'back' && (
        <HostLayer
          key="host-back"
          frame={hostState.frame}
          radius={hostState.radius}
          focalX={hostState.focalX}
          focalY={hostState.focalY}
          zoom={hostState.zoom}
          opacity={hostState.opacity}
          layer="back"
          srcTime={hostState.srcTime}
        />
      )}
      {showHost && hostState.srcTime != null && hostState.layer === 'front' && (
        <HostLayer
          key="host-front"
          frame={hostState.frame}
          radius={hostState.radius}
          focalX={hostState.focalX}
          focalY={hostState.focalY}
          zoom={hostState.zoom}
          opacity={hostState.opacity}
          layer="front"
          srcTime={hostState.srcTime}
        />
      )}
      {/* 内容可用区提示（仅编辑态，导出时不画） */}
      {!stage && showHost && hostState.layout !== 'full' && (
        <div
          className="os-content-safe"
          style={{
            left: contentBox.x,
            top: contentBox.y,
            width: contentBox.w,
            height: contentBox.h,
          }}
        />
      )}
    </>
  )

  const halfScale = autoScale * zoom * 0.46

  const renderCanvas = (overrideScale?: number, extraStyle?: React.CSSProperties) => (
    <div
      ref={canvasRef}
      className={`os-canvas ${alpha ? 'os-canvas-alpha' : ''}`}
      style={{ ...canvasStyle, ...(overrideScale != null ? { transform: `scale(${overrideScale})` } : null), ...extraStyle }}
    >
      {showVideo && <VideoLayer opacity={videoOpacity} />}
      {stageContent}
    </div>
  )

  return (
    <div className={`os-canvas-wrapper ${stage ? 'os-canvas-stage' : ''}`} ref={wrapperRef}>
      {isSplit ? (
        // 分屏模式：左原片 / 右动效层（透明底对位检查）
        <div className="os-split">
          <div className="os-split-half">
            <VideoLayer opacity={videoOpacity} />
            <span className="os-split-tag">原片</span>
          </div>
          <div className="os-split-half">
            {renderCanvas(halfScale, { background: 'transparent' })}
            <span className="os-split-tag">动效层</span>
          </div>
        </div>
      ) : (
        renderCanvas()
      )}
    </div>
  )
}
