import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E16 ·  · 中央椭圆 + 左右卫星簇
 * 视觉：左侧 N 个圆点列表 + 中央椭圆大字 + 右侧 N 个圆点列表，虚线连接。
 * 来源：编排关系 4 项 + 输入/产物/交接/回流 4 项
 */
export default function ReplicaOrbitCluster({ params, progress }: EffectProps) {
  const center = String(params.center ?? '编排\n关系')
  const leftItems = String(params.leftItems ?? '文章,口播,封面,数据')
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const rightItems = String(params.rightItems ?? '输入,产物,交接,回流')
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const leftColor = String(params.leftColor ?? 'var(--stage-special)')
  const rightColor = String(params.rightColor ?? 'var(--stage-data)')
  const centerColor = ACCENT

  const ringT = Math.max(0, Math.min(1, progress / 0.5))
  const ringE = applyEasing(ringT, 'easeOutQuart')
  const itemT = Math.max(0, Math.min(1, (progress - 0.15) / 0.55))
  const itemE = applyEasing(itemT, 'easeOutQuart')

  const lines = center.split('\n').filter(Boolean)
  const total = Math.max(leftItems.length, rightItems.length)
  const height = 80 + (total - 1) * 52

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
          width: 620,
          height,
          opacity: ringE,
          transform: `scale(${0.92 + ringE * 0.08})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 左侧 */}
        <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {leftItems.map((label, i) => (
            <div
              key={`l${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: itemE,
                transform: `translateX(${(-1 + itemE) * 24}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: leftColor,
                  boxShadow: `0 0 10px ${leftColor}`,
                }}
              />
              <span style={{ fontSize: 18, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* 中央椭圆 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 130,
            height: 110,
            borderRadius: '50%',
            border: `1.5px solid ${centerColor}`,
            background: `radial-gradient(circle at 30% 30%, ${accentAlpha(0.18)}, transparent 60%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: `0 0 30px ${accentAlpha(0.22)}`,
          }}
        >
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.15 }}>{l}</div>
          ))}
        </div>

        {/* 右侧 */}
        <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {rightItems.map((label, i) => (
            <div
              key={`r${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: itemE,
                transform: `translateX(${(1 - itemE) * 24}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>{label}</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: rightColor,
                  boxShadow: `0 0 10px ${rightColor}`,
                }}
              />
            </div>
          ))}
        </div>

        {/* 中央椭圆外圈装饰虚线 */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 280,
            height: 220,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            border: '1px dashed rgba(255,255,255,0.18)',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  )
}