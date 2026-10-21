import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·箭头：串在两个元素之间的连接符（→ / ↓）。 */
export default function AtomArrow({ params, progress }: EffectProps) {
  const dir = String(params.dir ?? 'right')
  const size = Number(params.size ?? 46)
  const color = String(params.color ?? 'rgba(29, 30, 34, 0.35)')
  const glyph = dir === 'down' ? '↓' : dir === 'up' ? '↑' : dir === 'left' ? '←' : '→'
  const t = seg(progress, 0, 0.15)

  return (
    <div style={{ ...atomStyle(t), alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size, fontWeight: 700, color, lineHeight: 1 }}>{glyph}</span>
    </div>
  )
}
