import type { EffectProps } from '../../types'
import { Headline, Subtext } from '../../components/primitives'

/** 引用金句卡：金句 + 署名 */
export function QuoteCard({ params, progress }: EffectProps) {
  const quote = String(params.quote ?? '把复杂留给系统，把简单留给人。')
  const author = String(params.author ?? '—— 某某')
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      <div style={{ fontSize: 56, lineHeight: 0.6, color: 'var(--stage-special)', fontWeight: 700 }}>“</div>
      <Headline text={quote} size={40} progress={progress} delay={0.1} />
      <Subtext text={author} size={16} progress={progress} delay={0.45} />
    </div>
  )
}
