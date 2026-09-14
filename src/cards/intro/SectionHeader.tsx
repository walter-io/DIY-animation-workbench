import type { EffectProps } from '../../types'
import { Headline, Subtext } from '../../components/primitives'

/** 段头卡：章节编号 + 段名 */
export function SectionHeaderCard({ params, progress, isPreview }: EffectProps) {
  const num = String(params.num ?? '01')
  const title = String(params.title ?? '第一部分')
  const subtitle = String(params.subtitle ?? '本段讲什么')
  return (
    <div
      className="os-card"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isPreview ? 14 : 40, width: '100%', height: '100%', minHeight: '100%' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: isPreview ? 42 : 108,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            color: 'var(--stage-primary)',
            opacity: Math.min(1, progress * 4),
            transition: 'opacity 0.1s linear',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {num}
        </span>
      </div>
      <div style={{ width: 2, alignSelf: 'stretch', background: 'var(--stage-border)', margin: '8px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Headline text={title} size={isPreview ? 24 : 68} progress={progress} delay={0.12} />
        <Subtext text={subtitle} size={isPreview ? 12 : 26} progress={progress} delay={0.35} />
      </div>
    </div>
  )
}
