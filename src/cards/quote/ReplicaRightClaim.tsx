import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E33 ·  · 右侧观点标题
 * 视觉：右对齐块 —— 英文 eyebrow 小字 + 第 1 行白色大字 + 第 2 行橙色大字 + 橙色下划线。
 * 来源：用 AI 剪视频/真的更快吗? · 速度，不是/唯一标准 · 纯口播更快/但没解决问题 ·
 *      能做/≠ 更省事 · 第二次使用/才是效率测试 · 完整资料/给真正需要的人
 * 颜色映射：原视频橙 → --stage-special（金）。
 */
export default function ReplicaRightClaim({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'EDITING IS NOT ONE NUMBER')
  const line1 = String(params.line1 ?? '速度，不是')
  const line2 = String(params.line2 ?? '唯一标准')
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.45))
  const e = applyEasing(t, 'easeOutQuart')
  const lineT = Math.max(0, Math.min(1, (progress - 0.15) / 0.45))
  const lineE = applyEasing(lineT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 56px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 10,
          opacity: e,
          transform: `translateX(${(1 - e) * 28}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.24em',
            color: accent,
            textShadow: `0 0 10px ${accentAlpha(0.4)}`,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 42, fontWeight: 900, color: '#fff', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          {line1}
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: accent,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            textShadow: `0 0 18px ${accentAlpha(0.35)}`,
            opacity: lineE,
            transform: `translateY(${(1 - lineE) * 12}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {line2}
        </div>
        <div
          style={{
            width: '100%',
            height: 2,
            marginTop: 6,
            background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.15)})`,
            boxShadow: `0 0 10px ${accentAlpha(0.4)}`,
            transform: `scaleX(${lineE})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s linear',
          }}
        />
      </div>
    </div>
  )
}