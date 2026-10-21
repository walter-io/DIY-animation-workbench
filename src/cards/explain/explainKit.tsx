import type { CSSProperties } from 'react'

import { applyEasing } from '../../easing'

/**
 * 解说类动效卡共享视觉库（知识解说整页卡，参考"知识解说口播"幻灯片风格）：
 * 纸感浅色底 + 近黑大标题 + 深色药丸（关键结论）+ 白色药丸（要点逐个弹出）+ 琥珀色药丸（强调转折）。
 *
 * 与常规叠加卡的区别：解说卡自带整页背景，配合「自定义」出镜小窗使用，
 * 观感是"在播一页好看的 PPT"，而不是往口播画面上贴一张小卡。
 *
 * 全部动画由 progress（0~1）驱动，禁用 CSS animation / 真实时钟（导出是逐帧 seek）。
 */

/** 默认墨色（标题、正文）—— 可通过卡片参数 ink 覆盖，卡片根容器注入 --ex-ink */
export const EX_INK = '#1d1e22'
/**
 * 卡片内部写文字色一律用它：读到根容器上的 --ex-ink，没设就是默认墨色。
 * 换成黑底时只需把卡片的「文字色」参数改成浅色，卡内所有文字跟着变。
 */
export const EX_INK_VAR = 'var(--ex-ink, #1d1e22)'
/** 次级文字 */
export const EX_INK_SOFT = 'rgba(29, 30, 34, 0.55)'
/** 深色药丸底（关键结论） */
export const EX_NAVY = '#22252d'
/** 强调药丸（琥珀色，转折/重点） */
export const EX_AMBER = '#f2a63a'
/** 白色药丸底 */
export const EX_WHITE = '#ffffff'

/** 墨色的半透明版本：inkAlpha(0.55) → 55% 不透明度的当前文字色 */
export function inkAlpha(alpha: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)))
  return `color-mix(in srgb, var(--ex-ink, #1d1e22) ${pct}%, transparent)`
}

/**
 * 页面底色四选一：米白（解说卡原本的纸感色）/ 白色 / 黑色 / 透明。
 * 解说卡默认**不带背景**（透明），背景交给「解说·空白底板」统一提供 ——
 * 这样多张卡叠在一起时不会互相盖住，背景色也只在一个地方改。
 */
export const SLIDE_BG: Record<string, string> = {
  cream: 'linear-gradient(180deg, #f7f6f1 0%, #f0eee8 55%, #e4e1d9 100%)',
  white: '#ffffff',
  black: 'linear-gradient(180deg, #1a1b1f 0%, #0b0c0e 100%)',
  none: 'transparent',
}

/** 背景参数的可选值（中文，直接显示在参数面板的下拉里） */
export const BG_OPTIONS = ['透明', '米白', '白色', '黑色'] as const

/** 旧值 / 英文别名兼容：老工程里的 paper / ink 仍然认得 */
const BG_ALIAS: Record<string, string> = {
  透明: 'none',
  无: 'none',
  none: 'none',
  米白: 'cream',
  cream: 'cream',
  paper: 'cream',
  白色: 'white',
  纯白: 'white',
  white: 'white',
  黑色: 'black',
  深色: 'black',
  black: 'black',
  ink: 'black',
}

/** 背景参数 → 实际 CSS 背景值；认不出来的值按透明处理 */
export function slideBg(variant: unknown): string {
  const key = BG_ALIAS[String(variant ?? 'none').trim()] ?? 'none'
  return SLIDE_BG[key]
}

/**
 * 解说整页卡的根容器样式。
 * @param variant 背景（见 BG_OPTIONS，默认透明）
 * @param ink     文字色（写进 --ex-ink，卡内所有文字跟随）
 */
export function paperStyle(variant: unknown = 'none', ink: unknown = EX_INK): CSSProperties {
  return {
    position: 'relative',
    width: '100%',
    height: '100%',
    background: slideBg(variant),
    color: EX_INK_VAR,
    ...({ '--ex-ink': String(ink || EX_INK) } as CSSProperties),
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  }
}

/**
 * 列表参数拆行：参数面板是单行输入框，所以用「换行或逗号」两种写法都能列多项。
 * 空项自动剔除，超出 max 的项截断（保证排版不爆）。
 */
