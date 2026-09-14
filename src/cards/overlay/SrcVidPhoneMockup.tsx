import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E12 Phone Mockup 手机预览滑入
 * 竖向手机/社媒帖子从左侧滑入。
 */
export default function SrcVidPhoneMockup({ progress }: EffectProps) {
  const phoneT = Math.max(0, Math.min(1, progress / 0.6))
  const phoneE = applyEasing(phoneT, 'easeOutQuart')
  const screenT = Math.max(0, Math.min(1, (progress - 0.35) / 0.4))
  const screenE = applyEasing(screenT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: 40,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          opacity: phoneE,
          transform: `translateX(${(1 - phoneE) * -120}px) perspective(800px) rotateY(${(1 - phoneE) * -18}deg)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            width: 170,
            height: 300,
            borderRadius: 22,
            background: '#111',
            border: '3px solid #333',
            boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 30px ${accentAlpha(0.1)}`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 6,
              borderRadius: 16,
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
              display: 'flex',
              flexDirection: 'column',
              opacity: screenE,
              transform: `scale(${0.9 + screenE * 0.1})`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <div
              style={{
                height: '55%',
                background: 'linear-gradient(135deg, #2a2a2a, #151515)',
                borderRadius: '12px 12px 0 0',
              }}
            />
            <div style={{ padding: 10 }}>
              {[60, 40, 70].map((w, i) => {
                const t = Math.max(0, Math.min(1, (progress - 0.5 - i * 0.06) / 0.3))
                const e = applyEasing(t, 'easeOutQuart')
                return (
                  <div
                    key={i}
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.12)',
                      margin: '6px 0',
                      width: `${w}%`,
                      transform: `scaleX(${e})`,
                      transformOrigin: 'left center',
                      transition: 'transform 0.1s linear',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
