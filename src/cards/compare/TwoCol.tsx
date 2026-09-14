import type { EffectProps } from '../../types'

/** 双列清单卡：左右两列各若干条 */
export function TwoColCard({ params, progress }: EffectProps) {
  const leftTitle = String(params.leftTitle ?? '优势')
  const rightTitle = String(params.rightTitle ?? '短板')
  const left = String(params.left ?? '上手快\n成本低').split('\n').filter(Boolean)
  const right = String(params.right ?? '波动大\n依赖渠道').split('\n').filter(Boolean)
  const col = (title: string, items: string[], color: string, base: number) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>{title}</span>
      {items.map((it, i) => {
        const d = base + i * 0.1
        const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
        return (
          <span
            key={i}
            style={{
              fontSize: 18,
              color: 'var(--stage-text)',
              opacity: t,
              transform: `translateY(${(1 - t) * 8}px)`,
              transition: 'opacity 0.1s linear, transform 0.1s linear',
            }}
          >
            {it}
          </span>
        )
      })}
    </div>
  )
  return (
    <div className="os-card" style={{ display: 'flex', gap: 32, width: '100%' }}>
      {col(leftTitle, left, 'var(--stage-data)', 0.1)}
      <div style={{ width: 1, background: 'var(--stage-border)' }} />
      {col(rightTitle, right, 'var(--stage-assist)', 0.25)}
    </div>
  )
}
