import type { EffectProps } from '../../../types'
import { atomStyle, popStyle, seg } from '../explainKit'

/** 解说元素·强调药丸：琥珀色，用于转折 / 强调短板（"但它没有行动能力"）。 */
export default function AtomAmberPill({ params, progress }: EffectProps) {
  const text = String(params.text ?? '但它没有行动能力')
  const size = Number(params.size ?? 38)
  const bg = String(params.bg ?? '#f2a63a')
  const color = String(params.color ?? '#ffffff')
  const shadow = params.shadow !== false
  const t = seg(progress, 0, 0.15)

  return (
    <div style={atomStyle(1)}>
      <div
        style={{
          background: bg,
          color,
          fontSize: size,
          fontWeight: 700,
          lineHeight: 1.35,
          padding: `${Math.round(size * 0.5)}px ${Math.round(size * 1.05)}px`,
          borderRadius: Math.round(size * 0.42),
          boxShadow: shadow ? '0 10px 26px rgba(214, 141, 32, 0.32)' : 'none',
          maxWidth: Number(params.maxWidth ?? 1500),
          ...popStyle(t),
        }}
      >
        {text}
      </div>
    </div>
  )
}