export function splitList(raw: unknown, fallback: string, max = 8): string[] {
  const text = raw == null || raw === '' ? fallback : String(raw)
  return text
    .split(/[\n,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
}

/** 区间取值：progress 走到 at 之后开始、dur 内完成，输出 0~1（easeOut） */
export function seg(progress: number, at: number, dur = 0.12): number {
  const t = Math.max(0, Math.min(1, (progress - at) / dur))
  return applyEasing(t, 'easeOut')
}

/** 区间取值（回弹）：用于药丸"弹出"的手感 */
export function popSeg(progress: number, at: number, dur = 0.12): number {
  const t = Math.max(0, Math.min(1, (progress - at) / dur))
  return applyEasing(t, 'easeOutBack')
}

/** 上浮入场样式 */
export function riseStyle(t: number, dist = 28): CSSProperties {
  return { opacity: t, transform: `translateY(${(1 - t) * dist}px)` }
}

/** 弹出入场样式（带轻微过冲；透明度必须夹在 0~1） */
export function popStyle(t: number, from = 0.72): CSSProperties {
  return {
    opacity: Math.min(1, Math.max(0, t * 1.8)),
    transform: `scale(${from + (1 - from) * t})`,
  }
}

/**
 * 元素卡（原子零件）的根容器：透明、内容自适应 —— 多个元素卡可以叠在同一页上。
 * 与整页卡（paperStyle，自带纸感底）的区别就在这里：元素卡只负责"一个零件"。
 */
export function atomStyle(t = 1): CSSProperties {
  return {
    position: 'relative',
    display: 'flex',
    background: 'transparent',
    color: EX_INK,
    opacity: t,
    transform: `translateY(${(1 - t) * 18}px)`,
  }
}

/** 顶部小字引导行（章节序号 / 栏目标签） */
export function Eyebrow({ text, t }: { text: string; t: number }) {
  if (!text) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontSize: 26,
        fontWeight: 600,
        letterSpacing: 2,
        color: inkAlpha(0.55),
        ...riseStyle(t, 14),
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 4,
          background: EX_AMBER,
          display: 'inline-block',
        }}
      />
      {text}
    </div>
  )
}

/** 深色药丸：一句话关键结论（白字） */
export function NavyPill({
  text,
  t,
  size = 34,
}: {
  text: string
  t: number
  size?: number
}) {
  if (!text) return null
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        background: EX_NAVY,
        color: '#ffffff',
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.35,
        padding: `${Math.round(size * 0.5)}px ${Math.round(size * 1.05)}px`,
        borderRadius: Math.round(size * 0.42),
        boxShadow: '0 10px 26px rgba(24, 26, 32, 0.22)',
        ...popStyle(t),
      }}
    >
      {text}
    </div>
  )
}

/** 白色药丸：要点标签（逐个弹出） */
export function WhitePill({
  text,
  t,
  size = 28,
}: {
  text: string
  t: number
  size?: number
}) {
  return (
    <div
      style={{
        background: EX_WHITE,
        color: EX_INK,
        fontSize: size,
        fontWeight: 600,
        padding: `${Math.round(size * 0.46)}px ${Math.round(size * 0.95)}px`,
        borderRadius: 999,
        boxShadow: '0 6px 18px rgba(24, 26, 32, 0.10)',
        border: '1px solid rgba(24, 26, 32, 0.06)',
        whiteSpace: 'nowrap',
        ...popStyle(t),
      }}
    >
      {text}
    </div>
  )
}

/** 琥珀色药丸：强调 / 转折结论 */
export function AmberPill({
  text,
  t,
  size = 34,
}: {
  text: string
  t: number
  size?: number
}) {
  if (!text) return null
  return (
    <div
      style={{
        alignSelf: 'flex-start',
        background: EX_AMBER,
        color: '#ffffff',
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.35,
        padding: `${Math.round(size * 0.5)}px ${Math.round(size * 1.05)}px`,
        borderRadius: Math.round(size * 0.42),
        boxShadow: '0 10px 26px rgba(214, 141, 32, 0.32)',
        ...popStyle(t),
      }}
    >
      {text}
    </div>
  )
}
