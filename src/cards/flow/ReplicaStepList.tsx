import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E26 ·  · 步骤堆叠列表
 * 视觉：垂直堆叠 3 条步骤卡，每条左侧编号 + 图标 + 标题 + 副标。
 * 来源：满屏轨道 / 工具和关键帧 / 收藏的教程 三个并行点
 */
export default function ReplicaStepList({ params, progress }: EffectProps) {
  const items = String(params.items ?? '满屏轨道|先搞懂时间线|play,工具和关键帧|还没动手·先被术语淹没|gear,收藏的教程|一个都没看完|bookmark')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

  const groups = items.map((seg) => {
    const parts = seg.split('|').map((s) => s.trim())
    return { title: parts[0] ?? '', sub: parts[1] ?? '', icon: parts[2] ?? 'doc' }
  })

  const renderIcon = (icon: string) => {
    const common = { width: 18, height: 18, fill: 'none', stroke: '#fff', strokeWidth: 1.6 }
    switch (icon) {
      case 'play':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <polygon points="10,9 16,12 10,15" fill="#fff" stroke="none" />
          </svg>
        )
      case 'gear':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
          </svg>
        )
      case 'bookmark':
        return (
          <svg {...common} viewBox="0 0 24 24">
            <path d="M6 3h12v18l-6-4-6 4V3z" />
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
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 24,
        gap: 10,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {groups.map((g, i) => {
        const t = Math.max(0, Math.min(1, (progress - i * 0.12) / 0.45))
        const e = applyEasing(t, 'easeOutQuart')
        const num = i === 2 ? '300' : String(i + 1).padStart(2, '0')
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px 10px 14px',
              borderRadius: 10,
              background: 'rgba(15,15,18,0.86)',
              border: '1px solid rgba(255,255,255,0.08)',
              opacity: e,
              transform: `translateX(${(-1 + e) * 24}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
              minWidth: 360,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 800, color: accent, letterSpacing: '0.04em' }}>{num}</span>
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
              {renderIcon(g.icon)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{g.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{g.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}