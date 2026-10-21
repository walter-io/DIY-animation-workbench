import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E16 IP Circle 结尾圆环图
 * 中心圆 + 三个卫星标签。
 */
export default function SrcVidIpCircle({ params, progress }: EffectProps) {
  const centerCn = String(params.centerCn ?? 'IP内容工程')
  const centerEn = String(params.centerEn ?? 'CONTENT ENGINE')
  const satellites = String(params.satellites ?? '复盘迭代,输出作品,沉淀系统')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

  const wrapT = Math.max(0, Math.min(1, progress / 0.5))
  const wrapE = applyEasing(wrapT, 'easeOutQuart')
  const mainT = Math.max(0, Math.min(1, (progress - 0.15) / 0.45))
  const mainE = applyEasing(mainT, 'easeOutBack')

  const positions = [
    { left: 0, top: '50%', transform: 'translateY(-50%)' },
    { right: 0, top: '50%', transform: 'translateY(-50%)' },
    { left: '50%', bottom: 0, transform: 'translateX(-50%)' },
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
          width: 440,
          height: 260,
          opacity: wrapE,
          transform: `scale(${0.85 + wrapE * 0.15})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${mainE})`,
            width: 140,
            height: 140,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            background: `radial-gradient(circle at 30% 30%, ${accentAlpha(0.18)}, transparent 60%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: `0 0 30px ${accentAlpha(0.18)}`,
            opacity: mainE,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>{centerCn}</div>
          <div style={{ fontSize: 10, color: 'var(--stage-text-muted)', letterSpacing: 1, marginTop: 4 }}>{centerEn}</div>
        </div>
        {satellites.slice(0, 3).map((label, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.3 - i * 0.1) / 0.45))
          const e = applyEasing(t, 'easeOutBack')
          const pos = positions[i]
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                ...pos,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--stage-surface)',
                border: `1px solid ${accentAlpha(0.25)}`,
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                opacity: e,
                transform: `${pos.transform} scale(${e})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
