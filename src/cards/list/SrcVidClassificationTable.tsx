import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E14 Classification Table 三类人表格
 * “适合三类人”逐行展开表格。
 */
export default function SrcVidClassificationTable({ params, progress }: EffectProps) {
  const title = String(params.title ?? '适合三类人')
  const rows = String(params.rows ?? '第一类|有专业能力和观点，但无法稳定输出的人\n第二类|已在做个人IP，但每条内容都要从头开始的人\n第三类|有产品、有业务，希望通过内容建立信任的人')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('|'))
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
          width: 520,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            marginBottom: 18,
            textAlign: 'center',
            opacity: titleE,
            transform: `translateY(${(1 - titleE) * -14}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {title}
        </div>
        {rows.map((parts, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.12) / 0.5))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--stage-surface)',
                border: `1px solid ${accentAlpha(0.15)}`,
                borderRadius: 8,
                padding: '14px 18px',
                margin: '10px 0',
                position: 'relative',
                overflow: 'hidden',
                opacity: e,
                transform: `translateX(${(1 - e) * -40}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: accent,
                  boxShadow: `0 0 10px ${accent}`,
                  transform: `scaleY(${e})`,
                  transformOrigin: 'center bottom',
                  transition: 'transform 0.1s linear',
                }}
              />
              <div style={{ width: 70, fontSize: 15, fontWeight: 800, color: accent, flexShrink: 0 }}>{parts[0]}</div>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--stage-text-muted)', lineHeight: 1.5 }}>{parts[1]}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
