import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E06 Three Pipeline 三段生产链
 * 标题 + 三卡片横向排列。
 */
export default function SrcVidThreePipeline({ params, progress }: EffectProps) {
  const title = String(params.title ?? '这套工程的生产链')
  const labels = String(params.labels ?? '定位选题,文案表达,制作发布复盘')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
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
          marginBottom: 20,
          opacity: titleE,
          transform: `translateY(${(1 - titleE) * -16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {labels.map((label, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.2 - i * 0.1) / 0.5))
          const e = applyEasing(t, 'easeOutQuart')
          const lineT = Math.max(0, Math.min(1, (progress - 0.35 - i * 0.1) / 0.35))
          return (
            <div
              key={i}
              style={{
                width: 170,
                height: 90,
                borderRadius: 10,
                background: 'var(--stage-surface)',
                border: `1px solid ${accentAlpha(0.25)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                opacity: e,
                transform: `translateY(${(1 - e) * 40}px) scale(${0.92 + e * 0.08})`,
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: accent,
                  boxShadow: `0 0 10px ${accent}`,
                  transform: `scaleX(${lineT})`,
                  transformOrigin: 'left center',
                  transition: 'transform 0.1s linear',
                }}
              />
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
