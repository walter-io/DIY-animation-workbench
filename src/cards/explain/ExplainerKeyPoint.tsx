import type { EffectProps } from '../../types'
import { Eyebrow, NavyPill, inkAlpha, paperStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·要点页：小标题 + 特大号深色药丸结论。
 * 用来把一段讲解收成"一句话重点"—— 深色药丸是主角，字号比标题页的更大。
 */
export default function ExplainerKeyPoint({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '重点')
  const title = String(params.title ?? 'LLM 到底在做什么')
  const point = String(params.point ?? '把语言变成概率，再变成下一个词')

  const tEyebrow = seg(progress, 0.02)
  const tTitle = seg(progress, 0.08, 0.14)
  const tPoint = seg(progress, 0.2, 0.16)

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 40 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ fontSize: 52, fontWeight: 700, color: inkAlpha(0.72), ...riseStyle(tTitle, 22) }}>
        {title}
      </div>
      <NavyPill text={point} t={tPoint} size={52} />
    </div>
  )
}
