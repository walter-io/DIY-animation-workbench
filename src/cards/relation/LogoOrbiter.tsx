import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * AI 工具矩阵 logo 簇公转卡（LOGO ORBITER）
 *
 * 视频中"一簇彩色 AI 工具 logo 围绕中心公转 + 自身缓慢自转"的动效。
 * 适合"工具集/产品矩阵/AI 生态"展示场景。
 */
export default function LogoOrbiter({ params, progress, meta }: EffectProps) {
  const centerLabel = String(params.centerLabel ?? 'AI 工具')
  const items = String(params.items ?? '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou\nbao')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const radius = Number(params.radius ?? 220)
  const size = Number(params.size ?? 72)
  const orbitDuration = Number(params.orbitDuration ?? 20)
  const spinDuration = Number(params.spinDuration ?? 14)
  const accentIdx = Number(meta.slot === 'right' ? 1 : meta.slot === 'center' ? 2 : 0)

  const accentColors = ['var(--overlay-primary)', 'var(--overlay-data)', 'var(--overlay-special)', 'var(--overlay-assist)']
  const totalSize = radius * 2 + size + 60
  const head = Math.max(0, Math.min(1, progress / 0.25))

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0,
        padding: '28px 32px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: totalSize,
          height: totalSize,
          opacity: applyEasing(head, 'easeOutQuart'),
          transition: 'opacity 0.15s linear',
        }}
      >
        {/* 中心标签 */}
        {centerLabel && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
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
        {/* 轨道圆环（视觉提示） */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: radius * 2,
            height: radius * 2,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1px dashed var(--overlay-border)',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
        {/* 公转图标 */}
        {items.map((label, i) => {
          const color = accentColors[(i + accentIdx) % accentColors.length]
          const delay = -(i * orbitDuration) / items.length
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
                animation: `lo-orbit ${orbitDuration}s linear infinite`,
                animationDelay: `${delay}s`,
                ['--lo-r' as string]: `${radius}px`,
                ['--lo-orbit' as string]: `${orbitDuration}s`,
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
                  boxShadow: `0 6px 18px ${color}55`,
                  animation: spinDuration > 0 ? `lo-spin ${Math.abs(spinDuration)}s linear infinite` : undefined,
                  animationDirection: spinDuration < 0 ? 'reverse' : undefined,
                }}
              >
                {label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
