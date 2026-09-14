import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E48 ·  · 横版时间线 + 步骤卡
 * 视觉：标题 + 4 个水平步骤卡（带圆形图标 + 标题 + 副标 + →箭头）+
 *      下方一条贯穿横线 + 4 颗"剧" 标记块 + 2 个绿色数据 pill（付费率/完播率）。
 * 来源：AI 短剧做剧流程 — 批量生成 / 全量投流 / 数据筛选 / 复制放大
 * 颜色：原视频蓝/橙/紫/灰 → --stage-primary/--stage-special/--stage-assist/中性灰。
 */
export default function ReplicaTimelineSteps({ params, progress }: EffectProps) {
  const titleWhite = String(params.titleWhite ?? 'AI 短剧')
  const titleOrange = String(params.titleOrange ?? '做剧流程')
  const steps = String(
    params.steps ??
      'bulk|批量生成|几十部不同爽点|var(--stage-primary),send|全量投流|全部推上去|var(--stage-special),filter|数据筛选|付费率 / 完播率|var(--stage-assist),scale|复制放大|放量爆款|rgba(255,255,255,0.5)'
  )
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const p = seg.split('|').map((x) => x.trim())
      return { icon: p[0] ?? 'dot', title: p[1] ?? '', sub: p[2] ?? '', color: p[3] ?? 'var(--stage-primary)' }
    })
  const pills = String(params.pills ?? '付费率 9.8%,完播率 62.4%')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const caption = String(params.caption ?? '立刻让 AI 大规模复制')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')
  const stepT = (i: number) => Math.max(0, Math.min(1, (progress - 0.15 - i * 0.08) / 0.4))
  const stepE = (i: number) => applyEasing(stepT(i), 'easeOutQuart')

  const STEP_W = 220
  const GAP = 56
  const W = steps.length * STEP_W + (steps.length - 1) * GAP

  const renderIcon = (icon: string, _color: string) => {
    const common = { width: 28, height: 28, fill: 'none', stroke: '#fff', strokeWidth: 1.8 }
    if (icon === 'bulk')
      return (
        <svg {...common} viewBox="0 0 24 24">
          <rect x="4" y="6" width="16" height="14" rx="2" />
          <line x1="4" y1="11" x2="20" y2="11" />
          <line x1="9" y1="6" x2="9" y2="20" />
        </svg>
      )
    if (icon === 'send')
      return (
        <svg {...common} viewBox="0 0 24 24">
          <polygon points="3,12 21,4 14,21 12,13" fill="#fff" stroke="none" />
        </svg>
      )
    if (icon === 'filter')
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path d="M3 6h18l-7 8v6l-4-2v-4z" />
        </svg>
      )
    if (icon === 'scale')
      return (
        <svg {...common} viewBox="0 0 24 24">
          <rect x="3" y="14" width="18" height="6" rx="1" />
          <path d="M3 18h18" />
          <circle cx="6" cy="10" r="2" />
        </svg>
      )
    return <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
  }

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
        gap: 22,
        padding: 32,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: '#fff',
          opacity: headE,
          transform: `translateY(${(1 - headE) * -14}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {titleWhite}
        <span style={{ color: accent, textShadow: `0 0 14px ${accentAlpha(0.4)}` }}>{titleOrange}</span>
      </div>
      {/* 步骤卡行 */}
      <div style={{ position: 'relative', width: W }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: i * (STEP_W + GAP),
              top: 0,
              width: STEP_W,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              opacity: stepE(i),
              transform: `translateY(${(1 - stepE(i)) * 16}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: s.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 14px ${s.color}77`,
              }}
            >
              {renderIcon(s.icon, s.color)}
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{s.title}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{s.sub}</span>
          </div>
        ))}
        {/* → 箭头 */}
        {steps.slice(0, -1).map((_, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.08) / 0.3))
          return (
            <svg
              key={`a-${i}`}
              width={GAP - 10}
              height="14"
              viewBox={`0 0 ${GAP - 10} 14`}
              style={{ position: 'absolute', left: i * (STEP_W + GAP) + STEP_W + 5, top: 21, opacity: t }}
            >
              <line x1="2" y1="7" x2={GAP - 18} y2="7" stroke={accent} strokeWidth="2" strokeLinecap="round" />
              <polygon points={`${GAP - 18},2 ${GAP - 10},7 ${GAP - 18},12`} fill={accent} />
            </svg>
          )
        })}
      </div>
      {/* 时间线横线 + 标记块 */}
      <div style={{ position: 'relative', width: W + 40, height: 60 }}>
        {/* 横线 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 30,
            height: 2,
            background: 'linear-gradient(90deg, var(--stage-primary), var(--stage-assist), var(--stage-special))',
            opacity: 0.7,
            transform: `scaleX(${applyEasing(Math.min(1, (progress - 0.3) / 0.4), 'easeOutQuart')})`,
            transformOrigin: 'left center',
            borderRadius: 2,
            boxShadow: '0 0 8px rgba(139,157,255,0.3)',
          }}
        />
        {steps.map((s, i) => {
          const t = stepE(i)
          const x = 20 + i * (STEP_W + GAP) + STEP_W / 2
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - 22,
                top: 8,
                width: 44,
                height: 44,
                borderRadius: 8,
                background: s.color,
                border: '1.5px solid rgba(255,255,255,0.4)',
                color: '#fff',
                fontSize: 22,
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 14px ${s.color}88`,
                opacity: t,
                transform: `scale(${0.6 + t * 0.4})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              剧
            </div>
          )
        })}
        {/* 绿色 pills */}
        {pills.map((p, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.45 - i * 0.08) / 0.3))
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 60 + i * 160,
                top: 0,
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--stage-data)',
                border: '1.5px solid var(--stage-data)',
                padding: '3px 10px',
                borderRadius: 6,
                background: 'rgba(90,200,250,0.1)',
                boxShadow: `0 0 10px var(--stage-data)`,
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {p}
            </div>
          )
        })}
      </div>
      {/* 底部字幕 */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.7)',
          padding: '5px 16px',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 999,
          opacity: applyEasing(Math.min(1, (progress - 0.5) / 0.3), 'easeOutQuart'),
        }}
      >
        {caption}
      </div>
    </div>
  )
}