import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * E31 ·  · 大图标组
 * 视觉：右上角彩色卡通图标组合 — 圆环 + 挂锁 + 播放按钮 + 散布短线。
 * 来源：你差的不是技术 / 是一个身份 — 绿色挂锁+播放按钮图标组
 */
export default function ReplicaIconCluster({ params, progress }: EffectProps) {
  const color = String(params.color ?? 'var(--stage-data)')

  const t = Math.max(0, Math.min(1, progress / 0.55))
  const e = applyEasing(t, 'easeOutQuart')

  // 散布短线 / 圆点装饰
  const decorations = [
    { x: 30, y: 20, w: 32, r: -25 },
    { x: 220, y: 40, w: 28, r: 25 },
    { x: 50, y: 180, w: 26, r: 15 },
    { x: 230, y: 200, w: 30, r: -15 },
    { x: 180, y: 10, w: 22, r: 0 },
  ]

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 28,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 260,
          height: 240,
          opacity: e,
          transform: `scale(${0.85 + e * 0.15})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 散布短线 */}
        {decorations.map((d, i) => {
          const dt = Math.max(0, Math.min(1, (progress - i * 0.04) / 0.45))
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: d.x,
                top: d.y,
                width: d.w,
                height: 3,
                borderRadius: 2,
                background: color,
                transform: `rotate(${d.r}deg)`,
                opacity: dt,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
          )
        })}

        {/* 圆环背景 */}
        <div
          style={{
            position: 'absolute',
            left: 75,
            top: 60,
            width: 110,
            height: 110,
            borderRadius: '50%',
            border: `2.5px solid ${color}`,
            boxShadow: `0 0 24px ${color}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 挂锁 */}
          <div
            style={{
              width: 56,
              height: 70,
              borderRadius: 8,
              border: `2px solid ${color}`,
              background: 'rgba(8,8,12,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 14px ${color}`,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
              <circle cx="12" cy="10" r="3" />
              <line x1="12" y1="13" x2="12" y2="18" />
            </svg>
          </div>
        </div>

        {/* 右上播放按钮 */}
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 70,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 16px rgba(0,0,0,0.5)`,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
            <polygon points="6,4 20,12 6,20" />
          </svg>
        </div>
      </div>
    </div>
  )
}