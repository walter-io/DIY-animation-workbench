import type { EffectProps } from '../../types'
import { Subtext, CountUp } from '../../components/primitives'

/** 双数字对比卡：A vs B */
export function DualNumberCard({ params, progress }: EffectProps) {
  const leftLabel = String(params.leftLabel ?? '上月')
  const rightLabel = String(params.rightLabel ?? '本月')
  const left = Number(params.left ?? 1200)
  const right = Number(params.right ?? 3400)
  return (
    <div className="os-card" style={{ display: 'flex', gap: 36, width: '100%', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Subtext text={leftLabel} size={15} progress={progress} delay={0.05} />
        <CountUp value={left} size={64} progress={progress} delay={0.1} />
      </div>
      <div style={{ width: 1, background: 'var(--stage-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <Subtext text={rightLabel} size={15} progress={progress} delay={0.2} />
        <CountUp value={right} size={64} progress={progress} delay={0.3} />
      </div>
    </div>
  )
}
