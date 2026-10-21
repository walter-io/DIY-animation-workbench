import type { EffectProps } from '../../../types'
import { atomStyle, seg, splitList } from '../explainKit'

/** 解说元素·正文段落：多行说明文字，换行即分段。 */
export default function AtomParagraph({ params, progress }: EffectProps) {
  const lines = splitList(params.text, '第一句说明。\n第二句说明。', 8)
  const size = Number(params.size ?? 30)
  const lineHeight = Number(params.lineHeight ?? 1.6)
  const color = String(params.color ?? 'rgba(29, 30, 34, 0.8)')
  const align = (String(params.align ?? 'left') || 'left') as 'left' | 'center' | 'right'
  const maxWidth = Number(params.maxWidth ?? 1300)
  const t = seg(progress, 0, 0.15)

  return (
    <div
      style={{
        ...atomStyle(t),
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      <div style={{ maxWidth, textAlign: align }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: size,
              lineHeight,
              color,
              opacity: Math.min(1, Math.max(0, (t - i * 0.08) * 4)),
              transform: `translateY(${(1 - Math.min(1, Math.max(0, (t - i * 0.08) * 4))) * 10}px)`,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
