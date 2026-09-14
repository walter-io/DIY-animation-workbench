import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E11 Profile Card 人物画像卡
 * “别人记住你的是”左侧信息卡滑入。
 */
export default function SrcVidProfileCard({ params, progress }: EffectProps) {
  const title = String(params.title ?? '别人记住你的是')
  const items = String(params.items ?? '你的经历\n你的判断和表达方式\n画面和动效只是辅助理解')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

  const wrapT = Math.max(0, Math.min(1, progress / 0.55))
  const wrapE = applyEasing(wrapT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 40,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          width: 320,
          opacity: wrapE,
          transform: `translateX(${(1 - wrapE) * -60}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 14 }}>{title}</div>
        {items.map((item, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.08) / 0.4))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                margin: '10px 0',
                fontSize: 14,
                color: 'var(--stage-text-muted)',
                lineHeight: 1.5,
                opacity: e,
                transform: `translateX(${(1 - e) * -20}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: accent,
                  marginTop: 7,
                  boxShadow: `0 0 8px ${accent}`,
                  flexShrink: 0,
                }}
              />
              <div>{item}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
