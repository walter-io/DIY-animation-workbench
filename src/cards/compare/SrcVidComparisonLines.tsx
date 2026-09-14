import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E04 Comparison Lines 对比文字
 * “...越来越多 / 没有变多”两行对比强调。
 */
export default function SrcVidComparisonLines({ params, progress }: EffectProps) {
  const line1 = String(params.line1 ?? '工具越来越多')
  const line2 = String(params.line2 ?? '真正做出来的内容却没有变多')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.45))
  const t2 = Math.max(0, Math.min(1, (progress - 0.25) / 0.5))
  const e1 = applyEasing(t1, 'easeOutQuart')
  const e2 = applyEasing(t2, 'easeOutQuart')

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
        paddingLeft: 40,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#fff',
          opacity: e1,
          transform: `translateX(${(1 - e1) * -30}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {line1}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent,
          marginTop: 6,
          textShadow: `0 0 14px ${accentAlpha(0.4)}`,
          opacity: e2,
          transform: `translateX(${(1 - e2) * -30}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {line2}
      </div>
    </div>
  )
}
