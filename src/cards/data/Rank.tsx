import type { EffectProps } from '../../types'
import { ProgressTrack } from '../../components/primitives'

/** 排行榜卡：TOP3 名次条 */
export function RankCard({ params, progress }: EffectProps) {
  const rows = String(params.rows ?? '短视频,8600\n直播,5200\n图文,3100')
    .split('\n')
    .map((s) => s.split(','))
    .filter((a) => a.length >= 2)
  const max = Math.max(...rows.map(([, v]) => Number(v) || 0), 1)
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {rows.slice(0, 3).map(([k, v], i) => {
        const d = 0.08 + i * 0.14
        const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
        const medals = ['var(--stage-special)', 'var(--stage-text-muted)', 'var(--stage-assist)']
        return (
          <div key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * 12}px)`, transition: 'opacity 0.1s linear, transform 0.1s linear' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--stage-text)' }}>
                <span style={{ color: medals[i % 3], marginRight: 10, fontWeight: 700 }}>{i + 1}</span>
                {k}
              </span>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--stage-data)', fontVariantNumeric: 'tabular-nums' }}>
                {v}
              </span>
            </div>
            <ProgressTrack ratio={(Number(v) || 0) / max} progress={progress} delay={d} height={8} color={medals[i % 3]} />
          </div>
        )
      })}
    </div>
  )
}
