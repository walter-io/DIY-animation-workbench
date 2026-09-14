import type { EasingId } from './types'

export function applyEasing(t: number, ease: EasingId): number {
  const x = Math.max(0, Math.min(1, t))
  switch (ease) {
    case 'linear':
      return x
    case 'easeInOut':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    case 'easeOutQuart':
      return 1 - Math.pow(1 - x, 4)
    case 'easeOutBack':
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
    case 'easeOut':
    default:
      return 1 - Math.pow(1 - x, 2)
  }
}

/** 行级错峰揭示：把全局 progress 拆成第 i 行在 [start,start+span] 内的局部进度 */
export function staggered(progress: number, lineIndex: number, total: number, span = 0.6) {
  const start = (lineIndex / Math.max(1, total)) * (1 - span)
  const local = (progress - start) / span
  return Math.max(0, Math.min(1, local))
}
