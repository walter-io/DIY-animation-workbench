import type { EffectProps } from '../../../types'
import { atomStyle, popStyle, seg } from '../explainKit'

/** 解说元素·深色药丸：一句话关键结论（白字深底）。 */
export default function AtomNavyPill({ params, progress }: EffectProps) {
  const text = String(params.text ?? '核心能力就一件事：思考和语言')
  const size = Number(params.size ?? 36)
  const bg = String(params.bg ?? '#22252d')
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
          boxShadow: shadow ? '0 10px 26px rgba(24, 26, 32, 0.22)' : 'none',
          maxWidth: Number(params.maxWidth ?? 1500),
          ...popStyle(t),
        }}
      >
        {text}
      </div>
    </div>
  )
}
