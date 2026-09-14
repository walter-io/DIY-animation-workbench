import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'
import { slotOrigin } from '../../components/primitives'

/**
 * 章节路线图卡
 *
 * 一条蜿蜒路径 + 节点 + 当前章节高亮卡片，
 * 统一为暗色毛玻璃风格。
 */
export default function ChapterRoadmap({ params, progress, meta, isPreview }: EffectProps) {
  const title = String(params.title ?? '章节导航')
  const subtitle = String(params.subtitle ?? '章节路线图')
  const activeIndex = Math.max(0, Number(params.activeIndex ?? 0))
  const size = Number(params.size ?? 1)

  const rawChapters = String(params.chapters ?? '准备,需求梳理 / 项目启动\n制作,内容与素材搭建\n动画,时间轴与动效\n数据,图表与字幕\n导出,渲染成片')
    .split('\n')
    .map((line) => {
      const [name, desc] = line.split(/[,，]/)
      return { name: (name ?? '').trim(), desc: (desc ?? '').trim() }
    })
    .filter((c) => c.name)

  const chapters = rawChapters.slice(0, 6)
  const total = chapters.length

  const headReveal = Math.max(0, Math.min(1, progress / 0.2))
  const headEased = applyEasing(headReveal, 'easeOutQuart')

  const pathColor = 'var(--stage-border)'
  const activeColor = 'var(--stage-primary)'

  // 沿正弦波分布的节点坐标
  const points = chapters.map((_, i) => {
    const x = 60 + i * 140
    const y = 70 + Math.sin(i * 0.9) * 36
    return { x, y }
  })

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '')
  const pathLength = points.length > 1 ? 1000 : 0

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: isPreview ? 10 : 20,
        transform: isPreview ? 'none' : `scale(${size})`,
        transformOrigin: slotOrigin(meta.slot),
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: headEased, transform: `translateY(${(1 - headEased) * 16}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
        <div style={{ fontSize: isPreview ? 10 : 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stage-text-muted)' }}>{subtitle}</div>
        <div style={{ fontSize: isPreview ? 20 : 38, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--stage-accent)', lineHeight: 1.1 }}>{title}</div>
      </div>

      <div style={{ position: 'relative', height: isPreview ? 84 : 180, flex: isPreview ? undefined : 1, minHeight: isPreview ? 0 : 160, overflow: 'hidden', borderRadius: 14, background: 'var(--stage-surface)', border: '1px solid var(--stage-border)' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 160" preserveAspectRatio="xMidYMid meet" style={{ position: 'absolute', inset: 0 }}>
          {total > 1 && (
            <path
              d={pathD}
              fill="none"
              stroke={pathColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={pathLength}
              strokeDashoffset={pathLength * (1 - headEased)}
              style={{ transition: 'stroke-dashoffset 0.1s linear' }}
            />
          )}
          {points.map((p, i) => {
            const nodeReveal = Math.max(0, Math.min(1, (progress - 0.15 - i * 0.08) / 0.75))
            const nodeEased = applyEasing(nodeReveal, 'easeOutBack')
            const isActive = i === activeIndex
            return (
              <g key={i} transform={`translate(${p.x}, ${p.y})`} style={{ opacity: nodeEased, transformOrigin: `${p.x}px ${p.y}px`, transform: `scale(${nodeEased})`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
                <circle r={isActive ? 14 : 8} fill={isActive ? activeColor : 'var(--stage-surface-strong)'} stroke={isActive ? activeColor : 'var(--stage-border)'} strokeWidth={2} />
                {isActive && <circle r={20} fill="none" stroke={activeColor} strokeWidth={2} opacity={0.45} />}
              </g>
            )
          })}
        </svg>

        {chapters.map((chapter, i) => {
          const cardReveal = Math.max(0, Math.min(1, (progress - 0.22 - i * 0.08) / 0.7))
          const cardEased = applyEasing(cardReveal, 'easeOut')
          const p = points[i]
          const isActive = i === activeIndex
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y + (i % 2 === 0 ? -72 : 42),
                transform: `translate(-50%, 0) translateY(${(1 - cardEased) * 14}px)`,
                opacity: cardEased,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
                background: isActive ? 'var(--stage-card-bg)' : 'transparent',
                border: isActive ? '1px solid var(--stage-primary)' : '1px solid transparent',
                backdropFilter: isActive ? 'var(--stage-card-blur)' : 'none',
                borderRadius: 10,
                padding: isActive ? '10px 14px' : '8px 10px',
                minWidth: 100,
                textAlign: 'center',
                boxShadow: isActive
                  ? 'var(--stage-card-shadow-geometry, 0 16px 40px) var(--stage-card-shadow-color, rgba(0,0,0,0.2))'
                  : 'none',
              }}
            >
              <div style={{ fontSize: isActive ? 15 : 12, fontWeight: 700, color: isActive ? 'var(--stage-primary)' : 'var(--stage-text-muted)' }}>
                {String(i + 1).padStart(2, '0')} {chapter.name}
              </div>
              {isActive && chapter.desc && (
                <div style={{ fontSize: 11, color: 'var(--stage-text-muted)', marginTop: 4, lineHeight: 1.3 }}>{chapter.desc}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
