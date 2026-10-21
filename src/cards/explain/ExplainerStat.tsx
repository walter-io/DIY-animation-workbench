import type { EffectProps } from '../../types'
import { Eyebrow, EX_INK_VAR, NavyPill, inkAlpha, paperStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·数据页：大数字滚动 + 指标名 + 可选深色结论药丸。
 * 纸感底上的特大号数字，适合解说里"抛一个关键数据"的时刻。
 */
export default function ExplainerStat({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '一个数字')
  const label = String(params.label ?? '训练一次的成本')
  const target = Number(params.target ?? 100)
  const decimals = Math.max(0, Math.min(4, Number(params.decimals ?? 0)))
  const prefix = String(params.prefix ?? '')
  const suffix = String(params.suffix ?? ' 万美元')
  const pill = String(params.pill ?? '')

  const tEyebrow = seg(progress, 0.02)
  const tLabel = seg(progress, 0.08, 0.14)
  // 数字从 0 滚到目标值：progress 0.12~0.62 之间走完
  const roll = seg(progress, 0.12, 0.5)
  const value = (target * roll).toFixed(decimals)
  const tPill = seg(progress, 0.66, 0.14)

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 30 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ fontSize: 40, fontWeight: 600, color: inkAlpha(0.72), ...riseStyle(tLabel, 18) }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 170,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -3,
          color: EX_INK_VAR,
          fontVariantNumeric: 'tabular-nums',
          ...riseStyle(seg(progress, 0.12, 0.16), 30),
        }}
      >
        {prefix}
        {value}
        <span style={{ fontSize: 64, fontWeight: 700, color: inkAlpha(0.6), marginLeft: 12 }}>
          {suffix}
        </span>
      </div>
      <div style={{ height: 6 }} />
      <NavyPill text={pill} t={tPill} />
    </div>
  )
}
