import type { EffectProps } from '../../../types'
import { atomStyle, popStyle, seg } from '../explainKit'

/** 解说元素·编号行：序号圆片 + 一句话。清单里的一条，要几条就叠几张。 */
export default function AtomNumberRow({ params, progress }: EffectProps) {
  const index = String(params.index ?? '1')
  const text = String(params.text ?? '给它一个目标')
  const size = Number(params.size ?? 34)
  const bg = String(params.bg ?? '#ffffff')
  const color = String(params.color ?? '#1d1e22')
  const indexBg = String(params.indexBg ?? '#22252d')
  const indexColor = String(params.indexColor ?? '#ffffff')
  const shadow = params.shadow !== false
  const t = seg(progress, 0, 0.15)

  return (
    <div style={atomStyle(1)}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: Math.round(size * 0.7),
          background: bg,
          borderRadius: Math.round(size * 0.55),
          padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.9)}px`,
          boxShadow: shadow ? '0 6px 18px rgba(24, 26, 32, 0.10)' : 'none',
          border: '1px solid rgba(24, 26, 32, 0.05)',
          maxWidth: Number(params.maxWidth ?? 1500),
          ...popStyle(t, 0.82),
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: Math.round(size * 1.35),
            height: Math.round(size * 1.35),
            padding: '0 8px',
            borderRadius: '50%',
            background: indexBg,
            color: indexColor,
            fontSize: Math.round(size * 0.66),
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index}
        </span>
        <span style={{ fontSize: size, fontWeight: 600, color }}>{text}</span>
      </div>
    </div>
  )
}
