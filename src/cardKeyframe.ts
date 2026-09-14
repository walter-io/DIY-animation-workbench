import { applyKeyframeEasing } from './mediaKeyframe'
import type { CardKeyframe, CardVisual, Instance, KeyframeEase } from './types'
export type { CardVisual }

/**
 * 动效卡的关键帧采样。
 *
 * 与素材片段（mediaKeyframe.ts）是同一套语义：在播放头处把"此刻的外观"固化成关键帧，
 * 相邻两帧之间按后一帧的 ease 补间。差别只在插值对象 —— 片段动的是它在画布上的矩形，
 * 卡片动的是**相对布局的增量**（平移 / 缩放 / 整体透明度），所以改 slot、换尺寸自适应
 * 都不会把已有的动画搞乱。
 */

/** 卡自身的静态动画值：没有关键帧时的兜底（默认 0 / 0 / 1 / 1 = 不动） */
export function baseCardVisual(inst: Instance): CardVisual {
  return {
    offsetX: inst.offsetX ?? 0,
    offsetY: inst.offsetY ?? 0,
    scale: inst.animScale ?? 1,
    opacity: inst.animOpacity ?? 1,
  }
}

function kfToVisual(k: CardKeyframe): CardVisual {
  return {
    offsetX: k.offsetX,
    offsetY: k.offsetY,
    scale: k.scale,
    opacity: k.opacity,
    w: k.w,
    h: k.h,
    x: k.x,
    y: k.y,
  }
}

/** 把"此刻的外观"固化成一个关键帧（时间轴 🔑 按钮 / 参数面板用） */
export function visualToCardKf(t: number, v: CardVisual, ease: KeyframeEase = 'smooth'): CardKeyframe {
  return { t, ...v, ease }
}

function lerp(a: number, b: number, m: number) {
  return a + (b - a) * m
}

/** 可选的数字插值：两端都有值才补间，只有一端就用那一端（避免 undefined 把动画打断） */
function lerpOpt(a: number | undefined, b: number | undefined, m: number): number | undefined {
  if (a == null && b == null) return undefined
  if (a == null) return b
  if (b == null) return a
  return a + (b - a) * m
}

function lerpVisual(a: CardVisual, b: CardVisual, m: number): CardVisual {
  return {
    offsetX: lerp(a.offsetX, b.offsetX, m),
    offsetY: lerp(a.offsetY, b.offsetY, m),
    scale: lerp(a.scale, b.scale, m),
    opacity: lerp(a.opacity, b.opacity, m),
    w: lerpOpt(a.w, b.w, m),
    h: lerpOpt(a.h, b.h, m),
    x: lerpOpt(a.x, b.x, m),
    y: lerpOpt(a.y, b.y, m),
  }
}

/**
 * 求卡片在「卡内第 localTime 秒」时的实际外观。
 * 没有关键帧 → 静态值；只有一个 → 恒定不变；多个 → 相邻两帧之间按后一帧的 ease 插值。
 * 超出首/末帧的时间点钳到端点上，避免卡片跑飞。
 */
export function sampleCardVisual(inst: Instance, localTime: number): CardVisual {
  const keys = [...(inst.keyframes ?? [])].sort((a, b) => a.t - b.t)
  if (keys.length === 0) return baseCardVisual(inst)
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
  return baseCardVisual(inst)
}

/** 外观是否等于"没有动画"（全默认值就不必套 transform / 覆盖尺寸位置） */
export function cardVisualIsIdentity(v: CardVisual): boolean {
  return (
    v.offsetX === 0 &&
    v.offsetY === 0 &&
    v.scale === 1 &&
    v.opacity === 1 &&
    v.w == null &&
    v.h == null &&
    v.x == null &&
    v.y == null
  )
}

/**
 * 量出卡片当前渲染的外框尺寸，换算回画布像素；拿不到返回 null。
 *
 * 用途：打关键帧 / 画布拖动 / 改尺寸档时，把当前尺寸一并写进那一帧。
 * 这样"第一帧内容自适应、第二帧铺满画布"这类**布局模式差异**才补得起来 ——
 * `fit` 是离散枚举，插值没有意义，能插值的是尺寸。
 *
 * 必须用 offsetWidth / offsetHeight（布局尺寸）而不是 getBoundingClientRect：
 * rect 带着关键帧的 `scale(cardAnim.scale)` 变换，量出来的是"已经放大过的"尺寸，
 * 连同 scale 一起存进关键帧后渲染会再乘一次（视觉 = 量得值 × scale），于是
 * 每次按 🔑 / 改属性都把尺寸再放大一轮，关键帧之间的尺寸就是这样互相污染的。
 * offsetWidth 不含 transform（入场动画、关键帧缩放都排除在外），
 * 但包含 contentScale 的 zoom —— 那是布局本身的一部分，理应烤进尺寸里。
 */
