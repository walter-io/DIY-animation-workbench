import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·脚注小字：页脚补充说明、数据来源、口径备注。 */
export default function AtomCaption({ params, progress }: EffectProps) {
  const text = String(params.text ?? '数据来自公开资料整理')
  const size = Number(params.size ?? 26)
  const color = String(params.color ?? 'rgba(29, 30, 34, 0.55)')
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
      <div style={{ fontSize: size, fontWeight: 500, color, textAlign: align, maxWidth, whiteSpace: 'pre-wrap' }}>
        {text}
      </div>
    </div>
  )
}
