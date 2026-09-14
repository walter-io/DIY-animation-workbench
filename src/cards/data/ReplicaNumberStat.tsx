import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E18 ·  · 大数字 + 下方小指标行
 * 视觉：左侧巨型数字 + 黄色下划线，右侧圆形瞄准镜图标；下方一行斜杠分隔的小指标。
 * 来源：5s + 完播/点赞/分享/转粉
 */
export default function ReplicaNumberStat({ params, progress }: EffectProps) {
  const value = String(params.value ?? '5s')
  const metrics = String(params.metrics ?? '完播,点赞,分享,转粉')
    .split(/[,，\n/]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const iconKind = String(params.icon ?? 'crosshair') // crosshair | none
  const accent = ACCENT

  const numT = Math.max(0, Math.min(1, progress / 0.4))
  const numE = applyEasing(numT, 'easeOutQuart')
  const mT = Math.max(0, Math.min(1, (progress - 0.25) / 0.45))
  const mE = applyEasing(mT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 32,
        gap: 18,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24 }}>
        {/* 大数字 + 下划线 */}
        <div
          style={{
            opacity: numE,
            transform: `translateY(${(1 - numE) * 12}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ fontSize: 88, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
          <div
            style={{
              height: 4,
              width: '100%',
              marginTop: 8,
              background: accent,
              boxShadow: `0 0 12px ${accentAlpha(0.6)}`,
              borderRadius: 1,
              transform: `scaleX(${numE})`,
              transformOrigin: 'left',
              transition: 'transform 0.1s linear',
            }}
          />
        </div>

        {/* 右侧瞄准镜图标 */}
        {iconKind !== 'none' && (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: `1.5px solid ${accent}`,
              opacity: mE,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 18px ${accentAlpha(0.25)}`,
              transform: `scale(${0.6 + mE * 0.4})`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="3" x2="12" y2="7" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="3" y1="12" x2="7" y2="12" />
              <line x1="17" y1="12" x2="21" y2="12" />
              <circle cx="12" cy="12" r="2" fill={accent} />
            </svg>
          </div>
        )}
      </div>

      {/* 下方小指标 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 12,
          fontSize: 14,
          color: 'rgba(255,255,255,0.65)',
          opacity: mE,
          transform: `translateY(${(1 - mE) * 8}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {metrics.map((m, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 500 }}>{m}</span>
            {i < metrics.length - 1 && <span style={{ color: accent, opacity: 0.7 }}>/</span>}
          </span>
        ))}
      </div>
    </div>
  )
}