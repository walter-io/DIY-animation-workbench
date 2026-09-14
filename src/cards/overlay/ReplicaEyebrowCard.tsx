import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E15 ·  · 左上小标签
 * 视觉：黄色短竖条 + 主标签 + 灰色副标签，单行排版，靠左上角。
 * 来源：万能 Skill 正在变成黑盒 / 封面 Skill 解决不了整条链路 / OPC + AI + 自媒体
 */
export default function ReplicaEyebrowCard({ params, progress }: EffectProps) {
  const main = String(params.main ?? '万能 Skill')
  const sub = String(params.sub ?? '正在变成黑盒')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.4))
  const e = applyEasing(t, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 24,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 14px 6px 10px',
          borderRadius: 4,
          background: 'rgba(0,0,0,0.32)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(4px)',
          opacity: e,
          transform: `translateX(${(-1 + e) * 16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span
          style={{
            width: 3,
            height: 18,
            borderRadius: 1,
            background: accent,
            boxShadow: `0 0 8px ${accentAlpha(0.6)}`,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>{main}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{sub}</span>
      </div>
    </div>
  )
}