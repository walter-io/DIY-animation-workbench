import type { EffectProps } from '../../types'
import { Subtext, CountUp, Bar } from '../../components/primitives'

export default function CompareBars({ params, progress }: EffectProps) {
  const leftLabel = String(params.leftLabel ?? '传统方案')
  const rightLabel = String(params.rightLabel ?? '新方案')
  const leftValue = Number(params.leftValue ?? 42)
  const rightValue = Number(params.rightValue ?? 88)
  const unit = String(params.unit ?? '%')

  const total = Math.max(1, leftValue + rightValue)
  const leftRatio = leftValue / total
  const rightRatio = rightValue / total

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        maxWidth: 720,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--stage-text-muted)',
        }}
      >
        <Subtext text={leftLabel} size={15} progress={progress} />
        <Subtext text={rightLabel} size={15} progress={progress} />
      </div>

      <div
        style={{
          display: 'flex',
          height: 12,
          borderRadius: 6,
          overflow: 'hidden',
          background: 'var(--stage-surface)',
        }}
      >
        <div style={{ width: `${leftRatio * 100}%`, padding: 0 }}>
          <Bar ratio={1} progress={progress} color="rgba(255,255,255,0.5)" delay={0.05} />
        </div>
        <div style={{ width: `${rightRatio * 100}%`, padding: 0 }}>
          <Bar ratio={1} progress={progress} color="var(--stage-accent)" delay={0.1} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <CountUp value={leftValue} size={40} suffix={unit} progress={progress} delay={0.12} />
        <CountUp value={rightValue} size={40} suffix={unit} progress={progress} delay={0.16} />
      </div>
    </div>
  )
}
