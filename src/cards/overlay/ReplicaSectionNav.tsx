import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E32 ·  · 顶部章节导航
 * 视觉：右上横排 4 个章节标签，active 项橙色；整条下划线贯穿，橙色圆点滑到 active 项下方。
 * 来源：剪辑 | 工作流 | 成本账单 | 二次测试（全片持续出现，active 随章节切换）
 */
export default function ReplicaSectionNav({ params, progress }: EffectProps) {
  const items = String(params.items ?? '剪辑,工作流,成本账单,二次测试')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const activeIndex = Math.max(0, Math.min(items.length - 1, Number(params.activeIndex ?? 0)))
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.4))
  const e = applyEasing(t, 'easeOutQuart')
  const dotT = Math.max(0, Math.min(1, (progress - 0.1) / 0.4))
  const dotE = applyEasing(dotT, 'easeOutQuart')

  const n = items.length
  const labelW = 120
  const dotX = activeIndex * labelW + labelW / 2

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
        padding: '28px 32px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: n * labelW,
          opacity: e,
          transition: 'opacity 0.1s linear',
        }}
      >
        {/* 标签行 */}
        <div style={{ display: 'flex' }}>
          {items.map((label, i) => (
            <div
              key={i}
              style={{
                width: labelW,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                color: i === activeIndex ? accent : 'rgba(255,255,255,0.45)',
                textShadow: i === activeIndex ? `0 0 12px ${accentAlpha(0.5)}` : 'none',
                opacity: applyEasing(Math.max(0, Math.min(1, (progress - i * 0.06) / 0.35)), 'easeOutQuart'),
                transition: 'color 0.15s linear',
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {/* 贯穿下划线 */}
        <div
          style={{
            marginTop: 10,
            height: 1.5,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.08))',
            transform: `scaleX(${e})`,
            transformOrigin: 'left center',
            transition: 'transform 0.1s linear',
          }}
        />
        {/* active 圆点 */}
        <div
          style={{
            position: 'absolute',
            left: dotX - 4,
            top: '100%',
            marginTop: 4.5,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: accent,
            boxShadow: `0 0 10px ${accent}`,
            transform: `translateX(${(1 - dotE) * -40}px)`,
            opacity: dotE,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        />
      </div>
    </div>
  )
}