import type { EffectProps } from '../../types'

/** 堆叠占比卡：两段占比条 */
export function StackBarCard({ params, progress }: EffectProps) {
  const leftLabel = String(params.leftLabel ?? '老用户')
  const rightLabel = String(params.rightLabel ?? '新用户')
  const leftPct = Math.max(0, Math.min(100, Number(params.leftPct ?? 62)))
  const rightPct = 100 - leftPct
  const t = Math.max(0, Math.min(1, (progress - 0.15) / 0.85))
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <div style={{ display: 'flex', height: 26, borderRadius: 8, overflow: 'hidden', opacity: t, transition: 'opacity 0.1s linear' }}>
        <div style={{ width: `${leftPct * t}%`, background: 'var(--stage-data)', transition: 'width 0.1s linear' }} />
        <div style={{ width: `${rightPct * t}%`, background: 'var(--stage-assist)', transition: 'width 0.1s linear' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 16, color: 'var(--stage-text-muted)' }}>
          {leftLabel} <b style={{ color: 'var(--stage-data)' }}>{Math.round(leftPct * t)}%</b>
        </span>
        <span style={{ fontSize: 16, color: 'var(--stage-text-muted)' }}>
          {rightLabel} <b style={{ color: 'var(--stage-assist)' }}>{Math.round(rightPct * t)}%</b>
        </span>
      </div>
    </div>
  )
}
