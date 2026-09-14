import type { EffectProps } from '../../types'

/** 对比表卡：两列三行简易表 */
export function CompareTableCard({ params, progress }: EffectProps) {
  const leftHead = String(params.leftHead ?? '旧方案')
  const rightHead = String(params.rightHead ?? '新方案')
  const rows = String(params.rows ?? '耗时,2 小时,10 分钟\n成本,高,低\n效果,一般,显著').split('\n').filter(Boolean)
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1fr 1fr', gap: 12, paddingBottom: 10, borderBottom: '1px solid var(--stage-border)' }}>
        <span style={{ fontSize: 14, color: 'var(--stage-text-muted)' }}>维度</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--stage-text-muted)' }}>{leftHead}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--stage-data)' }}>{rightHead}</span>
      </div>
      {rows.map((r, i) => {
        const d = 0.12 + i * 0.12
        const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
        const [dim, a, b] = r.split(',')
        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '0.8fr 1fr 1fr',
              gap: 12,
              padding: '10px 0',
              borderBottom: i < rows.length - 1 ? '1px solid var(--stage-border)' : 'none',
              opacity: t,
              transform: `translateY(${(1 - t) * 8}px)`,
              transition: 'opacity 0.1s linear, transform 0.1s linear',
            }}
          >
            <span style={{ fontSize: 15, color: 'var(--stage-text-muted)' }}>{dim}</span>
            <span style={{ fontSize: 17, color: 'var(--stage-text)' }}>{a ?? ''}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--stage-data)' }}>{b ?? ''}</span>
          </div>
        )
      })}
    </div>
  )
}
