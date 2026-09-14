import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E05 Circular Relation 环形关系图
 * 中央圆 + 左右卫星 + 弧线连接。
 */
export default function SrcVidCircularRelation({ params, progress }: EffectProps) {
  const center = String(params.center ?? '同一张图')
  const left = String(params.left ?? '工具')
  const right = String(params.right ?? '工作流')
  const accent = ACCENT

  const wrapT = Math.max(0, Math.min(1, progress / 0.5))
  const wrapE = applyEasing(wrapT, 'easeOutQuart')
  const mainT = Math.max(0, Math.min(1, (progress - 0.15) / 0.45))
  const mainE = applyEasing(mainT, 'easeOutBack')

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
          width: 420,
          height: 240,
          opacity: wrapE,
          transform: `scale(${0.85 + wrapE * 0.15})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 110,
            right: 110,
            top: '50%',
            transform: 'translateY(-50%)',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accentAlpha(0.6)}, transparent)`,
            transformOrigin: 'left center',
            opacity: wrapE,
            scale: `${wrapE} 1`,
          }}
        />
        {[
          { label: left, side: 'left' },
          { label: right, side: 'right' },
        ].map(({ label, side }, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.1) / 0.45))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <div
              key={side}
              style={{
                position: 'absolute',
                top: '50%',
                [side]: 20,
                transform: `translateY(-50%) translateX(${(1 - e) * (side === 'left' ? -40 : 40)}px)`,
                width: 90,
                height: 90,
                borderRadius: '50%',
                border: `1px solid ${accentAlpha(0.4)}`,
                background: `${accentAlpha(0.06)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: accent,
                opacity: e,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {label}
            </div>
          )
        })}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) scale(${mainE})`,
            width: 130,
            height: 130,
            borderRadius: '50%',
            border: `1.5px solid ${accent}`,
            background: `radial-gradient(circle at 30% 30%, ${accentAlpha(0.18)}, transparent 60%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            boxShadow: `0 0 30px ${accentAlpha(0.18)}`,
            opacity: mainE,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          {center}
        </div>
      </div>
    </div>
  )
}
