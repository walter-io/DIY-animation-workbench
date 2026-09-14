import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E35 ·  · 巨字 vs 对比
 * 视觉：eyebrow 小字 + "4小时 vs ≤2小时"（A 橙 / vs 灰 / B 白）+ 橙下划线 + 底部小 eyebrow。
 * 来源：VIDEO TIME / PRODUCTION TIME — 4小时 vs ≤2小时
 */
export default function ReplicaVsHero({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'VIDEO TIME / PRODUCTION TIME')
  const valueA = String(params.valueA ?? '4小时')
  const valueB = String(params.valueB ?? '≤2小时')
  const subEyebrow = String(params.subEyebrow ?? 'CODEX VISUAL VIDEO / PURE TALKING HEAD')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.4))
  const e = applyEasing(t, 'easeOutQuart')
  const aT = Math.max(0, Math.min(1, (progress - 0.1) / 0.4))
  const aE = applyEasing(aT, 'easeOutBack')
  const bT = Math.max(0, Math.min(1, (progress - 0.25) / 0.4))
  const bE = applyEasing(bT, 'easeOutBack')

  const big: React.CSSProperties = {
    fontSize: 96,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
  }

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 56px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 12,
          opacity: e,
          transition: 'opacity 0.1s linear',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.24em', color: accent }}>{eyebrow}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
          <span style={{ ...big, color: accent, textShadow: `0 0 24px ${accentAlpha(0.4)}`, opacity: aE, transform: `scale(${0.7 + aE * 0.3})`, display: 'inline-block', transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
            {valueA}
          </span>
          <span style={{ ...big, fontSize: 56, color: 'rgba(255,255,255,0.5)' }}>vs</span>
          <span style={{ ...big, color: '#fff', opacity: bE, transform: `translateY(${(1 - bE) * 20}px)`, display: 'inline-block', transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
            {valueB}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 2.5,
            background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.12)})`,
            boxShadow: `0 0 12px ${accentAlpha(0.45)}`,
            transform: `scaleX(${bE})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s linear',
          }}
        />
        {subEyebrow && (
          <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>
            {subEyebrow}
          </div>
        )}
      </div>
    </div>
  )
}