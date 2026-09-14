import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E29 ·  · 对话气泡 + 内含 3 个图标
 * 视觉：右上方圆角对话气泡，带向下的小尾巴，内含 3 个并列图标。
 * 来源：评论区告诉我 / 你先交哪件活 — 气泡内含 视频/文档/音频 三个图标
 */
export default function ReplicaIconBubble({ params, progress }: EffectProps) {
  const accent = String(params.color ?? 'var(--stage-data)')

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutBack')
  const itT = Math.max(0, Math.min(1, (progress - 0.2) / 0.45))
  const itE = applyEasing(itT, 'easeOutQuart')

  const renderIcon = (kind: string) => {
    const c = { width: 28, height: 28, fill: 'none', stroke: accent, strokeWidth: 1.8 }
    switch (kind) {
      case 'video':
        return (
          <svg {...c} viewBox="0 0 24 24">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <polygon points="10,9 16,12 10,15" fill={accent} stroke="none" />
          </svg>
        )
      case 'doc':
        return (
          <svg {...c} viewBox="0 0 24 24">
            <path d="M6 2h9l5 5v15H6z" />
            <line x1="9" y1="11" x2="16" y2="11" />
            <line x1="9" y1="14" x2="16" y2="14" />
            <line x1="9" y1="17" x2="13" y2="17" />
          </svg>
        )
      case 'audio':
        return (
          <svg {...c} viewBox="0 0 24 24">
            <path d="M3 12h2l3-8v16l-3-8z" />
            <path d="M11 5v14" />
            <path d="M15 8v8" />
            <path d="M19 10v4" />
          </svg>
        )
      default:
        return null
    }
  }

  const icons = (String(params.icons ?? 'video,doc,audio')).split(',').map((s) => s.trim())

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 32,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 180,
          height: 110,
          borderRadius: 12,
          border: `2.5px solid ${accent}`,
          background: 'rgba(8,8,12,0.85)',
          boxShadow: `0 0 24px ${accent}, inset 0 0 12px ${accentAlpha(0.15)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: e,
          transform: `scale(${0.6 + e * 0.4})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 小尾巴 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: -16,
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `18px solid ${accent}`,
            filter: `drop-shadow(0 4px 6px ${accentAlpha(0.4)})`,
          }}
        />
        {icons.map((icon, i) => (
          <div
            key={i}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `1.5px solid ${accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)',
              opacity: itE,
              transform: `scale(${0.5 + itE * 0.5}) translateY(${(1 - itE) * 8}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
              boxShadow: `0 0 12px ${accentAlpha(0.4)}`,
            }}
          >
            {renderIcon(icon)}
          </div>
        ))}
      </div>
    </div>
  )
}