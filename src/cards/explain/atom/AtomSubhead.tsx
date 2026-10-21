import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·副标题：比大标题小一号的补充句 / 提问句。 */
export default function AtomSubhead({ params, progress }: EffectProps) {
  const text = String(params.text ?? '它到底多出来的那一步是什么')
  const size = Number(params.size ?? 46)
  const weight = Number(params.weight ?? 600)
  const color = String(params.color ?? 'rgba(29, 30, 34, 0.72)')
  const align = (String(params.align ?? 'left') || 'left') as 'left' | 'center' | 'right'
  const maxWidth = Number(params.maxWidth ?? 1400)
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
          lineHeight: 1.35,
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