export function measureCardBox(
  instId: string,
  canvasW: number,
  canvasH: number,
): { w: number; h: number } | null {
  if (typeof document === 'undefined') return null
  const host = document.querySelector(`[data-paint-id="${instId}"]`) as HTMLElement | null
  const el =
    (host?.querySelector('.os-card') as HTMLElement | null) ??
    (host?.querySelector('.os-inst-body') as HTMLElement | null) ??
    host
  const canvasEl = document.querySelector('.os-canvas') as HTMLElement | null
  if (!el || !canvasEl) return null
  // 画布本身被 transform: scale 缩放过，clientWidth 是它的布局宽度，
  // 与 offsetWidth 同处一个坐标系，两者相比正好消掉显示缩放
  const cw = canvasEl.clientWidth
  const ch = canvasEl.clientHeight
  if (el.offsetWidth < 2 || el.offsetHeight < 2 || cw < 2 || ch < 2) return null
  return {
    w: Math.max(1, Math.round((el.offsetWidth * canvasW) / cw)),
    h: Math.max(1, Math.round((el.offsetHeight * canvasH) / ch)),
  }
}

/**
 * 量出卡片此刻解算出的**完整外框（位置 + 尺寸）**，并把关键帧自身的平移 / 缩放
 * 从测量结果里反解掉 —— 拿到的就是"这一帧的布局解"，可直接存进关键帧。
 *
 * 位置必须和尺寸一起记：fit 连同它的锚点规则是离散枚举，"第一帧铺满、第二帧自适应"
 * 两帧的锚点根本不同。位置若仍交给布局锚点，两帧只能共用一个锚点，另一帧必然跑偏。
 *
 * 反解推导（渲染链：`translate(offset) scale(s) 锚点修正`，原点为卡中心）：
 * 包裹层视觉左上角 = offset + 布局解左上角 + (1-s) × 尺寸/2
 * ⇒ 布局解左上角 = 视觉左上角 - offset + (s-1) × 尺寸/2。
 *
 * 排除瞬态变换的手段：
 *  - 尺寸用 offsetWidth / offsetHeight（布局尺寸，不含任何 transform，入场缩放、
 *    关键帧缩放都进不来；contentScale 的 zoom 属于布局本身，理应计入）；
 *  - 位置用**包裹层**的 rect（入场位移 / 内容偏移都挂在包裹层**内部**，不影响它），
 *    再加上卡在包裹层内的布局偏移（offsetLeft / offsetTop 同样不含 transform）。
 */
export function measureCardFrame(
  instId: string,
  anim: CardVisual,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number } | null {
  if (typeof document === 'undefined') return null
  const wrapper = document.querySelector(`[data-paint-id="${instId}"]`) as HTMLElement | null
  const canvasEl = document.querySelector('.os-canvas') as HTMLElement | null
  if (!wrapper || !canvasEl) return null
  const body = wrapper.querySelector('.os-inst-body') as HTMLElement | null
  const card = (wrapper.querySelector('.os-card') as HTMLElement | null) ?? body
  if (!card) return null
  const cr = canvasEl.getBoundingClientRect()
  const rr = wrapper.getBoundingClientRect()
  if (cr.width < 2 || cr.height < 2 || rr.width < 2 || rr.height < 2) return null
  // 两套系数不能混用：
  //  - rect（getBoundingClientRect）是 transform 之后的**显示像素**，要按 canvasW/cr.width 放大回画布像素；
  //  - offsetWidth / offsetLeft / clientWidth 是 transform 之前的**画布布局像素**
  //    （画布本身就是 width:canvasW + transform:scale 显示的），系数恒为 canvasW/clientWidth ≈ 1。
  // 拿显示系数去乘 offset 值会把尺寸翻倍 —— 烤出来的帧直接爆出画布。
  const rx = canvasW / cr.width
  const ry = canvasH / cr.height
  const lx = canvasW / Math.max(1, canvasEl.clientWidth)
  const ly = canvasH / Math.max(1, canvasEl.clientHeight)
  const w = card.offsetWidth * lx
  const h = card.offsetHeight * ly
  if (w < 2 || h < 2) return null
  // 卡相对包裹层的布局偏移（入场层是包裹层的子节点，不在链条上，天然排除）
  const dx = ((body?.offsetLeft ?? 0) + card.offsetLeft) * lx
  const dy = ((body?.offsetTop ?? 0) + card.offsetTop) * ly
  // 包裹层视觉左上角（显示像素 → 画布像素）
  const vx = (rr.left - cr.left) * rx
  const vy = (rr.top - cr.top) * ry
  const s = anim.scale > 0 ? anim.scale : 1
  return {
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
    x: Math.round(vx - (anim.offsetX ?? 0) + s * dx - ((1 - s) * w) / 2),
    y: Math.round(vy - (anim.offsetY ?? 0) + s * dy - ((1 - s) * h) / 2),
  }
}

