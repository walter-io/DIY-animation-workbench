import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E15 Concept Trio 概念三卡
 * “不是说明书，是进化中的记录” + 三卡，中间高亮。
 */
export default function SrcVidConceptTrio({ params, progress }: EffectProps) {
  const title = String(params.title ?? '不是说明书，是进化中的记录')
  const cards = String(params.cards ?? '说明书,进化记录,持续迭代')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const activeIndex = Number(params.activeIndex ?? 1)
  const accent = ACCENT

  const titleT = Math.max(0, Math.min(1, progress / 0.4))
  const titleE = applyEasing(titleT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 22,
          textAlign: 'center',
          opacity: titleE,
          transform: `translateY(${(1 - titleE) * -16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {cards.map((card, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.1) / 0.5))
          const e = applyEasing(t, 'easeOutQuart')
          const isActive = i === activeIndex
          const activeT = Math.max(0, Math.min(1, (progress - 0.55) / 0.3))
          const glow = isActive ? activeT : 0
          return (
            <div
              key={i}
              style={{
                width: 160,
                height: 90,
                borderRadius: 10,
                background: isActive ? `${accentAlpha(0.1)}` : 'var(--stage-surface)',
                border: `1px solid ${isActive ? accent : `${accentAlpha(0.2)}`}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: isActive ? '#fff' : 'var(--stage-text-muted)',
                boxShadow: isActive ? `0 0 ${24 + glow * 8}px ${accentAlpha(0.22)}` : 'none',
                opacity: e,
                transform: `translateY(${(1 - e) * 28}px) scale(${0.9 + e * 0.1})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {card}
            </div>
          )
        })}
      </div>
    </div>
  )
}
