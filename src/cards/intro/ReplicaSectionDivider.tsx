import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E28 ·  · 居中分段小标题
 * 视觉：居中两行小标题 + 下方分隔线 + 副标，节奏感强。
 * 来源：第一步，拆新手 / 甲方的活 / 第二点，剪脑部 / 不设限
 */
export default function ReplicaSectionDivider({ params, progress }: EffectProps) {
  const line1 = String(params.line1 ?? '第一步，拆新手')
  const line2 = String(params.line2 ?? '甲方的活')
  const hint = String(params.hint ?? '')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutQuart')

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
        gap: 14,
        padding: 24,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          opacity: e,
          transform: `translateY(${(1 - e) * 12}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.04em',
          }}
        >
          {line1}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', textAlign: 'center' }}>{line2}</div>
        <div
          style={{
            width: 60 + e * 40,
            height: 2,
            background: accent,
            borderRadius: 1,
            marginTop: 6,
            boxShadow: `0 0 12px ${accentAlpha(0.6)}`,
            transition: 'width 0.15s linear',
          }}
        />
        {hint && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 8, textAlign: 'center' }}>{hint}</div>
        )}
      </div>
    </div>
  )
}