/**
 * 探测「某个布局档」解算出的卡片区（位置 + 尺寸），供切布局档打帧用。
 *
 * 为什么不能直接量：关键帧存在时，播放头处的采样会**钳到既有帧**（只有一帧时
 * 任何时刻都返回那一帧），关键帧的外框覆盖着布局 —— 直接量 DOM 量到的是上一帧
 * 的样子，于是"第二帧设自适应"烤出来的还是第一帧的框，第二帧等于没设。
 *
 * 做法：把布局解出的定位样式（锚点、盒尺寸、内边距、flex 居中…）整套临时套回
 * 包裹层，同时摘掉关键帧覆盖的几何，量完立刻恢复。全程同步、不落画，
 * 用户看到的只是卡片切换到新模式那一帧。
 *
 * transform 保持与正常渲染一致的合并顺序（关键帧平移/缩放在前、锚点修正在后），
 * measureCardFrame 的反解公式正是按这条链推导的。
 */
export function measureCardLayout(
  instId: string,
  anim: CardVisual,
  canvasW: number,
  canvasH: number,
  fit: string,
  layoutPos: Record<string, string | number | undefined>,
  layoutBody: Record<string, string | number | undefined> = {},
): { x: number; y: number; w: number; h: number } | null {
  if (typeof document === 'undefined') return null
  const wrapper = document.querySelector(`[data-paint-id="${instId}"]`) as HTMLElement | null
  if (!wrapper) return null
  const body = wrapper.querySelector('.os-inst-body') as HTMLElement | null
  const savedClass = wrapper.getAttribute('class') ?? ''
  // 布局解可能改写的几何 / 占位属性：不在布局解里的要清空（摘掉关键帧覆盖）
  const GEOM = [
    'left',
    'top',
    'width',
    'height',
    'maxWidth',
    'padding',
    'transform',
    'display',
    'alignItems',
    'justifyContent',
  ]
  const style = wrapper.style as unknown as Record<string, string>
  const saved: Record<string, string> = {}
  for (const k of GEOM) saved[k] = style[k] ?? ''
  const savedBody: Record<string, string> = body
    ? { width: body.style.width, height: body.style.height, zoom: body.style.zoom }
    : {}
  try {
    wrapper.setAttribute('class', savedClass.replace(/os-inst-[a-zA-Z]+/, `os-inst-${fit}`))
    for (const k of GEOM) style[k] = ''
    for (const [k, v] of Object.entries(layoutPos)) {
      if (v == null || v === '') continue
      style[k] = typeof v === 'number' ? `${v}px` : v
    }
    const anchor = typeof layoutPos.transform === 'string' ? layoutPos.transform : ''
    const s = anim.scale > 0 ? anim.scale : 1
    style.transform = `translate(${anim.offsetX ?? 0}px, ${anim.offsetY ?? 0}px) scale(${s})${anchor ? ' ' + anchor : ''}`
    if (body) {
      // body 尺寸必须按布局解回填：半屏档的外框是 flex 居中，不给宽度它会缩成内容宽，
      // 量出来的框就比真实半屏窄一半（表现为"左侧半屏设置无效"）
      body.style.width = layoutBody.width != null ? `${layoutBody.width}px` : ''
      body.style.height = layoutBody.height != null ? `${layoutBody.height}px` : ''
      body.style.zoom = layoutBody.zoom != null ? String(layoutBody.zoom) : ''
    }
    return measureCardFrame(instId, anim, canvasW, canvasH)
  } finally {
    wrapper.setAttribute('class', savedClass)
    for (const k of GEOM) style[k] = saved[k]
    if (body) {
      body.style.width = savedBody.width
      body.style.height = savedBody.height
      body.style.zoom = savedBody.zoom
    }
  }
}
