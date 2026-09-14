import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E02 Keyword Pop 关键词高亮
 * “包括这一条”青绿描边发光徽章弹出。
 */
export default function SrcVidKeywordPop({ params, progress }: EffectProps) {
  const text = String(params.text ?? '包括这一条')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutBack')

  const glowPulse = progress > 0.45 && progress < 0.7 ? Math.sin((progress - 0.45) / 0.25 * Math.PI) : 0

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
          padding: '10px 26px',
          border: `1.5px solid ${accent}`,
          borderRadius: 999,
          background: `${accentAlpha(0.08)}`,
          boxShadow: `0 0 ${28 + glowPulse * 16}px ${accentAlpha(0.25)}, inset 0 0 16px ${accentAlpha(0.08)}`,
          fontSize: 30,
          fontWeight: 800,
          color: '#fff',
          textShadow: `0 0 16px ${accentAlpha(0.5)}`,
          opacity: e,
          transform: `scale(${0.4 + e * 0.6})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {text}
      </div>
    </div>
  )
}
