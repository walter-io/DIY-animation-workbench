import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E09 Statement Card 观点卡
 * 居中大字观点卡 + 左右竖线。
 */
export default function SrcVidStatementCard({ params, progress }: EffectProps) {
  const text = String(params.text ?? 'AI 是放大创作者\n不是替代')
  const accent = ACCENT
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean)

  const barT = Math.max(0, Math.min(1, progress / 0.4))
  const barE = applyEasing(barT, 'easeOutQuart')
  const textT = Math.max(0, Math.min(1, (progress - 0.2) / 0.5))
  const textE = applyEasing(textT, 'easeOutQuart')

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 4,
            height: 56,
            background: accent,
            borderRadius: 2,
            boxShadow: `0 0 12px ${accent}`,
            transform: `scaleY(${barE})`,
            transformOrigin: 'center bottom',
            transition: 'transform 0.1s linear',
          }}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: '#fff',
            textAlign: 'center',
            lineHeight: 1.35,
            opacity: textE,
            transform: `translateY(${(1 - textE) * 20}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
        <div
          style={{
            width: 4,
            height: 56,
            background: accent,
            borderRadius: 2,
            boxShadow: `0 0 12px ${accent}`,
            transform: `scaleY(${barE})`,
            transformOrigin: 'center top',
            transition: 'transform 0.1s linear',
          }}
        />
      </div>
    </div>
  )
}
