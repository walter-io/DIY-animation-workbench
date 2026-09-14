import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E22 ·  · 顶部品牌卡
 * 视觉：方形彩色 logo + 大品牌名 + 角标 + 下方小 pill 标签。
 * 来源：Codex · OPENAI CODING AGENT + Codex + 零熬夜
 */
export default function ReplicaBrandCard({ params, progress }: EffectProps) {
  const brandLabel = String(params.brandLabel ?? 'OPENAI CODING AGENT')
  const brandName = String(params.brandName ?? 'Codex')
  const pillText = String(params.pillText ?? '零熬夜')
  const logoBg = String(params.logoBg ?? 'var(--stage-primary)')
  const logoColor = String(params.logoColor ?? 'var(--stage-text)')

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutQuart')
  const pT = Math.max(0, Math.min(1, (progress - 0.3) / 0.4))
  const pE = applyEasing(pT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
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
          flexDirection: 'column',
          gap: 8,
          opacity: e,
          transform: `translateY(${(1 - e) * 12}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 品牌卡 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(15,15,18,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: logoBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: logoColor,
              fontSize: 18,
              fontWeight: 900,
              boxShadow: `0 0 14px ${logoBg}`,
            }}
          >
            {brandName.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.6)' }}>
              {brandLabel}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{brandName}</div>
          </div>
        </div>

        {/* 下方 pill */}
        <div
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 999,
            background: ACCENT,
            color: '#0a0a0a',
            fontSize: 12,
            fontWeight: 700,
            opacity: pE,
            transform: `translateX(${(-1 + pE) * 8}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a0a0a' }} />
          {pillText}
        </div>
      </div>
    </div>
  )
}