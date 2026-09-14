import type { EffectProps } from '../../types'
import { Subtext } from '../../components/primitives'

/** 时间线卡：多节点竖排时间点 */
export function TimelineCard({ params, progress }: EffectProps) {
  const title = String(params.title ?? '关键节点')
  const items = String(params.items ?? '3月,项目启动\n5月,首版上线\n8月,用户破万').split('\n').filter(Boolean)
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <Subtext text={title} size={15} uppercase progress={progress} delay={0.02} />
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--stage-border)' }} />
        {items.map((it, i) => {
          const d = 0.1 + i * 0.13
          const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
          const [k, v] = it.split(',')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                padding: '7px 0',
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
                transition: 'opacity 0.1s linear, transform 0.1s linear',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: '2px solid var(--stage-primary)',
                  background: 'var(--stage-bg)',
                  alignSelf: 'center',
                  marginTop: 6,
                }}
              />
              <span style={{ fontSize: 15, color: 'var(--stage-primary)', fontWeight: 700, minWidth: 44, fontVariantNumeric: 'tabular-nums' }}>{k}</span>
              <span style={{ fontSize: 18, color: 'var(--stage-text)' }}>{v ?? ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
