import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E08 Negation Badge 否定徽章
 * “非一键生成”描边徽章缩放 + 抖动强调。
 */
export default function SrcVidNegationBadge({ params, progress }: EffectProps) {
  const text = String(params.text ?? '非一键生成')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutBack')

  let shake = 0
  if (progress > 0.5 && progress < 0.7) {
    shake = Math.sin((progress - 0.5) / 0.2 * Math.PI * 8) * 3
  }

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
          padding: '14px 32px',
          borderRadius: 999,
          border: `2px solid ${accent}`,
          background: `${accentAlpha(0.08)}`,
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textShadow: `0 0 18px ${accentAlpha(0.45)}`,
          boxShadow: `0 0 30px ${accentAlpha(0.18)}`,
          opacity: e,
          transform: `scale(${0.3 + e * 0.7}) translateX(${shake}px)`,
          transition: 'transform 0.05s linear, opacity 0.1s linear',
        }}
      >
        {text}
      </div>
    </div>
  )
}
