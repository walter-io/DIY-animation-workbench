import type { CanvasBgId, Project } from './types'

/**
 * 画布（整片）背景色 —— 工程级设置，作用于整块画布，不是某一张卡。
 *
 * 之前画布底色只跟着「主题（暗色/亮色）」走，做知识解说片想要米白纸感底时只能
 * 给每张卡各贴一层背景，叠卡片就会互相盖住。现在背景提到工程这一层统一设置：
 * 卡片全部保持透明，背景色改一处整片跟着变，导出（非透明）也带这一层底色。
 */

export const CANVAS_BG_OPTIONS: { id: CanvasBgId; name: string; hint: string; swatch: string }[] = [
  { id: 'auto', name: '跟随主题', hint: '用当前主题的底色（暗色=近黑、亮色=浅灰）', swatch: 'linear-gradient(135deg,#0b0b0d 50%,#f4f5f7 50%)' },
  { id: 'cream', name: '米白', hint: '解说知识卡默认的纸感底色', swatch: 'linear-gradient(180deg,#f7f6f1,#e4e1d9)' },
  { id: 'white', name: '白色', hint: '纯白底，最干净', swatch: '#ffffff' },
  { id: 'black', name: '黑色', hint: '近黑底，卡片文字要调成浅色', swatch: 'linear-gradient(180deg,#1a1b1f,#0b0c0e)' },
  { id: 'custom', name: '自定义', hint: '自己取一个色（图片/品牌色打底时用）', swatch: '#5ac8fa' },
]

/** 各档对应的实际 CSS 背景值 */
const CANVAS_BG_VALUE: Record<Exclude<CanvasBgId, 'custom'>, string> = {
  auto: '', // 空 = 用主题底色（调用方传进来的 fallback）
  cream: 'linear-gradient(180deg, #f7f6f1 0%, #f0eee8 55%, #e4e1d9 100%)',
  white: '#ffffff',
  black: 'linear-gradient(180deg, #1a1b1f 0%, #0b0c0e 100%)',
}

/** 取工程当前画布背景（CSS 值）。fallback 传主题底色，用于 auto 档 */
export function canvasBgValue(
  bg: CanvasBgId | undefined,
  customColor: string | undefined,
  fallback: string,
): string {
  if (bg === 'custom') return customColor || fallback
  if (!bg || bg === 'auto') return fallback
  return CANVAS_BG_VALUE[bg] ?? fallback
}

/** 工程 → 画布背景（方便调用方少传两个参数） */
export function projectCanvasBg(project: Pick<Project, 'canvasBg' | 'canvasBgColor'>, fallback: string): string {
  return canvasBgValue(project.canvasBg, project.canvasBgColor, fallback)
}

/** 导入旧工程 / JSON 时兜底：只认合法值，其余按「跟随主题」 */
export function normalizeCanvasBg(v: unknown): CanvasBgId {
  return v === 'cream' || v === 'white' || v === 'black' || v === 'custom' ? v : 'auto'
}
