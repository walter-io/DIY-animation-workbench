import type { EffectProps } from '../../types'
import { Eyebrow, EX_INK_VAR, EX_NAVY, EX_WHITE, paperStyle, popSeg, riseStyle, seg, splitList } from './explainKit'

/**
 * 解说·清单页：标题 + 编号清单行逐条弹出。
 * 每行 = 深色序号圆片 + 白底圆角行，跟着口播一条条立起来。
 */
export default function ExplainerChecklist({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '怎么做')
  const title = String(params.title ?? '三步搭出一个 Agent')
  const items = splitList(params.items, '给它一个目标\n配上工具和资料\n让它自己跑循环', 6)

  const tEyebrow = seg(progress, 0.02)
  const tTitle = seg(progress, 0.08, 0.14)
  const span = 0.5 / Math.max(1, items.length)
  const rowT = (i: number) => popSeg(progress, 0.24 + i * span, Math.min(0.12, span))

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 36 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.2, ...riseStyle(tTitle, 26) }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1500 }}>
        {items.map((it, i) => {
          const t = rowT(i)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                background: EX_WHITE,
                borderRadius: 18,
                padding: '16px 28px',
                boxShadow: '0 6px 18px rgba(24,26,32,0.08)',
                border: '1px solid rgba(24,26,32,0.05)',
                opacity: Math.min(1, Math.max(0, t * 1.8)),
                transform: `translateX(${(1 - t) * -30}px)`,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: EX_NAVY,
                  color: '#fff',
                  fontSize: 22,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ fontSize: 32, fontWeight: 600, color: EX_INK_VAR }}>
                {it.replace(/^([①-⑩]|\d+)\s*[.、)）]?\s*/, '')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
