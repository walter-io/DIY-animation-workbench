import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E17 End CTA 结尾互动条
 * 点赞/评论/收藏图标 + 频道名。
 */
export default function SrcVidEndCta({ params, progress }: EffectProps) {
  const name = String(params.name ?? 'C哥OPC')
  const icons = String(params.icons ?? '赞,评,藏')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginBottom: 20 }}>
        {icons.map((icon, i) => {
          const t = Math.max(0, Math.min(1, (progress - i * 0.08) / 0.4))
          const e = applyEasing(t, 'easeOutBack')
          return (
            <div
              key={i}
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                border: `1.5px solid ${accent}`,
                background: `${accentAlpha(0.08)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#fff',
                boxShadow: `0 0 18px ${accentAlpha(0.18)}`,
                opacity: e,
                transform: `translateY(${(1 - e) * 20}px) scale(${0.7 + e * 0.3})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {icon}
            </div>
          )
        })}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 900,
          color: accent,
          letterSpacing: 4,
          textShadow: `0 0 16px ${accentAlpha(0.4)}`,
          opacity: Math.max(0, Math.min(1, (progress - 0.3) / 0.45)),
          transform: `translateY(${(1 - Math.max(0, Math.min(1, (progress - 0.3) / 0.45))) * 16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {name}
      </div>
    </div>
  )
}
