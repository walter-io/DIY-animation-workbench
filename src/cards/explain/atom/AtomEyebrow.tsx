import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·引导行：小方块 + 小字（章节号 / 栏目名），页眉用。 */
export default function AtomEyebrow({ params, progress }: EffectProps) {
  const text = String(params.text ?? '01 · 基础概念')
  const size = Number(params.size ?? 26)
  const color = String(params.color ?? 'rgba(29, 30, 34, 0.55)')
  const dotColor = String(params.dotColor ?? '#f2a63a')
  const t = seg(progress, 0, 0.15)

  return (
    <div style={{ ...atomStyle(t), alignItems: 'center', gap: 14 }}>
      <span
        style={{
          width: Math.round(size * 0.55),
          height: Math.round(size * 0.55),
          borderRadius: 4,
          background: dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: size, fontWeight: 600, letterSpacing: 2, color, whiteSpace: 'pre' }}>
        {text}
      </span>
    </div>
  )
}
