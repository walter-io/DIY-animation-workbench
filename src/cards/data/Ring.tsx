import type { EffectProps } from '../../types'
import { Subtext, Ring } from '../../components/primitives'

/** 环形百分比卡 */
export function RingCard({ params, progress }: EffectProps) {
  const label = String(params.label ?? '转化率')
  const pct = Number(params.pct ?? 64)
  const sub = String(params.sub ?? '较上期提升')
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
      <Ring ratio={pct / 100} progress={progress} delay={0.1} size={190} label={`${pct}%`} sublabel={label} />
      <Subtext text={sub} size={14} progress={progress} delay={0.5} />
    </div>
  )
}
