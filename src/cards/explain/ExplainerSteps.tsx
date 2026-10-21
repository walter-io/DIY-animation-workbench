import type { EffectProps } from '../../types'
import { Eyebrow, EX_INK_VAR, EX_WHITE, inkAlpha, paperStyle, popSeg, riseStyle, seg, splitList } from './explainKit'

/**
 * 解说·步骤页：横向步骤卡 + 箭头，跟着口播一格格搭出来。
 * 适合"先 A 再 B 最后 C"的流程讲解；步骤多时会自动换行。
 */
export default function ExplainerSteps({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '流程')
  const title = String(params.title ?? '一次对话是怎么跑起来的')
  const steps = splitList(params.steps, '提问\n理解意图\n检索知识\n生成回答', 5)

  const tEyebrow = seg(progress, 0.02)
  const tTitle = seg(progress, 0.08, 0.14)
  const span = 0.56 / Math.max(1, steps.length)
  const stepT = (i: number) => popSeg(progress, 0.24 + i * span, Math.min(0.12, span))

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 120px', gap: 44 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.2, ...riseStyle(tTitle, 26) }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
        {steps.map((s, i) => {
          const t = stepT(i)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {i > 0 && (
                <span
                  style={{
                    fontSize: 40,
                    fontWeight: 700,
                    color: inkAlpha(0.35),
                    opacity: Math.min(1, Math.max(0, t * 1.8)),
                  }}
                >
                  →
                </span>
              )}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  background: EX_WHITE,
                  borderRadius: 20,
                  padding: '22px 30px',
                  minWidth: 200,
                  boxShadow: '0 8px 22px rgba(24,26,32,0.10)',
                  border: '1px solid rgba(24,26,32,0.05)',
                  opacity: Math.min(1, Math.max(0, t * 1.8)),
                  transform: `scale(${0.8 + 0.2 * t}) translateY(${(1 - t) * 14}px)`,
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 700, color: '#f2a63a', letterSpacing: 1 }}>
                  STEP {i + 1}
                </span>
                <span style={{ fontSize: 30, fontWeight: 700, color: EX_INK_VAR, whiteSpace: 'nowrap' }}>
                  {s}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: inkAlpha(0.55), opacity: seg(progress, 0.85, 0.12) }}>
        {String(params.footnote ?? '')}
      </div>
    </div>
  )
}
