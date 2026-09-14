import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E20 ·  · 居中超大问句标题
 * 视觉：超大白字问句居中 + 微弱彩色径向光晕 + 下方双语小字副标题。
 * 来源：管一步，还是管编排?
 */
export default function ReplicaQuestionHeadline({ params, progress }: EffectProps) {
  const question = String(params.question ?? '管一步，还是管编排?')
  const subtitle = String(params.subtitle ?? 'skill 解决的是这一步怎么稳定做好')

  const qT = Math.max(0, Math.min(1, progress / 0.45))
  const qE = applyEasing(qT, 'easeOutQuart')
  const sT = Math.max(0, Math.min(1, (progress - 0.25) / 0.4))
  const sE = applyEasing(sT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 彩色径向光晕 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 50% 40% at 50% 50%, ${accentAlpha(0.18)}, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      {/* 大问句 */}
      <div
        style={{
          position: 'relative',
          fontSize: 64,
          fontWeight: 900,
          color: '#fff',
          textAlign: 'center',
          letterSpacing: '0.02em',
          textShadow: `0 4px 24px ${accentAlpha(0.35)}`,
          opacity: qE,
          transform: `translateY(${(1 - qE) * 20}px) scale(${0.95 + qE * 0.05})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {question}
      </div>

      {/* 双语副标题 */}
      <div
        style={{
          position: 'relative',
          fontSize: 16,
          color: 'rgba(255,255,255,0.7)',
          textAlign: 'center',
          lineHeight: 1.6,
          opacity: sE,
          transform: `translateY(${(1 - sE) * 12}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {subtitle.split('\n').filter(Boolean).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  )
}