import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E50 ·  · 散落 剧 字瓦片
 * 视觉：标题 + 满屏散落的多色 "剧" 瓦片（红/蓝/紫/青/金 不同大小、随机位置、轻微旋转 + 阴影 + 内描边）。
 * 来源：2025 年全年上线的漫剧有 6 万多部 — 大量内容
 * 颜色：五彩混合 → 用项目 4 语义色 + 亮金循环。瓦片大小由 fixedSeed 决定位置/旋转/大小，便于稳定复现。
 */
export default function ReplicaConfettiTiles({ params, progress }: EffectProps) {
  const title = String(params.title ?? '2025 年全年上线的漫剧有 6 万多部')
  const count = Math.max(6, Math.min(28, Number(params.count ?? 18)))
  const seed = Number(params.seed ?? 7)
  const accent = ACCENT
  const palette = ['var(--stage-assist)', 'var(--stage-primary)', 'var(--stage-data)', accent, '#b88aff', 'var(--stage-special)']

  // 简单 PRNG 以稳定散布
  const rand = (n: number) => {
    let s = seed
    return () => {
      s = (s * 1103515245 + n * 12345 + 1) & 0x7fffffff
      return (s % 1000) / 1000
    }
  }
  const r = rand(0)
  const tiles = Array.from({ length: count }, (_, i) => ({
    x: 4 + r() * 92, // 4% ~ 96%
    y: 8 + r() * 78,
    size: 36 + r() * 38,
    rot: -25 + r() * 50,
    color: palette[i % palette.length],
    delay: r() * 0.25,
  }))

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        overflow: 'hidden',
      }}
    >
      {tiles.map((t, i) => {
        const tt = Math.max(0, Math.min(1, (progress - 0.1 - t.delay) / 0.4))
        const e = applyEasing(tt, 'easeOutBack')
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.size,
              height: t.size * 1.25,
              borderRadius: 8,
              background: `linear-gradient(140deg, ${t.color}, ${t.color}cc)`,
              border: '1.5px solid rgba(255,255,255,0.4)',
              color: '#fff',
              fontSize: t.size * 0.55,
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 6px 18px ${t.color}66, inset 0 -2px 0 rgba(0,0,0,0.18)`,
              transform: `rotate(${t.rot}deg) scale(${0.4 + e * 0.6})`,
              opacity: e,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
              textShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            剧
          </div>
        )
      })}
      {/* 标题在底部 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 60,
          textAlign: 'center',
          fontSize: 30,
          fontWeight: 900,
          color: '#fff',
          opacity: headE,
          transform: `translateY(${(1 - headE) * 12}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
          padding: '0 80px',
        }}
      >
        {title}
      </div>
    </div>
  )
}