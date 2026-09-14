import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E24 ·  · 大标题 + 第 2 行彩色高亮
 * 视觉：左上/居左大中文标题（白字），第 2 行带强调色背景条。
 * 来源：打开软件那一刻 / 像一张空白考卷
 *      大白话也能 / 把活说清楚
 *      脏活累活给它 / 判断审美留给你
 *      评论区告诉我 / 你先交哪件活
 */
export default function ReplicaHeadlineHighlight({ params, progress }: EffectProps) {
  const line1 = String(params.line1 ?? '打开软件那一刻')
  const line2 = String(params.line2 ?? '像一张空白考卷')
  const tone = String(params.tone ?? 'cyan')
  const accentMap: Record<string, string> = {
    cyan: 'var(--stage-data)',
    purple: 'var(--stage-primary)',
    red: 'var(--stage-assist)',
    green: 'var(--stage-data)',
    yellow: 'var(--stage-special)',
    primary: 'var(--stage-primary)',
  }
  const color = accentMap[tone] ?? ACCENT

  const l1T = Math.max(0, Math.min(1, progress / 0.4))
  const l1E = applyEasing(l1T, 'easeOutQuart')
  const l2T = Math.max(0, Math.min(1, (progress - 0.2) / 0.4))
  const l2E = applyEasing(l2T, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 28,
        gap: 4,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          opacity: l1E,
          transform: `translateX(${(-1 + l1E) * 20}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {line1}
      </div>
      <div
        style={{
          position: 'relative',
          fontSize: 56,
          fontWeight: 900,
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          opacity: l2E,
          transform: `translateX(${(-1 + l2E) * 20}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 高亮背景条 */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: '6px -8px 4px -8px',
            background: color,
            borderRadius: 4,
            boxShadow: `0 0 18px ${color}`,
          }}
        />
        <span style={{ position: 'relative', color: '#0a0a0a' }}>{line2}</span>
      </div>
    </div>
  )
}