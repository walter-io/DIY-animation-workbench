import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E37 ·  · 上期回顾小卡
 * 视觉：左下角小卡 —— eyebrow + 期数 tag + 两行大字标题（第 2 行橙）+ 右侧缩略图块。
 * 来源：上一期 / PREVIOUS TEST — AI周播实验 01 — 花3天做AI视频 我反而没提效
 */
export default function ReplicaPrevCard({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '上一期 / PREVIOUS TEST')
  const tag = String(params.tag ?? 'AI周播实验 01')
  const line1 = String(params.line1 ?? '花3天做AI视频')
  const line2 = String(params.line2 ?? '我反而没提效')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        padding: 40,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          gap: 14,
          padding: 14,
          borderRadius: 10,
          border: `1px solid ${accentAlpha(0.6)}`,
          background: 'rgba(8,8,10,0.85)',
          boxShadow: `0 0 22px ${accentAlpha(0.16)}`,
          opacity: e,
          transform: `translateY(${(1 - e) * 24}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: accent }}>{eyebrow}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{tag}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.25, marginTop: 4 }}>{line1}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1.25, textShadow: `0 0 14px ${accentAlpha(0.35)}` }}>{line2}</div>
        </div>
        {/* 缩略图占位 */}
        <div
          style={{
            width: 130,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)">
            <polygon points="7,4 21,12 7,20" />
          </svg>
        </div>
      </div>
    </div>
  )
}