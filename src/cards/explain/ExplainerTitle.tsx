import type { EffectProps } from '../../types'
import { Eyebrow, NavyPill, inkAlpha, paperStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·标题页：整页大标题 + 可选深色药丸结论。
 * 对应知识解说视频的开场页 —— 顶部小字栏目 / 序号，中间特大号标题，下面一句关键结论。
 * 背景默认透明（由底板提供），需要自带底色时把 bg 参数改成米白 / 白色 / 黑色。
 */
export default function ExplainerTitle({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '基础概念 · 01')
  const title = String(params.title ?? 'Large Language Model')
  const titleSub = String(params.titleSub ?? '')
  const pill = String(params.pill ?? '核心能力就一件事：思考和语言')
  const bg = params.bg
  const ink = params.ink

  const tEyebrow = seg(progress, 0.02)
  const tTitle = seg(progress, 0.08, 0.16)
  const tSub = seg(progress, 0.2, 0.12)
  const tPill = seg(progress, 0.3, 0.14)

  return (
    <div style={{ ...paperStyle(bg, ink), justifyContent: 'center', padding: '0 130px', gap: 34 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: -1,
          ...riseStyle(tTitle, 36),
        }}
      >
        {title}
      </div>
      {titleSub && (
        <div style={{ fontSize: 34, fontWeight: 500, color: inkAlpha(0.66), ...riseStyle(tSub, 18) }}>
          {titleSub}
        </div>
      )}
      <div style={{ height: 8 }} />
      <NavyPill text={pill} t={tPill} />
    </div>
  )
}
