import type { EffectProps } from '../../types'
import { Eyebrow, EX_INK_VAR, EX_NAVY, EX_WHITE, inkAlpha, paperStyle, seg, splitList } from './explainKit'

/**
 * 解说·对比页：左右两块面板（白底 vs 深底），中间 VS 圆片。
 * 参考"没有 LLM 时 / 有了 LLM 后"这类前后对比的讲法。
 */
export default function ExplainerVersus({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '对比')
  const leftTitle = String(params.leftTitle ?? '以前的做法')
  const leftLines = splitList(params.leftLines, '人肉查资料\n一条条试错\n产出看运气', 5)
  const rightTitle = String(params.rightTitle ?? '现在的做法')
  const rightLines = splitList(params.rightLines, '一句话说清目标\nLLM 给出初稿\n人来定稿', 5)

  const tEyebrow = seg(progress, 0.02)
  const tLeft = seg(progress, 0.1, 0.16)
  const tRight = seg(progress, 0.24, 0.16)
  const tVs = seg(progress, 0.36, 0.12)

  const panel = (dark: boolean) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
    borderRadius: 26,
    padding: '36px 40px',
    background: dark ? EX_NAVY : EX_WHITE,
    boxShadow: '0 10px 30px rgba(24,26,32,0.14)',
  })

  const lines = (list: string[], dark: boolean) =>
    list.map((l, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          fontSize: 28,
          fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.88)' : inkAlpha(0.82),
          opacity: seg(progress, 0.36 + i * 0.07, 0.12),
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: dark ? '#f2a63a' : inkAlpha(0.3),
            flexShrink: 0,
          }}
        />
        {l}
      </div>
    ))

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 120px', gap: 40 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ position: 'relative', display: 'flex', gap: 60 }}>
        <div style={{ ...panel(false), opacity: tLeft, transform: `translateX(${(1 - tLeft) * -36}px)` }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: EX_INK_VAR }}>{leftTitle}</div>
          {lines(leftLines, false)}
        </div>
        <div style={{ ...panel(true), opacity: tRight, transform: `translateX(${(1 - tRight) * 36}px)` }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#ffffff' }}>{rightTitle}</div>
          {lines(rightLines, true)}
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * tVs})`,
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: '#f2a63a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            fontWeight: 800,
            boxShadow: '0 10px 26px rgba(214,141,32,0.4)',
            opacity: tVs,
          }}
        >
          VS
        </div>
      </div>
    </div>
  )
}
