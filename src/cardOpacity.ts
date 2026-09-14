/**
 * 卡片背景透明度的两套数值口径，别混用：
 *
 *  - alpha（背景不透明度）：0 = 背景完全隐藏，1 = 背景完全不透明。
 *    工程里存的就是这个（project.cardOpacity / instance.cardOpacity），
 *    也是 CSS 变量 --stage-card-opacity 直接吃的值。
 *  - transparency（背景透明度）：界面上滑杆显示的值，= 1 - alpha。
 *    0% = 背景完全不透明，100% = 背景完全隐藏（无背景、无模糊）。
 *
 * 之所以要来回换算：字段名 cardOpacity 是历史遗留（存的是 alpha），
 * 但面板上的标签写的是「背景透明度」，用户按字面理解 100% = 全透明。
 * 换算只发生在 UI 这一层，其余地方一律用 alpha。
 */

/** alpha → 界面百分比（0~1，1 = 完全透明） */
export function alphaToTransparency(alpha: number): number {
  return 1 - clamp01(alpha)
}

/** 界面百分比 → alpha */
export function transparencyToAlpha(transparency: number): number {
  return round2(1 - clamp01(transparency))
}

/** 界面百分比 → 整数百分比文本 */
export function transparencyPercent(alpha: number): number {
  return Math.round(alphaToTransparency(alpha) * 100)
}

/**
 * 解析 rgba()/rgb() 里的 alpha。解析不出来（比如 var() 引用或关键字）就按 1 处理。
 * 只为「旧数值换算」服务，不参与运行时渲染。
 */
export function alphaOfCssColor(input: string | undefined): number {
  if (!input) return 1
  const m = /^rgba?\(([^)]+)\)$/i.exec(input.trim())
  if (!m) return 1
  const parts = m[1].split(/[,/\s]+/).filter(Boolean)
  if (parts.length < 4) return 1
  const a = Number(parts[3])
  return Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1
}

/**
 * 取颜色的 #rrggbb 部分，喂给 <input type="color">（它不认 alpha）。
 * 支持 #rgb / #rrggbb / rgb() / rgba()。认不出来就退回白色。
 */
export function hexOfCssColor(input: string | undefined): string {
  const s = (input ?? '').trim()
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase()
  }
  const m = /^rgba?\(([^)]+)\)$/i.exec(s)
  if (m) {
    const parts = m[1].split(/[,/\s]+/).filter(Boolean)
    if (parts.length >= 3) {
      const to2 = (v: string) => {
        const n = Number(v)
        if (!Number.isFinite(n)) return '00'
        return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
      }
      return `#${to2(parts[0])}${to2(parts[1])}${to2(parts[2])}`
    }
  }
  return '#ffffff'
}

/** hex + alpha 合成 rgba()，alpha 为 1 时也给 rgba（避免切换时颜色跳变） */
export function rgbaFromHex(hex: string, alpha: number): string {
  const h = hexOfCssColor(hex).slice(1)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const a = Math.max(0, Math.min(1, alpha))
  return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
