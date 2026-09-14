import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E45 ·  · 3 面板成本仪表板
 * 视觉：上 eyebrow + 居中巨字 "30 到 50 万" + 中段「爆款率 5‰  →  全覆盖」红/绿描边对比 +
 *      下段 2 个 mini stat 卡（AI 出片/投流回流）+ 底部一句话胶囊。
 * 来源：批量大几十部 — 整个循环，以「天」为单位转动
 * 颜色：原视频混色 → 主强调用 --stage-special（金），红/绿对比走 --stage-assist / --stage-data。
 */
export default function ReplicaCostDashboard({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '批量大几十部')
  const titleMid = String(params.titleMid ?? '批量做大')
  const valueWhite = String(params.valueWhite ?? '30')
  const valueCyan = String(params.valueCyan ?? '到')
  const valueRight = String(params.valueRight ?? '50 万')
  const chipLeftLabel = String(params.chipLeftLabel ?? '爆款率哪怕')
  const chipLeftValue = String(params.chipLeftValue ?? '5‰')
  const chipRightLabel = String(params.chipRightLabel ?? '期望收益')
  const chipRightTitle = String(params.chipRightTitle ?? '跑出一部')
  const chipRightValue = String(params.chipRightValue ?? '全覆盖')
  const stat1Title = String(params.stat1Title ?? 'AI 出片 1~3 天')
  const stat1Value = String(params.stat1Value ?? '3 天出片')
  const stat2Title = String(params.stat2Title ?? '投流数据 48 小时')
  const stat2Value = String(params.stat2Value ?? '48h 回流')
  const caption = String(params.caption ?? '整个循环，以「天」为单位转动')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.35))
  const headE = applyEasing(headT, 'easeOutQuart')
  const midT = Math.max(0, Math.min(1, (progress - 0.18) / 0.4))
  const midE = applyEasing(midT, 'easeOutQuart')
  const botT = Math.max(0, Math.min(1, (progress - 0.32) / 0.4))
  const botE = applyEasing(botT, 'easeOutQuart')

  const MiniStat = (icon: string, title: string, value: string, e2: number) => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(9,9,11,0.85)',
        opacity: e2,
        transform: `translateY(${(1 - e2) * 14}px)`,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: accentAlpha(0.12),
          border: `1px solid ${accentAlpha(0.5)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{title}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{value}</span>
      </div>
    </div>
  )

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        padding: 32,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 上：eyebrow + 标题 + 巨字 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: headE, transition: 'opacity 0.1s linear' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.22em', color: 'var(--stage-data)' }}>{eyebrow}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>{titleMid}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{valueWhite}</span>
          <span style={{ fontSize: 56, fontWeight: 900, color: 'var(--stage-data)' }}>{valueCyan}</span>
          <span style={{ fontSize: 80, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{valueRight}</span>
        </div>
      </div>

      {/* 中：红/绿对比 + 箭头 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          opacity: midE,
          transform: `translateY(${(1 - midE) * 18}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            padding: '12px 22px 14px',
            borderRadius: 10,
            border: `1.5px solid var(--stage-assist)`,
            background: 'rgba(255,122,176,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: `0 0 14px var(--stage-assist)`,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{chipLeftLabel}</span>
          <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--stage-assist)', textShadow: '0 0 12px var(--stage-assist)' }}>{chipLeftValue}</span>
        </div>
        <svg width="42" height="20" viewBox="0 0 42 20">
          <line x1="2" y1="10" x2="30" y2="10" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
          <polygon points="28,4 38,10 28,16" fill={accent} />
        </svg>
        <div
          style={{
            padding: '12px 22px 14px',
            borderRadius: 10,
            border: `1.5px solid var(--stage-data)`,
            background: 'rgba(90,200,250,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            boxShadow: `0 0 14px var(--stage-data)`,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--stage-data)' }}>{chipRightLabel}</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--stage-data)' }}>{chipRightTitle} <span style={{ color: '#fff' }}>=</span> <span style={{ color: 'var(--stage-data)', fontWeight: 900 }}>{chipRightValue}</span></span>
        </div>
      </div>

      {/* 下：2 个 mini stat */}
      <div style={{ display: 'flex', gap: 12, width: 580, maxWidth: '80%', opacity: botE, transition: 'opacity 0.1s linear' }}>
        {MiniStat('◐', stat1Title, stat1Value, botE)}
        {MiniStat('↻', stat2Title, stat2Value, botE)}
      </div>

      {/* caption */}
      <div
        style={{
          marginTop: 6,
          fontSize: 14,
          fontWeight: 700,
          color: accent,
          padding: '5px 14px',
          border: `1px solid ${accentAlpha(0.5)}`,
          borderRadius: 999,
          opacity: botE,
          transition: 'opacity 0.1s linear',
        }}
      >
        {caption}
      </div>
    </div>
  )
}