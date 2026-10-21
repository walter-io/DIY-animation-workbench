import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * E27 ·  · 卡通人物 + 环绕弧线箭头
 * 视觉：卡通人物中央，4 段弧形箭头从上下左右环绕指向中心。
 * 来源：你差的不是技术 / 是一个身份 — 紫色人物 + 绿色挂锁的环绕动画
 */
export default function ReplicaMascotArrowLoop({ params, progress }: EffectProps) {
  const color = String(params.color ?? 'var(--stage-primary)')
  const mascotKind = String(params.mascot ?? 'figure') // figure | lock

  const t = Math.max(0, Math.min(1, progress / 0.55))
  const e = applyEasing(t, 'easeOutQuart')

  const arrows = [
    { angle: 0, label: 'A' },
    { angle: 90, label: 'B' },
    { angle: 180, label: 'C' },
    { angle: 270, label: 'D' },
  ]

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 220,
          height: 220,
          opacity: e,
          transform: `scale(${0.85 + e * 0.15})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 中央人物/锁 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 70,
            height: 90,
          }}
        >
          {mascotKind === 'lock' ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 12,
                border: `2.5px solid ${color}`,
                background: 'rgba(15,15,18,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 24px ${color}`,
              }}
            >
              {/* 锁孔 */}
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
                <circle cx="12" cy="10" r="3" />
                <line x1="12" y1="13" x2="12" y2="18" />
              </svg>
            </div>
          ) : (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transform: 'translateX(-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 18px ${color}`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 36,
                  transform: 'translateX(-50%)',
                  width: 50,
                  height: 54,
                  borderTopLeftRadius: 25,
                  borderTopRightRadius: 25,
                  borderBottomLeftRadius: 10,
                  borderBottomRightRadius: 10,
                  background: color,
                  boxShadow: `0 0 18px ${color}`,
                }}
              />
            </>
          )}
        </div>

        {/* 4 段弧形箭头 */}
        {arrows.map((a, i) => {
          const at = Math.max(0, Math.min(1, (progress - 0.1 - i * 0.08) / 0.4))
          const ae = applyEasing(at, 'easeOutQuart')
          return (
            <svg
              key={i}
              width="60"
              height="60"
              viewBox="0 0 60 60"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) rotate(${a.angle}deg) translate(${70 * ae}px, 0) rotate(${-a.angle}deg)`,
                opacity: ae,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <path
                d="M 10 30 A 20 20 0 0 1 50 30"
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinecap="round"
              />
              <polygon points="46,24 56,30 46,36" fill={color} />
            </svg>
          )
        })}
      </div>
    </div>
  )
}