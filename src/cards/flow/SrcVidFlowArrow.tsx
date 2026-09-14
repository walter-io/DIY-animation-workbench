import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E07 Flow Arrow 流程箭头
 * 横向节点 + 箭头依次点亮。
 */
export default function SrcVidFlowArrow({ params, progress }: EffectProps) {
  const nodes = String(params.nodes ?? '这条视频,下一条视频')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {nodes.map((node, i) => {
          const t = Math.max(0, Math.min(1, (progress - i * 0.2) / 0.45))
          const e = applyEasing(t, 'easeOutBack')
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  padding: '12px 22px',
                  borderRadius: 8,
                  background: 'var(--stage-surface)',
                  border: `1px solid ${accentAlpha(0.3)}`,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  opacity: e,
                  transform: `scale(${0.8 + e * 0.2})`,
                  transition: 'transform 0.1s linear, opacity 0.1s linear',
                }}
              >
                {node}
              </div>
              {i < nodes.length - 1 && (
                <div
                  style={{
                    width: 64,
                    height: 2,
                    background: `${accentAlpha(0.6)}`,
                    position: 'relative',
                    boxShadow: `0 0 8px ${accentAlpha(0.4)}`,
                    transformOrigin: 'left center',
                    transform: `scaleX(${Math.max(0, Math.min(1, (progress - 0.15 - i * 0.2) / 0.35))})`,
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
