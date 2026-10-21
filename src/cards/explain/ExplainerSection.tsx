import type { EffectProps } from '../../types'
import { inkAlpha, paperStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·章节页：进入新一章时的整页过渡 —— 特大章号 + 章节标题 + 一句引导。
 * 与「解说·标题页」的区别：更轻，重点是"翻页感"，只有标题级信息。
 */
export default function ExplainerSection({ params, progress }: EffectProps) {
  const index = String(params.index ?? '02')
  const title = String(params.title ?? '搭建在 LLM 之上的执行框架')
  const sub = String(params.sub ?? '')

  const tIndex = seg(progress, 0.02, 0.14)
  const tTitle = seg(progress, 0.1, 0.18)
  const tRule = seg(progress, 0.22, 0.14)
  const tSub = seg(progress, 0.3, 0.14)

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 26 }}>
      <div
        style={{
          fontSize: 150,
          fontWeight: 800,
          lineHeight: 1,
          color: inkAlpha(0.14),
          letterSpacing: -4,
          ...riseStyle(tIndex, 24),
        }}
      >
        {index}
      </div>
      <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.2, ...riseStyle(tTitle, 32) }}>
        {title}
      </div>
      <div
        style={{
          width: 120 * tRule,
          height: 8,
          borderRadius: 4,
          background: '#f2a63a',
        }}
      />
      {sub && (
        <div style={{ fontSize: 30, fontWeight: 500, color: inkAlpha(0.55), ...riseStyle(tSub, 16) }}>
          {sub}
        </div>
      )}
    </div>
  )
}
