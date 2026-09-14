import type { EffectProps } from '../../types'

/** 标签行卡：多个标签逐个入场 */
export function LabelRowCard({ params, progress }: EffectProps) {
  const labels = String(params.labels ?? '增长\n留存\n转化').split('\n').filter(Boolean)
  return (
    <div className="os-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%', alignItems: 'center' }}>
      {labels.map((l, i) => {
        const d = 0.06 + i * 0.1
        const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
        return (
          <span
            key={i}
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: i === 0 ? 'var(--stage-special)' : 'var(--stage-text)',
              border: `1px solid ${i === 0 ? 'var(--stage-special)' : 'var(--stage-border)'}`,
              borderRadius: 999,
              padding: '8px 20px',
              opacity: t,
              transform: `translateY(${(1 - t) * 10}px)`,
              transition: 'opacity 0.1s linear, transform 0.1s linear',
            }}
          >
            {l}
          </span>
        )
      })}
    </div>
  )
}
