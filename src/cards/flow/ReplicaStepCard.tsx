import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E25 ·  · 单条步骤卡
 * 视觉：左侧编号 + 小图标 + 标题 + 副标，圆角矩形深色背景。
 * 来源：01 说需求 / 素材在哪·讲什么·突出哪句
 *      02 工具和关键帧 / 还没动手，先被术语淹没
 */
export default function ReplicaStepCard({ params, progress }: EffectProps) {
  const index = String(params.index ?? '01')
  const icon = String(params.icon ?? 'play') // play | folder | bookmark | gear | doc | time
  const title = String(params.title ?? '说需求')
  const subtitle = String(params.subtitle ?? '素材在哪·讲什么·突出哪句')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutQuart')

  const Icon = () => {
    const common = { width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 1.6 }
    switch (icon) {
      case 'play':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <polygon points="10,9 16,12 10,15" fill="#fff" stroke="none" />
          </svg>
        )
      case 'folder':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          </svg>
        )
      case 'bookmark':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <path d="M6 3h12v18l-6-4-6 4V3z" />
          </svg>
        )
      case 'gear':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
          </svg>
        )
      case 'time':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12,7 12,12 16,14" />
          </svg>
        )
      default:
        return (
          <svg {...common} viewBox="0 0 24 24">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <line x1="8" y1="8" x2="16" y2="8" />
            <line x1="8" y1="12" x2="16" y2="12" />
            <line x1="8" y1="16" x2="13" y2="16" />
          </svg>
        )
    }
  }

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 24,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 18px 12px 14px',
          borderRadius: 10,
          background: 'rgba(15,15,18,0.86)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
          opacity: e,
          transform: `translateX(${(-1 + e) * 24}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 800, color: accent, letterSpacing: '0.04em' }}>{index}</span>
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 10px ${accentAlpha(0.4)}`,
          }}
        >
          <Icon />
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{subtitle}</div>
        </div>
      </div>
    </div>
  )
}