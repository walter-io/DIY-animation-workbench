import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * AI 工具矩阵 3D 球面环绕卡（LOGO SPHERE）
 *
 * 在 logo-orbiter（2D 平面公转）基础上新增的 3D 版本：
 * 图标均匀分布在 3D 球面（黄金角分布），整个球面绕 Y 轴旋转，
 * perspective 产生近大远小景深，背面图标自动隐藏（backface-visibility）。
 */
export default function LogoSphere({ params, progress, meta }: EffectProps) {
  const centerLabel = String(params.centerLabel ?? 'AI 工具')
  const items = String(params.items ?? '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const radius = Number(params.radius ?? 240)
  const size = Number(params.size ?? 64)
  const tiltX = Number(params.tiltX ?? 18)
  const rotateDuration = Number(params.rotateDuration ?? 24)
  const spinDuration = Number(params.spinDuration ?? 0)
  const accentIdx = Number(meta.slot === 'right' ? 1 : meta.slot === 'center' ? 2 : 0)

  const accentColors = ['var(--overlay-primary)', 'var(--overlay-data)', 'var(--overlay-special)', 'var(--overlay-assist)']
  const head = Math.max(0, Math.min(1, progress / 0.3))
  const n = items.length

  // 黄金角（fibonacci sphere）均匀球面分布
  const points = items.map((_, i) => {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * 2.399963229728653
    return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r }
  })

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 32px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: radius * 2 + size + 60,
          height: radius * 2 + size + 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: radius * 5,
          opacity: applyEasing(head, 'easeOutQuart'),
          transition: 'opacity 0.15s linear',
        }}
      >
        {/* 中心标签（3D 层外，固定正面） */}
        {centerLabel && (
          <div
            style={{
              position: 'absolute',
              zIndex: 3,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: 'var(--overlay-text-muted)',
              padding: '6px 12px',
              borderRadius: 6,
              background: 'var(--overlay-surface-strong)',
              border: '1px solid var(--overlay-border)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {centerLabel}
          </div>
        )}
        {/* 3D 球面：绕 Y 轴旋转 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tiltX}deg)`,
            animation: `lo-sphere-y ${rotateDuration}s linear infinite`,
          }}
        >
          {items.map((label, i) => {
            const color = accentColors[(i + accentIdx) % accentColors.length]
            const p = points[i]
            return (
              <div
                key={`${i}-${label}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  transform: `translate3d(${p.x * radius}px, ${p.y * radius}px, ${p.z * radius}px)`,
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  animation: spinDuration > 0 ? `lo-spin ${Math.abs(spinDuration)}s linear infinite` : undefined,
                  animationDirection: spinDuration < 0 ? 'reverse' : undefined,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: color,
                    color: 'var(--overlay-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: Math.round(size * 0.4),
                    fontWeight: 700,
                    boxShadow: `0 6px 18px ${color}66`,
                  }}
                >
                  {label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
