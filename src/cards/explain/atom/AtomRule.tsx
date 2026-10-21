import type { EffectProps } from '../../../types'
import { atomStyle, seg } from '../explainKit'

/** 解说元素·分隔短线：标题下的一小截横线，做视觉锚点。 */
export default function AtomRule({ params, progress }: EffectProps) {
  const width = Number(params.width ?? 160)
  const thickness = Number(params.thickness ?? 8)
  const color = String(params.color ?? '#f2a63a')
  const radius = Number(params.radius ?? 4)
  const grow = params.grow !== false
  const t = seg(progress, 0, 0.15)
  const w = grow ? width * t : width

  return (
    <div style={{ ...atomStyle(1), alignItems: 'center' }}>
      <div
        style={{
          width: w,
          height: thickness,
          borderRadius: radius,
          background: color,
          opacity: grow ? 1 : t,
        }}
      />
    </div>
  )
}
