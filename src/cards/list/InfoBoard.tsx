import type { EffectProps } from '../../types'
import { Headline, Divider } from '../../components/primitives'

/** 信息板卡：标题 + 多行结构化内容 */
export function InfoBoardCard({ params, progress, isPreview }: EffectProps) {
  const title = String(params.title ?? '本段要点板')
  const rows = String(params.rows ?? '结论一,数据支撑充足\n结论二,路径已经跑通\n结论三,可复制可放大').split('\n').filter(Boolean)
  return (
    <div
      className="os-card"
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: isPreview ? 10 : 18, width: '100%', height: '100%', minHeight: '100%' }}
    >
      <Headline text={title} size={isPreview ? 22 : 46} progress={progress} delay={0.05} />
      <Divider progress={progress} delay={0.15} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, gap: isPreview ? 8 : 14, marginTop: 4, width: '100%' }}>
        {rows.map((r, i) => {
          const d = 0.18 + i * 0.12
          const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
          const [k, v] = r.split(',')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isPreview ? 10 : 16,
                width: '100%',
                padding: isPreview ? '8px 12px' : '16px 20px',
                border: '1px solid var(--stage-border)',
                borderRadius: isPreview ? 8 : 12,
                background: 'var(--stage-surface-strong)',
                boxSizing: 'border-box',
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
                transition: 'opacity 0.1s linear, transform 0.1s linear',
              }}
            >
              <span style={{ fontSize: isPreview ? 13 : 26, fontWeight: 700, color: 'var(--stage-special)', minWidth: isPreview ? 48 : 108, flexShrink: 0 }}>{k}</span>
              <span style={{ fontSize: isPreview ? 13 : 26, color: 'var(--stage-text-muted)', lineHeight: 1.3 }}>{v ?? ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
