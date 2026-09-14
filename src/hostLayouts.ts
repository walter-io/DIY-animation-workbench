/**
 * 主持视频（出镜画面）布局预设。
 *
 * 参考讲解类口播视频的常见做法，把"人在画面里怎么放"固化成几档，
 * 每档同时声明**主持画面矩形**和**内容可用区**——
 * 内容区是动效卡定位的坐标系，换布局时卡片会自动让位，不会压到人身上。
 *
 * 所有数值都是 0~1 的比例（相对画布宽/高），横竖屏都能用。
 */

export type HostLayoutId =
  | 'off'
  | 'circle-br'
  | 'circle-bl'
  | 'card-br'
  | 'card-bl'
  | 'split-right'
  | 'split-left'
  | 'bar-bottom'
  | 'full'
  | 'custom'

export type HostShape = 'circle' | 'rounded' | 'rect'

export type Rect = { x: number; y: number; w: number; h: number }

export type HostLayoutPreset = {
  id: HostLayoutId
  name: string
  /** 一句话说明，用在按钮 title 上 */
  hint: string
  /** 主持画面矩形（比例） */
  frame: Rect
  /** 内容可用区（比例）—— 动效卡在这个框里定位 */
  content: Rect
  shape: HostShape
  /** 圆角半径（画布像素，圆形时被忽略） */
  radius: number
  /** back = 当背景铺底（内容浮在上面）；front = 叠加在内容之上的画中画 */
  layer: 'back' | 'front'
  /** 竖屏（9:16）下的覆盖方案：口播竖屏一般是"上半屏人 + 下半屏内容" */
  portrait?: { frame: Rect; content: Rect }
}

export const HOST_LAYOUTS: HostLayoutPreset[] = [
  {
    id: 'off',
    name: '不显示',
    hint: '只放动效，不出镜',
    frame: { x: 0, y: 0, w: 0, h: 0 },
    content: { x: 0, y: 0, w: 1, h: 1 },
    shape: 'rect',
    radius: 0,
    layer: 'front',
  },
  {
    id: 'circle-br',
    name: '右下圆',
    hint: '最常用：右下角圆形出镜，内容整体靠左',
    frame: { x: 0.81, y: 0.663, w: 0.156, h: 0.278 },
    content: { x: 0, y: 0, w: 0.79, h: 1 },
    shape: 'circle',
    radius: 0,
    layer: 'front',
    // 竖屏：横屏那套比例落到 1080×1920 上是 168×534 的竖长条，圆会被拉成胶囊。
    // 这里按竖屏重新给一套，保证 w×h 仍是正方形（圆 = min(w,h)/2 才真的是圆）。
    portrait: {
      frame: { x: 0.65, y: 0.787, w: 0.306, h: 0.172 },
      content: { x: 0, y: 0, w: 1, h: 0.76 },
    },
  },
  {
    id: 'circle-bl',
    name: '左下圆',
    hint: '左下角圆形出镜，内容整体靠右',
    frame: { x: 0.033, y: 0.663, w: 0.156, h: 0.278 },
    content: { x: 0.21, y: 0, w: 0.79, h: 1 },
    shape: 'circle',
    radius: 0,
    layer: 'front',
    portrait: {
      frame: { x: 0.044, y: 0.787, w: 0.306, h: 0.172 },
      content: { x: 0, y: 0, w: 1, h: 0.76 },
    },
  },
  {
    id: 'card-br',
    name: '右下圆角卡',
    hint: '16:9 圆角小窗，比圆形能看清更多画面',
    frame: { x: 0.72, y: 0.698, w: 0.25, h: 0.25 },
    content: { x: 0, y: 0, w: 0.69, h: 1 },
    shape: 'rounded',
    radius: 24,
    layer: 'front',
    // 竖屏：横屏的 0.25×0.25 在 9:16 画布上会变成 270×480（9:16 竖卡），
    // 与「16:9 小窗」的语义完全相反。这里锁回 16:9。
    portrait: {
      frame: { x: 0.474, y: 0.806, w: 0.481, h: 0.152 },
      content: { x: 0, y: 0, w: 1, h: 0.775 },
    },
  },
  {
    id: 'card-bl',
    name: '左下圆角卡',
    hint: '16:9 圆角小窗靠左下，内容靠右',
    frame: { x: 0.029, y: 0.698, w: 0.25, h: 0.25 },
    content: { x: 0.31, y: 0, w: 0.69, h: 1 },
    shape: 'rounded',
    radius: 24,
    layer: 'front',
    portrait: {
      frame: { x: 0.045, y: 0.806, w: 0.481, h: 0.152 },
      content: { x: 0, y: 0, w: 1, h: 0.775 },
    },
  },
  {
    id: 'split-right',
    name: '右侧半屏',
    hint: '左半屏动效、右半屏出镜，人+内容并重',
    frame: { x: 0.5, y: 0, w: 0.5, h: 1 },
    content: { x: 0, y: 0, w: 0.5, h: 1 },
    shape: 'rect',
    radius: 0,
    layer: 'front',
    portrait: {
      frame: { x: 0, y: 0, w: 1, h: 0.44 },
      content: { x: 0, y: 0.46, w: 1, h: 0.54 },
    },
  },
  {
    id: 'split-left',
    name: '左侧半屏',
    hint: '右半屏动效、左半屏出镜',
    frame: { x: 0, y: 0, w: 0.5, h: 1 },
    content: { x: 0.5, y: 0, w: 0.5, h: 1 },
    shape: 'rect',
    radius: 0,
    layer: 'front',
    portrait: {
      frame: { x: 0, y: 0, w: 1, h: 0.44 },
      content: { x: 0, y: 0.46, w: 1, h: 0.54 },
    },
  },
  {
    id: 'bar-bottom',
    name: '底部横条',
    hint: '贯穿底部的新闻播报式，内容压在上半屏',
    frame: { x: 0, y: 0.667, w: 1, h: 0.333 },
    content: { x: 0, y: 0, w: 1, h: 0.63 },
    shape: 'rect',
    radius: 0,
    layer: 'front',
    portrait: {
      frame: { x: 0, y: 0.72, w: 1, h: 0.28 },
      content: { x: 0, y: 0, w: 1, h: 0.68 },
    },
  },
  {
    id: 'full',
    name: '全屏垫底',
    hint: '出镜画面铺满，动效浮在上面（录屏讲解常用）',
    frame: { x: 0, y: 0, w: 1, h: 1 },
    content: { x: 0, y: 0, w: 1, h: 1 },
    shape: 'rect',
    radius: 0,
    layer: 'back',
  },
  {
    id: 'custom',
    name: '自定义',
    hint: '自己拖位置、拉大小、选形状',
    frame: { x: 0.72, y: 0.698, w: 0.25, h: 0.25 },
    content: { x: 0, y: 0, w: 0.69, h: 1 },
    shape: 'rounded',
    radius: 24,
    layer: 'front',
  },
]

