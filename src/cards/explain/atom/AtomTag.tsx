import type { EffectProps } from '../../../types'
import { atomStyle, popStyle, seg } from '../explainKit'

/** 解说元素·标签：一颗圆角药丸标签（默认白底深字）。要一排就多叠几张。 */
export default function AtomTag({ params, progress }: EffectProps) {
  const text = String(params.text ?? '可以聊天')
  const size = Number(params.size ?? 30)
  const bg = String(params.bg ?? '#ffffff')
  const color = String(params.color ?? '#1d1e22')
  const border = params.border !== false
  const shadow = params.shadow !== false
  const t = seg(progress, 0, 0.15)

  return (
    <div style={atomStyle(1)}>
      <div
        style={{
          background: bg,
          color,
          fontSize: size,
          fontWeight: 600,
          lineHeight: 1.3,
          padding: `${Math.round(size * 0.46)}px ${Math.round(size * 0.95)}px`,
          borderRadius: 999,
          border: border ? '1px solid rgba(24, 26, 32, 0.08)' : 'none',
          boxShadow: shadow ? '0 6px 18px rgba(24, 26, 32, 0.10)' : 'none',
          whiteSpace: 'nowrap',
          ...popStyle(t),
        }}
      >
        {text}
      </div>
    </div>
  )
}
