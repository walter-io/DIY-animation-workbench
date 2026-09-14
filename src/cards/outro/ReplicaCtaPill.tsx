import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E30 ·  · 强调色长条胶囊按钮
 * 视觉：彩色胶囊按钮 + 左侧小圆点 + 主文本 + 右侧副标，CTA 风格。
 * 来源：剪辑自由，没想象中那么难 — 蓝色长条 pill
 */
export default function ReplicaCtaPill({ params, progress }: EffectProps) {
  const text = String(params.text ?? '剪辑自由，没想象中那么难')
  const hint = String(params.hint ?? '')
  const tone = String(params.tone ?? 'primary')
  const accentMap: Record<string, string> = {
    cyan: 'var(--stage-data)',
    purple: 'var(--stage-primary)',
    red: 'var(--stage-assist)',
    green: 'var(--stage-data)',
    yellow: 'var(--stage-special)',
    primary: 'var(--stage-primary)',
  }
  const color = accentMap[tone] ?? ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutBack')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 28,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 18px',
          borderRadius: 10,
          background: color,
          boxShadow: `0 0 22px ${color}, 0 6px 16px rgba(0,0,0,0.4)`,
          color: '#0a0a0a',
          fontSize: 16,
          fontWeight: 800,
          opacity: e,
          transform: `scale(${0.85 + e * 0.15})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0a0a0a' }} />
        <span>{text}</span>
        {hint && (
          <span
            style={{
              marginLeft: 6,
              paddingLeft: 10,
              borderLeft: '1px solid rgba(0,0,0,0.25)',
              fontSize: 12,
              fontWeight: 600,
              opacity: 0.7,
            }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  )
}