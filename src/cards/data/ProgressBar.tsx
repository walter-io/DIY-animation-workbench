import type { EffectProps } from '../../types'
import { Subtext, ProgressTrack } from '../../components/primitives'

/** 进度条卡：标题 + 百分比 + 轨道 */
export function ProgressBarCard({ params, progress }: EffectProps) {
  const label = String(params.label ?? '目标完成度')
  const pct = Number(params.pct ?? 76)
  const color = String(params.color ?? 'var(--stage-data)')
  const t = Math.max(0, Math.min(1, (progress - 0.15) / 0.85))
  const shown = Math.round(pct * Math.min(1, t * 1.2))
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Subtext text={label} size={17} progress={progress} delay={0.02} />
        <span
          style={{
            fontSize: 40,
            fontWeight: 700,
            color,
            fontVariantNumeric: 'tabular-nums',
            opacity: t,
            transition: 'opacity 0.1s linear',
          }}
        >
          {shown}%
        </span>
      </div>
      <ProgressTrack ratio={pct / 100} progress={progress} delay={0.12} height={14} color={color} />
    </div>
  )
}
