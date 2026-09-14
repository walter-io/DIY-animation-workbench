import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E42 ·  · 大数字 stat + 输出 chip
 * 视觉：eyebrow 小字 + 巨号橙色数字 + 白色标签 + 橙下划线 + 下方描边输出 chip（编号+数值→）。
 * 来源：EXTRA TIME → REUSABLE VALUE — +2h 多出来的 · OUTPUT B) 15 段MG →
 */
export default function ReplicaStatHero({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'EXTRA TIME → REUSABLE VALUE')
  const value = String(params.value ?? '+2h')
  const label = String(params.label ?? '多出来的')
  const chipLabel = String(params.chipLabel ?? 'OUTPUT B)')
  const chipValue = String(params.chipValue ?? '15 段MG')
  const showChip = String(params.showChip ?? 'true') === 'true'
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.4))
  const e = applyEasing(t, 'easeOutBack')
  const chipT = Math.max(0, Math.min(1, (progress - 0.25) / 0.4))
  const chipE = applyEasing(chipT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '0 64px',
        gap: 10,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.24em', color: accent, opacity: applyEasing(Math.min(1, progress / 0.3), 'easeOutQuart') }}>
        {eyebrow}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20 }}>
        <span
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: accent,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            textShadow: `0 0 30px ${accentAlpha(0.45)}`,
            opacity: e,
            transform: `scale(${0.6 + e * 0.4})`,
            display: 'inline-block',
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: '#fff',
            opacity: e,
            transform: `translateY(${(1 - e) * 14}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          width: '78%',
          height: 2.5,
          background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.1)})`,
          boxShadow: `0 0 12px ${accentAlpha(0.4)}`,
          transform: `scaleX(${e})`,
          transformOrigin: 'left center',
        }}
      />
      {showChip && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 20px',
              borderRadius: 8,
              border: `1.5px solid ${accentAlpha(0.6)}`,
              background: 'rgba(9,9,11,0.85)',
              boxShadow: `0 0 18px ${accentAlpha(0.15)}`,
              opacity: chipE,
              transform: `translateY(${(1 - chipE) * 16}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>{chipLabel}</span>
              <span style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>
                <span style={{ color: accent }}>{chipValue.split(' ')[0]}</span> {chipValue.split(' ').slice(1).join(' ')}
              </span>
            </div>
          </div>
          <svg width="34" height="20" viewBox="0 0 34 20" style={{ opacity: chipE, transition: 'opacity 0.1s linear' }}>
            <line x1="2" y1="10" x2="24" y2="10" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
            <polygon points="22,4 32,10 22,16" fill={accent} />
          </svg>
        </div>
      )}
    </div>
  )
}