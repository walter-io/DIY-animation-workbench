import type { EffectProps } from '../../types'
import { Subtext, BulletItem } from '../../components/primitives'

/** 要点清单卡：多行圆点要点 */
export function BulletListCard({ params, progress, meta, isPreview }: EffectProps) {
  const title = String(params.title ?? '三个要点')
  const items = String(params.items ?? '第一点\n第二点\n第三点').split('\n').filter(Boolean)
  const centered = meta?.slot === 'center'
  return (
    <div
      className="os-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: centered ? 'center' : 'stretch',
        gap: isPreview ? 16 : 24,
        width: '100%',
        height: isPreview ? undefined : '100%',
        minHeight: isPreview ? undefined : '100%',
        textAlign: centered ? 'center' : 'left',
      }}
    >
      <Subtext text={title} size={isPreview ? 16 : 24} uppercase progress={progress} delay={0.02} align={centered ? 'center' : 'left'} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: centered ? 'center' : 'stretch',
          flex: isPreview ? undefined : 1,
          gap: isPreview ? 12 : 20,
          width: '100%',
        }}
      >
        {items.map((it, i) => (
          <BulletItem key={i} text={it} index={i} progress={progress} center={centered} compact={isPreview} />
        ))}
      </div>
    </div>
  )
}
