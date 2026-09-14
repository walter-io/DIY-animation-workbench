import type { EffectProps } from '../../types'
import { Subtext, CountUp, TrendArrow } from '../../components/primitives'

/** KPI 单指标卡：标签 + 大数字 + 涨跌 */
export function KpiCard({ params, progress }: EffectProps) {
  const label = String(params.label ?? '核心指标')
  const target = Number(params.target ?? 35800)
  const suffix = String(params.suffix ?? '')
  const unit = String(params.unit ?? '')
  const up = params.trend !== 'down'
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <Subtext text={label} size={16} uppercase progress={progress} delay={0.02} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CountUp value={target} suffix={suffix} size={84} progress={progress} delay={0.08} />
        <TrendArrow up={up} size={26} />
      </div>
      <Subtext text={unit} size={14} progress={progress} delay={0.4} />
    </div>
  )
}
