import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'
import { slotOrigin } from '../../components/primitives'

/**
 * 3D 数据竞速卡
 *
 * 视频中"十国 GDP 竞速"效果：立体柱、按数值排序、右侧排名侧板、
 * 年份角标。统一为暗色玻璃质感。
 */
export default function BarChart3D({ params, progress, meta }: EffectProps) {
  const title = String(params.title ?? '3D 数据竞速')
  const subtitle = String(params.subtitle ?? 'TOP 10 排名')
  const year = String(params.year ?? '2024')
  const unit = String(params.unit ?? '')
  const showRank = params.showRank !== false
  const size = Number(params.size ?? 1)
  const rawRows = String(
    params.rows ??
      '美国,26.9,#fbbf24\n中国,17.8,#ef4444\n日本,4.2,#f8fafc\n德国,4.1,#60a5fa\n印度,3.5,#a78bfa\n英国,3.3,#3b82f6\n法国,3.0,#34d399\n俄罗斯,2.0,#f87171\n加拿大,2.1,#818cf8\n韩国,1.7,#f472b6'
  )
    .split('\n')
    .map((line) => line.split(','))
    .filter((a) => a.length >= 2)
    .map(([name, value, color]) => ({
      name: name.trim(),
      value: Number(value.trim()) || 0,
      color: (color ?? 'var(--stage-data)').trim(),
    }))

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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            opacity: headEased,
            transform: `translateY(${(1 - headEased) * 16}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--stage-text-muted)' }}>
            {subtitle}
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--stage-accent)', lineHeight: 1.1 }}>{title}</div>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: 'var(--stage-primary)',
            lineHeight: 1,
            opacity: headEased,
            transform: `translateY(${(1 - headEased) * 20}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            textShadow: '0 0 28px var(--stage-primary)',
          }}
        >
          {year}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rows.slice(0, 8).map((row, i) => {
            const local = Math.max(0, Math.min(1, (progress - 0.18 - i * 0.05) / 0.72))
            const eased = applyEasing(local, 'easeOutQuart')
            const valueShown = Math.round(row.value * eased * 10) / 10
            const ratio = row.value / max
            return (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 70, fontSize: 14, fontWeight: 600, color: 'var(--stage-text-muted)', textAlign: 'right', flexShrink: 0 }}>
                  {row.name}
                </div>
                <div style={{ flex: 1, height: 32, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      bottom: 0,
                      height: '100%',
                      width: `${ratio * 100}%`,
                      transformOrigin: 'left bottom',
                      transform: `scaleX(${eased})`,
                      transition: 'transform 0.1s linear',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: row.color,
                        borderRadius: '4px 4px 0 0',
                        boxShadow: `0 0 18px ${row.color}66`,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '35%',
                        background: `linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 100%)`,
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: 0,
                        right: 0,
                        height: 10,
                        background: row.color,
                        borderRadius: 2,
                        transform: 'skewX(-30deg) translateX(3px)',
                        opacity: 0.7,
                        filter: 'brightness(1.15)',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -10,
                        width: 12,
                        height: 'calc(100% + 6px)',
                        background: `linear-gradient(90deg, ${row.color} 0%, ${row.color}dd 100%)`,
                        transform: 'skewY(-60deg) translateY(-3px)',
                        opacity: 0.55,
                        borderRadius: '0 4px 0 0',
                      }}
                    />
                  </div>
                </div>
                <div style={{ minWidth: 80, fontSize: 16, fontWeight: 700, color: 'var(--stage-accent)', fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                  {valueShown.toLocaleString('en-US')}
                  {unit ? <span style={{ fontSize: 12, fontWeight: 500, marginLeft: 2 }}>{unit}</span> : null}
                </div>
              </div>
            )
          })}
        </div>

        {showRank && (
          <div
            style={{
              minWidth: 150,
              background: 'var(--stage-surface)',
              border: '1px solid var(--stage-border)',
              borderRadius: 12,
              padding: '14px 16px',
              opacity: headEased,
              transform: `translateY(${(1 - headEased) * 16}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--stage-text-muted)', marginBottom: 10 }}>
              当前排名
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.slice(0, 5).map((row, i) => {
                const local = Math.max(0, Math.min(1, (progress - 0.18 - i * 0.06) / 0.72))
                const eased = applyEasing(local, 'easeOut')
                return (
                  <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: eased, transform: `translateX(${(1 - eased) * 12}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--stage-text-muted)', width: 18 }}>{i + 1}</span>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--stage-text)', flex: 1 }}>{row.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--stage-data)', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
