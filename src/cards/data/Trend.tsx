import type { EffectProps } from '../../types'
import { Subtext, CountUp, TrendArrow } from '../../components/primitives'

/** 趋势卡：箭头 + 大数字 + 幅度 */
export function TrendCard({ params, progress }: EffectProps) {
  const label = String(params.label ?? '周环比')
  const value = Number(params.value ?? 32)
  const up = params.trend !== 'down'
  const color = up ? 'var(--stage-data)' : 'var(--stage-assist)'
  return (
    <div className="os-card" style={{ display: 'flex', alignItems: 'center', gap: 18, width: '100%' }}>
      <TrendArrow up={up} size={44} color={color} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <CountUp value={value} suffix="%" size={72} progress={progress} delay={0.1} />
        <Subtext text={label} size={16} progress={progress} delay={0.35} />
      </div>
    </div>
  )
}
