import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E34 ·  · 首测答案卡
 * 视觉：描边圆角面板 —— eyebrow 小字 + 大号橙色答案 + 右侧 ⊗ 圆圈图标。
 * 来源：FIRST TEST / ANSWER — "没有" ⊗
 */
export default function ReplicaAnswerCard({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'FIRST TEST / ANSWER')
  const answer = String(params.answer ?? '没有')
  const icon = String(params.icon ?? 'x') // x | check
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutQuart')
  const iconT = Math.max(0, Math.min(1, (progress - 0.2) / 0.35))
  const iconE = applyEasing(iconT, 'easeOutBack')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          width: 460,
          padding: '18px 26px 22px',
          borderRadius: 10,
          border: `1px solid ${accentAlpha(0.55)}`,
          background: 'rgba(10,10,12,0.82)',
          boxShadow: `0 0 24px ${accentAlpha(0.16)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          opacity: e,
          transform: `translateY(${(1 - e) * 18}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.55)' }}>
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 46,
              fontWeight: 900,
              color: accent,
              lineHeight: 1.1,
              textShadow: `0 0 18px ${accentAlpha(0.4)}`,
            }}
          >
            {answer}
          </div>
        </div>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: `2px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            fontSize: 26,
            fontWeight: 900,
            boxShadow: `0 0 16px ${accentAlpha(0.35)}`,
            opacity: iconE,
            transform: `scale(${0.5 + iconE * 0.5})`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {icon === 'check' ? '✓' : '✕'}
        </div>
      </div>
    </div>
  )
}