import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E40 ·  · 编号清单
 * 视觉：大标题 + eyebrow + 编号行逐条出现（橙圆编号 + 白字 + 行下划线）。
 * 来源：只看三件事 — 01 它能帮我解决什么? / 02 以后会用多少次? / 03 哪一步最省时间?
 */
export default function ReplicaNumberedList({ params, progress }: EffectProps) {
  const title = String(params.title ?? '只看三件事')
  const eyebrow = String(params.eyebrow ?? 'AI LEARNING VALUE')
  const items = String(params.items ?? '它能帮我解决什么?,以后会用多少次?,哪一步最省时间?')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

  const titleT = Math.max(0, Math.min(1, progress / 0.35))
  const titleE = applyEasing(titleT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 64px',
        gap: 8,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          color: '#fff',
          opacity: titleE,
          transform: `translateY(${(1 - titleE) * -16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: '100%',
          height: 2,
          background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.1)})`,
          transform: `scaleX(${titleE})`,
          transformOrigin: 'left center',
        }}
      />
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: accent, opacity: titleE, marginTop: 2 }}>
        {eyebrow}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
        {items.map((item, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.12) / 0.4))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '13px 0',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
                opacity: e,
                transform: `translateX(${(1 - e) * -26}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: accent,
                  color: '#141414',
                  fontSize: 13,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 12px ${accentAlpha(0.4)}`,
                  flexShrink: 0,
                  transform: `scale(${0.5 + e * 0.5})`,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{item}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}