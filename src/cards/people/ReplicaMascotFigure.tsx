import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E23 ·  · 紫色卡通人物 + 视频播放器卡
 * 视觉：紫色剪影人物（带 / 不带 X 标）+ 圆角视频播放器卡（▶ + 进度条）。
 * 来源：真正的能力 · 把需求说清楚 — 人物带 X / 视频卡
 */
export default function ReplicaMascotFigure({ params, progress }: EffectProps) {
  const showCross = String(params.crosshair ?? 'true') === 'true'
  const accent = ACCENT

  const figT = Math.max(0, Math.min(1, progress / 0.5))
  const figE = applyEasing(figT, 'easeOutBack')
  const cardT = Math.max(0, Math.min(1, (progress - 0.2) / 0.5))
  const cardE = applyEasing(cardT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 紫色人物 */}
      <div
        style={{
          width: 90,
          height: 110,
          position: 'relative',
          opacity: figE,
          transform: `scale(${0.5 + figE * 0.5})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 头 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: 50,
            height: 50,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 18px ${accentAlpha(0.55)}`,
          }}
        />
        {/* X 标 */}
        {showCross && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 18,
              transform: 'translateX(-50%)',
              color: 'var(--stage-assist)',
              fontSize: 32,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            ×
          </div>
        )}
        {/* 身体 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 50,
            transform: 'translateX(-50%)',
            width: 64,
            height: 60,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
            background: accent,
            boxShadow: `0 0 18px ${accentAlpha(0.45)}`,
          }}
        />
      </div>

      {/* 视频播放器卡 */}
      <div
        style={{
          width: 140,
          height: 80,
          borderRadius: 8,
          border: `2px solid ${accent}`,
          background: 'rgba(15,15,18,0.92)',
          boxShadow: `0 0 18px ${accentAlpha(0.35)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 8,
          opacity: cardE,
          transform: `translateX(${(1 - cardE) * 20}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <polygon points="6,4 20,12 6,20" fill="#fff" stroke="none" />
        </svg>
        {/* 进度条 */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: i < 4 ? accent : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}