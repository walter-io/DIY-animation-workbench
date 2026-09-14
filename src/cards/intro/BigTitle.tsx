import type { EffectProps } from '../../types'
import { Headline, Subtext, Divider, Tag } from '../../components/primitives'

/** 大标题卡：一句大字 + 副题 */
export function BigTitleCard({ params, progress }: EffectProps) {
  const title = String(params.title ?? '一句话讲清价值')
  const subtitle = String(params.subtitle ?? '副标题补充说明')
  const kicker = String(params.kicker ?? '开场')
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      <Tag text={kicker} progress={progress} delay={0.02} />
      <Headline text={title} size={64} progress={progress} delay={0.08} />
      <Subtext text={subtitle} size={20} progress={progress} delay={0.3} />
      <Divider progress={progress} delay={0.4} />
    </div>
  )
}
