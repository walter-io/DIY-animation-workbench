import type { EffectProps } from '../../types'
import { Headline, Subtext } from '../../components/primitives'

/** 结尾 CTA 卡：行动号召 */
export function CtaCard({ params, progress }: EffectProps) {
  const text = String(params.text ?? '关注我，下期继续')
  const sub = String(params.sub ?? '每周更新实战干货')
  const btn = String(params.btn ?? '立即关注')
  const reveal = Math.max(0, Math.min(1, (progress - 0.3) / 0.7))
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%', textAlign: 'center' }}>
      <Headline text={text} size={52} progress={progress} delay={0.05} align="center" />
      <Subtext text={sub} size={18} progress={progress} delay={0.25} />
      <div
        style={{
          marginTop: 10,
          padding: '14px 44px',
          borderRadius: 999,
          background: 'var(--stage-primary)',
          color: 'var(--stage-bg)',
          fontSize: 22,
          fontWeight: 700,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * 12}px)`,
          transition: 'opacity 0.1s linear, transform 0.1s linear',
        }}
      >
        {btn}
      </div>
    </div>
  )
}
