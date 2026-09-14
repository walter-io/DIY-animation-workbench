import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * 中心卫星环
 *
 *  Remotion 引擎入口效果：中心图标 + 环绕公转的关键词/标签 +
 * 可选辐射连线，适合"技术栈/产品能力/生态"展示。
 */
export default function OrbitCore({ params, progress }: EffectProps) {
  const centerIcon = String(params.centerIcon ?? '▶')
  const centerLabel = String(params.centerLabel ?? 'REMOTION')
  const centerSub = String(params.centerSub ?? 'CODE DRIVEN VIDEO ENGINE')
  const items = String(params.items ?? 'React\nSVG\nAudio\nTimeline\nExport\nFrames\nspring\ninterpolate')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const radius = Number(params.radius ?? 200)
  const size = Number(params.size ?? 62)
  const orbitDuration = Number(params.orbitDuration ?? 24)
  const spinDuration = Number(params.spinDuration ?? 0)
  const showLines = params.showLines !== false
  const showRays = params.showRays === true

  const accentColors = ['var(--overlay-primary)', 'var(--overlay-data)', 'var(--overlay-special)', 'var(--overlay-assist)']
  const totalSize = radius * 2 + size + 80
  const head = Math.max(0, Math.min(1, progress / 0.25))
  const headEased = applyEasing(head, 'easeOutBack')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: '28px 32px',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: totalSize,
          height: totalSize,
          opacity: headEased,
          transition: 'opacity 0.15s linear',
        }}
      >
        {showRays && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: radius * 2.2,
              height: radius * 2.2,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, transparent 0deg, var(--overlay-primary) 4deg, transparent 8deg, transparent 32deg, var(--overlay-primary) 36deg, transparent 40deg, transparent 64deg, var(--overlay-primary) 68deg, transparent 72deg, transparent 96deg, var(--overlay-primary) 100deg, transparent 104deg, transparent 128deg, var(--overlay-primary) 132deg, transparent 136deg, transparent 160deg, var(--overlay-primary) 164deg, transparent 168deg, transparent 192deg, var(--overlay-primary) 196deg, transparent 200deg, transparent 224deg, var(--overlay-primary) 228deg, transparent 232deg, transparent 256deg, var(--overlay-primary) 260deg, transparent 264deg, transparent 288deg, var(--overlay-primary) 292deg, transparent 296deg, transparent 320deg, var(--overlay-primary) 324deg, transparent 328deg, transparent 352deg, var(--overlay-primary) 356deg, transparent 360deg)`,
              opacity: 0.08,
              animation: `lo-spin ${orbitDuration * 1.5}s linear infinite`,
              pointerEvents: 'none',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: radius * 2,
            height: radius * 2,
            borderRadius: '50%',
            border: '1px dashed var(--overlay-border)',
            opacity: 0.35,
            pointerEvents: 'none',
          }}
        />

        {showLines &&
          items.map((_, i) => {
            const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2
            const x2 = Math.cos(angle) * radius
            const y2 = Math.sin(angle) * radius
            return (
              <svg
                key={`line-${i}`}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: totalSize,
                  height: totalSize,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                <line
                  x1={totalSize / 2}
                  y1={totalSize / 2}
                  x2={totalSize / 2 + x2}
                  y2={totalSize / 2 + y2}
                  stroke="var(--overlay-primary)"
                  strokeWidth={1}
                  strokeDasharray="4 6"
                  opacity={0.25}
                >
                  <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="2s" repeatCount="indefinite" />
                </line>
              </svg>
            )
          })}

        {items.map((label, i) => {
          const color = accentColors[i % accentColors.length]
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
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: size > 60 ? 10 : '50%',
                  background: 'var(--overlay-surface-strong)',
                  border: `1.5px solid ${color}`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: Math.max(12, Math.round(size * 0.3)),
                  fontWeight: 700,
                  boxShadow: `0 0 16px ${color}44`,
                  animation: spinDuration > 0 ? `lo-spin ${spinDuration}s linear infinite` : undefined,
                  animationDirection: spinDuration < 0 ? 'reverse' : undefined,
                }}
              >
                {label}
              </div>
            </div>
          )
        })}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${headEased})`,
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 34px #ec4899aa',
            transition: 'transform 0.1s linear',
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: size, color: '#fff', marginLeft: 4 }}>{centerIcon}</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', opacity: headEased, transform: `translateY(${(1 - headEased) * 14}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '0.04em', color: 'var(--stage-accent)', lineHeight: 1 }}>{centerLabel}</div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stage-text-muted)', marginTop: 8 }}>
          {centerSub}
        </div>
      </div>
    </div>
  )
}
