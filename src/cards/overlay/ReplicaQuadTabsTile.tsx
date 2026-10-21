import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E44 ·  · 3 标签卡 + 1 图阵卡
 * 视觉：3 个相同描边大色块（带顶部小 tab 角标）+ 1 个深色 4×4 霓虹图阵卡。
 * 来源：怎么老是这些剧情? — 剧/剧/剧 + 场景示意·AI生成
 * 颜色：3 标签卡主色由 `accent` 取值；多色按钮通过副 accent 变量。
 */
export default function ReplicaQuadTabsTile({ params, progress }: EffectProps) {
  const title = String(params.title ?? '怎么老是这些剧情?')
  const titleOrange = String(params.titleOrange ?? '')
  const labels = String(params.labels ?? '剧,剧,剧')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const imageCol = String(params.imageCol ?? '3 320×180')
  const accent = ACCENT
  const altAccents = ['var(--stage-primary)', 'var(--stage-assist)', 'var(--stage-data)']

  const t = Math.max(0, Math.min(1, progress / 0.4))
  const e = applyEasing(t, 'easeOutQuart')

  const TAB_W = 220
  const TAB_H = 240
  const IMAGE_W = 320

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 18,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          opacity: e,
          transform: `translateY(${(1 - e) * -14}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
        {titleOrange && <span style={{ color: accent, textShadow: `0 0 16px ${accentAlpha(0.4)}` }}>{titleOrange}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {labels.slice(0, 3).map((l, i) => {
          const tt = Math.max(0, Math.min(1, (progress - 0.05 - i * 0.08) / 0.4))
          const ee = applyEasing(tt, 'easeOutQuart')
          const col = [accent, altAccents[0], altAccents[2]][i] ?? accent
          return (
            <div
              key={i}
              style={{
                position: 'relative',
                width: TAB_W,
                height: TAB_H,
                borderRadius: 14,
                background: `linear-gradient(160deg, ${col} 0%, ${col}cc 100%)`,
                boxShadow: `0 8px 24px ${col}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: ee,
                transform: `translateY(${(1 - ee) * 18}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {/* 顶部 tab 角标 */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 16,
                  width: 28,
                  height: 18,
                  background: 'rgba(255,255,255,0.95)',
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 70%, 0 100%)',
                }}
              />
              <span style={{ fontSize: 76, fontWeight: 900, color: '#fff', textShadow: '0 4px 14px rgba(0,0,0,0.35)' }}>{l}</span>
            </div>
          )
        })}
        {/* 第 4 个：深色图阵卡 */}
        <div
          style={{
            width: IMAGE_W,
            height: TAB_H,
            borderRadius: 14,
            border: `1.5px solid ${accentAlpha(0.5)}`,
            background: 'linear-gradient(180deg, #0a0a14 0%, #16161c 100%)',
            padding: 8,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: 6,
            opacity: e,
            transform: `translateY(${(1 - e) * 18}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            boxShadow: `0 0 24px ${accentAlpha(0.18)}`,
          }}
        >
          {Array.from({ length: 16 }).map((_, i) => {
            const colors = [accent, 'var(--stage-assist)', 'var(--stage-data)', 'var(--stage-primary)']
            return (
              <div
                key={i}
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${colors[i % colors.length]} 0%, ${colors[i % colors.length]}55 50%, transparent 100%)`,
                  borderRadius: 4,
                }}
              />
            )
          })}
        </div>
        <div style={{ position: 'absolute', right: 60, bottom: -16, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>
          场景示意 · {imageCol}
        </div>
      </div>
    </div>
  )
}