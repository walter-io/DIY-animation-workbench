import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E03 Numbered Roadmap 底部编号路线
 * 底部“01 ... / 02 ...”编号条依次滑入。
 */
export default function SrcVidNumberedRoadmap({ params, progress }: EffectProps) {
  const accent = ACCENT
  const items = String(params.items ?? '01|要点一\n02|要点二')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.split('|'))

  // 入场时序：6 项要 progress≈0.5 全部到位。原版 baseStart=0.1+spacing 0.12
  // 在 6 项时 i=5 的 start 推到 0.7，叠加 itemSpan=0.55 后，progress 永远跑不到 1 让末项完整滑入
  // —— 视频里观众看到的是动态动画勉强能接受，但截图和末尾切换瞬间会丢项。
  // 改为密集入场，截图与播放都稳。
  const baseStart = 0
  const itemSpan = 0.15
  const spacing = 0.04

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        // 必须让出底部字幕区，否则会与口播字幕重叠。
        // 字幕 slot=bottom 在画布最底，box 高度自适应（长字幕可达 ~80px），
        // 因此 paddingBottom 留 130 留出安全距离。
        paddingBottom: 130,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
        {items.map((parts, i) => {
          const start = baseStart + i * spacing
          const t = Math.max(0, Math.min(1, (progress - start) / itemSpan))
          const e = applyEasing(t, 'easeOutBack')
          const numT = Math.max(0, Math.min(1, (progress - start - 0.05) / 0.35))
          const numE = applyEasing(numT, 'easeOutBack')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--stage-surface)',
                border: `1px solid ${accentAlpha(0.25)}`,
                padding: '10px 18px',
                borderRadius: 10,
                opacity: e,
                transform: `translateY(${(1 - e) * 24}px) scale(${0.9 + e * 0.1})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${accent}`,
                  color: accent,
                  fontWeight: 800,
                  fontSize: 14,
                  boxShadow: `0 0 12px ${accentAlpha(0.2)}`,
                  opacity: numE,
                  transform: `scale(${numE})`,
                  transition: 'transform 0.1s linear, opacity 0.1s linear',
                }}
              >
                {parts[0]}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{parts[1] ?? ''}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
