import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E15 Cheree · 小卡网格
 * 源视频：标题 + 多张等宽小卡，2-3 列 × N 行网格，每张小卡：图标 + 标题 + 副文 + 标签。
 */
export default function SrcVidSmallCardGrid({ params, progress }: EffectProps) {
  const title = String(params.title ?? 'Cheree · 搜索端到项目')
  const cols = Number(params.cols ?? 3)
  // 默认 4 行 3 列 = 12 个示例小卡
  const defaultCards = [
    '洞察主题,AI 行业全景',
    '市场分析,2026 趋势',
    '消费者,3 类人群',
    '产品定位,差异化卖点',
    '增长策略,渠道与节奏',
    '内容矩阵,选题库',
    '投放方案,预算与回报',
    '团队搭建,3 人即可',
    'OKR,季度目标',
    '复盘节奏,周报月报',
    '风险清单,5 个高发',
    '下一步,立刻开工',
  ]
  const cardsText = String(params.cards ?? defaultCards.join('\n'))
  const cards = cardsText.split('\n').filter(Boolean)
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.1))           // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.5))   // 卡片网格

  const e1 = applyEasing(t1, 'easeOut')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: accent,
          opacity: e1,
          transform: `translateX(${(1 - e1) * -16}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>⑤</span>
        {title}
      </div>

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12,
          alignContent: 'start',
        }}
      >
        {cards.map((line, i) => {
          const [t, sub] = line.split(',')
          const col = i % cols
          const row = Math.floor(i / cols)
          const delay = col * 0.05 + row * 0.08
          const enter = Math.max(0, Math.min(1, (t2 - delay) / 0.2))
          const e = applyEasing(enter, 'easeOutBack')
          return (
            <div
              key={i}
              style={{
                background: '#10131A',
                border: '1px solid #20242e',
                borderRadius: 10,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                opacity: enter,
                transform: `translateY(${(1 - e) * 16}px) scale(${0.9 + e * 0.1})`,
                transition: 'transform 0.12s linear, opacity 0.12s linear',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: accentAlpha(0.18),
                  border: `1px solid ${accentAlpha(0.4)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accent,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, '0').slice(-1)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