/** 画布方向 → 画布像素尺寸（与 PreviewCanvas 的 CANVAS_W / CANVAS_H 保持一致） */
export function canvasSizeFor(orientation: 'landscape' | 'portrait'): { w: number; h: number } {
  return orientation === 'portrait' ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 }
}

/**
 * 画布翻转时，把「自定义」出镜画面的绝对像素矩形按比例搬到新画布上。
 *
 * 自定义档存的是画布像素（默认 x=1384 是按 1920 宽摆出来的右下角），
 * 直接切到竖屏会落在 1080 宽的画布外面、整个看不见。
 * 按新/旧画布的比例缩放后，相对角落位置不变且一定留在画面内。
 */
export function remapRectOrientation(
  rect: Rect,
  from: 'landscape' | 'portrait',
  to: 'landscape' | 'portrait',
): Rect {
  if (from === to) return rect
  const a = canvasSizeFor(from)
  const b = canvasSizeFor(to)
  return {
    x: Math.round((rect.x * b.w) / a.w),
    y: Math.round((rect.y * b.h) / a.h),
    w: Math.round((rect.w * b.w) / a.w),
    h: Math.round((rect.h * b.h) / a.h),
  }
}

const BY_ID = new Map(HOST_LAYOUTS.map((l) => [l.id, l]))

export function hostLayout(id: HostLayoutId): HostLayoutPreset {
  return BY_ID.get(id) ?? BY_ID.get('off')!
}

/** 取该布局在指定画布 + 方向下的实际像素矩形 */
export function hostRects(
  id: HostLayoutId,
  cw: number,
  ch: number,
  portrait: boolean,
  custom?: Rect,
): { frame: Rect; content: Rect } {
  const p = hostLayout(id)
  const src = portrait && p.portrait ? p.portrait : p
  const frame =
    id === 'custom' && custom
      ? { x: custom.x / cw, y: custom.y / ch, w: custom.w / cw, h: custom.h / ch }
      : src.frame
  const content = id === 'custom' ? { x: 0, y: 0, w: 1, h: 1 } : src.content
  return {
    frame: {
      x: Math.round(frame.x * cw),
      y: Math.round(frame.y * ch),
      w: Math.round(frame.w * cw),
      h: Math.round(frame.h * ch),
    },
    content: {
      x: Math.round(content.x * cw),
      y: Math.round(content.y * ch),
      w: Math.round(content.w * cw),
      h: Math.round(content.h * ch),
    },
  }
}
