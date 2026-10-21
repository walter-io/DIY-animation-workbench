import type { EffectProps } from '../../types'
import { accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E17 ·  · 中央概念 + 椭圆环 8 颗环绕胶囊
 * 视觉：中央 2 行文字 + 虚线椭圆 + 8 颗胶囊围绕，每个胶囊独立入场。
 * 来源：导演系统 · 选题判断/文章沉淀/下次脚本/口播转换/策略回写/封面VFX/数据复盘/发布填稿
 */
export default function ReplicaOrbitRing({ params, progress }: EffectProps) {
  const center = String(params.center ?? '导演\n系统')
  const items = String(
    params.items ?? '选题判断,文章沉淀,口播转换,封面VFX,数据复盘,发布填稿,策略回写,下次脚本'
  )
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  const ringT = Math.max(0, Math.min(1, progress / 0.5))
  const ringE = applyEasing(ringT, 'easeOutQuart')
  const total = items.length
  const rx = 360
  const ry = 170

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
          width: 760,
          height: 420,
          opacity: ringE,
          transform: `scale(${0.9 + ringE * 0.1})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 中央标题 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 26,
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            textShadow: `0 0 18px ${accentAlpha(0.6)}`,
            lineHeight: 1.15,
          }}
        >
          {center.split('\n').filter(Boolean).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        {/* 椭圆虚线 */}
        <svg
          aria-hidden
          width={rx * 2}
          height={ry * 2}
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        >
          <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill="none" stroke={accentAlpha(0.45)} strokeWidth="1.4" strokeDasharray="4 5" />
        </svg>

        {/* 8 颗胶囊 */}
        {items.map((label, i) => {
          const ang = (i / total) * Math.PI * 2 - Math.PI / 2
          const x = rx + Math.cos(ang) * rx
          const y = ry + Math.sin(ang) * ry
          const t = Math.max(0, Math.min(1, (progress - 0.2 - (i / total) * 0.3) / 0.4))
          const e = applyEasing(t, 'easeOutBack')
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x - 50,
                top: y - 16,
                width: 100,
                height: 32,
                borderRadius: 16,
                border: `1px solid ${accentAlpha(0.6)}`,
                background: `rgba(8,8,12,0.6)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                opacity: e,
                transform: `scale(${0.6 + e * 0.4})`,
                boxShadow: `0 0 14px ${accentAlpha(0.25)}`,
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