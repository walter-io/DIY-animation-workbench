import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E01 Hero Title 发光主标题
 * 源视频开场顶部居中霓虹大字 + 下划线擦入。
 */
export default function SrcVidHeroTitle({ params, progress }: EffectProps) {
  const title = String(params.title ?? '正式搬到台前')
  const subtitle = String(params.subtitle ?? '一套个人IP内容工程的公开拆解')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.45))
  const t2 = Math.max(0, Math.min(1, (progress - 0.25) / 0.35))
  const t3 = Math.max(0, Math.min(1, (progress - 0.45) / 0.35))

  const e1 = applyEasing(t1, 'easeOutQuart')
  const e2 = applyEasing(t2, 'easeOutQuart')
  const e3 = applyEasing(t3, 'easeOut')

  const glowPulse = progress > 0.7 && progress < 0.85 ? 1 + Math.sin((progress - 0.7) / 0.15 * Math.PI) * 0.15 : 0

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: 2,
            color: '#fff',
            opacity: e1,
            transform: `translateY(${(1 - e1) * 28}px)`,
            textShadow: `0 0 ${24 + glowPulse * 18}px ${accentAlpha(0.5)}, 0 0 8px ${accentAlpha(0.25)}`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 220,
            height: 2,
            background: accent,
            margin: '14px auto 10px',
            boxShadow: `0 0 12px ${accent}`,
            transform: `scaleX(${e2})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s linear',
          }}
        />
        <div
          style={{
            fontSize: 15,
            color: 'var(--stage-text-muted)',
            opacity: e3,
            transform: `translateY(${(1 - e3) * 16}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  )
}
