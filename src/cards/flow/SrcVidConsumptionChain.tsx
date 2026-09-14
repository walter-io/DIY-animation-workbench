import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E13 Consumption Chain 消耗链
 * 标题 + 三节点横向流程，连线自左向右生长。
 */
export default function SrcVidConsumptionChain({ params, progress }: EffectProps) {
  const title = String(params.title ?? '想法到发布的消耗链')
  const nodes = String(params.nodes ?? '资料整理,文案成型,画面制作')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const titleT = Math.max(0, Math.min(1, progress / 0.4))
  const titleE = applyEasing(titleT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          marginBottom: 26,
          opacity: titleE,
          transform: `translateY(${(1 - titleE) * -16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {nodes.map((node, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.2 - i * 0.15) / 0.45))
          const e = applyEasing(t, 'easeOutBack')
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 8,
                  background: 'var(--stage-surface)',
                  border: `1px solid ${accentAlpha(0.25)}`,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  opacity: e,
                  transform: `translateY(${(1 - e) * 24}px) scale(${0.9 + e * 0.1})`,
                  transition: 'transform 0.1s linear, opacity 0.1s linear',
                }}
              >
                {node}
              </div>
              {i < nodes.length - 1 && (
                <div
                  style={{
                    width: 70,
                    height: 2,
                    background: `${accentAlpha(0.6)}`,
                    position: 'relative',
                    transformOrigin: 'left center',
                    transform: `scaleX(${Math.max(0, Math.min(1, (progress - 0.35 - i * 0.15) / 0.35))})`,
                    transition: 'transform 0.1s linear',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      right: -2,
                      top: -3,
                      width: 8,
                      height: 8,
                      borderTop: `2px solid ${accentAlpha(0.6)}`,
                      borderRight: `2px solid ${accentAlpha(0.6)}`,
                      transform: 'rotate(45deg)',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
