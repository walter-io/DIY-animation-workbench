import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·大标题：一页里最大的那句话。可单独用，也可以叠在空白底板上。 */
export default function AtomHeadline({ params, progress }: EffectProps) {
  const text = String(params.text ?? '这一页要说的重点')
  const size = Number(params.size ?? 88)
  const weight = Number(params.weight ?? 800)
  const color = String(params.color ?? '#1d1e22')
  const align = (String(params.align ?? 'left') || 'left') as 'left' | 'center' | 'right'
  const maxWidth = Number(params.maxWidth ?? 1500)
  const t = seg(progress, 0, 0.15)

  return (
    <div
      style={{
        ...atomStyle(t),
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          fontSize: size,
          fontWeight: weight,
          lineHeight: 1.25,
          color,
          textAlign: align,
          maxWidth,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  )
}
