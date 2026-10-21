import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·大数字：从 0 滚到目标值，配前缀/后缀（"100 倍"、"3 步"）。 */
export default function AtomBigNumber({ params, progress }: EffectProps) {
  const target = Number(params.target ?? 100)
  const decimals = Math.max(0, Math.min(4, Number(params.decimals ?? 0)))
  const prefix = String(params.prefix ?? '')
  const suffix = String(params.suffix ?? ' 倍')
  const size = Number(params.size ?? 150)
  const color = String(params.color ?? '#1d1e22')
  const suffixColor = String(params.suffixColor ?? 'rgba(29, 30, 34, 0.6)')
  const label = String(params.label ?? '')
  const labelSize = Number(params.labelSize ?? 36)

  // 数字滚动：progress 0.05~0.6 走完
  const roll = seg(progress, 0.05, 0.55)
  const value = (target * roll).toFixed(decimals)
  const t = seg(progress, 0, 0.15)

  return (
    <div style={{ ...atomStyle(t), flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      {label && (
        <div style={{ fontSize: labelSize, fontWeight: 600, color: suffixColor }}>{label}</div>
      )}
      <div
        style={{
          fontSize: size,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: -2,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {prefix}
        {value}
        {suffix && (
          <span style={{ fontSize: Math.round(size * 0.38), fontWeight: 700, color: suffixColor, marginLeft: 10 }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}
