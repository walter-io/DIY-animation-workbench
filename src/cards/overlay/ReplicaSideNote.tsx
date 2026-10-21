import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E43 ·  · 左下便签 + 弧形箭头
 * 视觉：灰描边小卡 —— 两行标题（第 2 行橙）+ 右侧橙色弧形箭头 + 底部 tiny caps。
 * 来源：但我还会 / 继续用 ↘ THE NEXT TEST CONTINUES
 */
export default function ReplicaSideNote({ params, progress }: EffectProps) {
  const line1 = String(params.line1 ?? '但我还会')
  const line2 = String(params.line2 ?? '继续用')
  const tiny = String(params.tiny ?? 'THE NEXT TEST CONTINUES')
  const arrow = String(params.arrow ?? 'true') === 'true'
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutQuart')
  const arrT = Math.max(0, Math.min(1, (progress - 0.2) / 0.35))
  const arrE = applyEasing(arrT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        padding: 44,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '14px 20px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.35)',
          background: 'rgba(8,8,10,0.82)',
          boxShadow: '0 0 20px rgba(0,0,0,0.35)',
          opacity: e,
          transform: `translateY(${(1 - e) * 22}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{line1}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: accent, lineHeight: 1.3, textShadow: `0 0 12px ${accentAlpha(0.35)}` }}>{line2}</div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{tiny}</div>
        </div>
        {arrow && (
          <svg width="66" height="52" viewBox="0 0 66 52" style={{ opacity: arrE, transform: `translate(${(1 - arrE) * -10}px, ${(1 - arrE) * -8}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
            <path d="M 6 8 C 30 10, 48 22, 54 42" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="90" strokeDashoffset={90 - 90 * arrE} />
            <polygon points="48,38 56,48 60,36" fill={accent} opacity={arrE > 0.85 ? 1 : 0} />
          </svg>
        )}
      </div>
    </div>
  )
}