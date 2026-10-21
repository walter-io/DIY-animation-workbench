import type { EffectProps } from '../../types'
import { AmberPill, inkAlpha, paperStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·结尾页：总结一句 + 琥珀 CTA 药丸 + 可选落款（关注 / 下期预告）。
 * 知识解说片的收尾整页。
 */
export default function ExplainerEnd({ params, progress }: EffectProps) {
  const summary = String(params.summary ?? '语言能力 + 执行框架 = 这一代应用的新底座')
  const cta = String(params.cta ?? '关注我，下期讲 Agent 的执行框架')
  const sign = String(params.sign ?? '')

  const tSummary = seg(progress, 0.04, 0.18)
  const tCta = seg(progress, 0.24, 0.16)
  const tSign = seg(progress, 0.4, 0.14)

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 48 }}>
      <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.3, maxWidth: 1560, ...riseStyle(tSummary, 30) }}>
        {summary}
      </div>
      <AmberPill text={cta} t={tCta} size={40} />
      {sign && (
        <div style={{ fontSize: 28, fontWeight: 500, color: inkAlpha(0.55), ...riseStyle(tSign, 14) }}>
          {sign}
        </div>
      )}
    </div>
  )
}
