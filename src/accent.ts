/**
 * 强调色统一入口。
 *
 * 背景：以前每张卡各自读 `params.accent`（一个十六进制字符串），再手动拼
 * alpha 后缀（如 `${accent}99` 表示 60% 透明）。主题色上线后强调色可能是
 * var(--stage-accent) 或"跟随主题"，拼字符串的做法会直接失效。
 *
 * 约定：卡片内部一律用 `ACCENT` 取纯色、`accentAlpha(x)` 取半透明色，
 * 由画布容器注入 --stage-accent，卡片本身不再关心具体色值。
 */

export const ACCENT = 'var(--stage-accent)'

/** 主强调色的半透明版本：accentAlpha(0.6) → color-mix(in srgb, var(--stage-accent) 60%, transparent) */
export function accentAlpha(alpha: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)))
  return `color-mix(in srgb, var(--stage-accent) ${pct}%, transparent)`
}

/** 数据色的半透明版本（图表、进度条等） */
export function dataAlpha(alpha: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)))
  return `color-mix(in srgb, var(--stage-data) ${pct}%, transparent)`
}
