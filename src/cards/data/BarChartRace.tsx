import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'
import { slotOrigin } from '../../components/primitives'

/**
 * 条形图竞速卡
 *
 * 条形图竞速 + 排名侧板，统一为 2D 玻璃质感。
 */
export default function BarChartRace({ params, progress, meta }: EffectProps) {
  const title = String(params.title ?? '区域数据竞速')
  const subtitle = String(params.subtitle ?? '前十排名变化')
  const unit = String(params.unit ?? '')
  const showRank = params.showRank !== false
  const color = String(params.color ?? 'var(--stage-data)')
  const size = Number(params.size ?? 1)

  const rawRows = String(params.rows ?? '华东,23320\n华南,17730\n华北,12400\n西南,8600\n东北,6200\n华中,5100\n西北,4300\n海外,3200')
    .split('\n')
    .map((line) => line.split(','))
    .filter((a) => a.length >= 2)
    .map(([name, value]) => ({ name: name.trim(), value: Number(value.trim()) || 0 }))

  const rows = [...rawRows].sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...rows.map((r) => r.value))

  const headReveal = Math.max(0, Math.min(1, progress / 0.18))
  const headEased = applyEasing(headReveal, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        transform: `scale(${size})`,
        transformOrigin: slotOrigin(meta.slot),
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: headEased, transform: `translateY(${(1 - headEased) * 16}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--stage-text-muted)' }}>{subtitle}</div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--stage-accent)', lineHeight: 1.1 }}>{title}</div>
        </div>
        {showRank && (
          <div
            style={{
              minWidth: 120,
              background: 'var(--stage-surface)',
              border: '1px solid var(--stage-border)',
              borderRadius: 12,
              padding: '14px 16px',
              opacity: headEased,
              transform: `translateY(${(1 - headEased) * 16}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--stage-text-muted)', marginBottom: 10 }}>排名</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.slice(0, 5).map((row, i) => {
                const local = Math.max(0, Math.min(1, (progress - 0.18 - i * 0.06) / 0.72))
                const eased = applyEasing(local, 'easeOut')
                return (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: eased, transform: `translateX(${(1 - eased) * 12}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--stage-text-muted)', width: 18 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--stage-text)', flex: 1 }}>{row.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--stage-data)', fontVariantNumeric: 'tabular-nums' }}>{row.value.toLocaleString('en-US')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((row, i) => {
          const local = Math.max(0, Math.min(1, (progress - 0.18 - i * 0.07) / 0.72))
          const eased = applyEasing(local, 'easeOutQuart')
          const valueShown = Math.round(row.value * eased)
          return (
            <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 80, fontSize: 14, fontWeight: 600, color: 'var(--stage-text-muted)', textAlign: 'right', flexShrink: 0 }}>{row.name}</div>
              <div style={{ flex: 1, height: 22, background: 'var(--stage-surface)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(row.value / max) * 100}%`,
                    background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
                    borderRadius: 6,
                    transform: `scaleX(${eased})`,
                    transformOrigin: 'left',
                    transition: 'transform 0.1s linear',
                    boxShadow: `0 0 18px ${color}66`,
                  }}
                />
              </div>
              <div style={{ minWidth: 72, fontSize: 16, fontWeight: 700, color: 'var(--stage-accent)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                {valueShown.toLocaleString('en-US')}
                {unit ? <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>{unit}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
