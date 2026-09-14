import type { EffectProps } from '../../types'
import { Subtext, CountUp, Divider } from '../../components/primitives'

export default function CoreNumberRoller({ params, progress }: EffectProps) {
  const label = String(params.label ?? '累计交付')
  const target = Number(params.target ?? 12847)
  const suffix = String(params.suffix ?? '+')
  const align = String(params.align ?? 'center') as 'left' | 'center' | 'right'

  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'
  const align2 = align

  return (
    <div
      className="os-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: justify,
        textAlign: align2,
        gap: 8,
        width: '100%',
      }}
    >
      <Subtext text={label} size={16} uppercase progress={progress} delay={0.02} />
      <CountUp value={target} suffix={suffix} size={96} progress={progress} delay={0.08} />
      <Divider progress={progress} align={align} />
    </div>
  )
}
