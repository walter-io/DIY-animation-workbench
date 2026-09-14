import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E10 Human-AI Diagram 人-AI 协作图
 * 左右两面板 + 中间箭头穿梭。
 */
export default function SrcVidHumanAiDiagram({ params, progress }: EffectProps) {
  const accent = ACCENT
  const leftTitle = String(params.leftTitle ?? 'AI 协作者')
  const rightTitle = String(params.rightTitle ?? '人主导')
  const leftItems = String(params.leftItems ?? '资料研究\n结构整理\n制作执行')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const rightItems = String(params.rightItems ?? '决定说什么\n判断与表达\n创意核心')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  const leftT = Math.max(0, Math.min(1, progress / 0.5))
  const leftE = applyEasing(leftT, 'easeOutQuart')
  const rightT = Math.max(0, Math.min(1, (progress - 0.15) / 0.5))
  const rightE = applyEasing(rightT, 'easeOutQuart')
  const connT = Math.max(0, Math.min(1, (progress - 0.3) / 0.4))
  const connE = applyEasing(connT, 'easeOutBack')

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Panel title={leftTitle} items={leftItems} accent={accent} x={-40} e={leftE} progress={progress} delay={0.45} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            opacity: connE,
            transform: `scale(${0.8 + connE * 0.2})`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ fontSize: 12, color: accent, fontWeight: 700 }}>协作</div>
          <div style={{ width: 34, height: 2, background: `${accentAlpha(0.6)}`, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: -3,
                width: 8,
                height: 8,
                borderTop: `2px solid ${accentAlpha(0.6)}`,
                borderRight: `2px solid ${accentAlpha(0.6)}`,
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--stage-text-muted)', fontWeight: 400 }}>支持</div>
        </div>
        <Panel title={rightTitle} items={rightItems} accent={accent} x={40} e={rightE} progress={progress} delay={0.55} />
      </div>
    </div>
  )
}

function Panel({ title, items, accent, x, e, progress, delay }: {
  title: string
  items: string[]
  accent: string
  x: number
  e: number
  progress: number
  delay: number
}) {
  return (
    <div
      style={{
        width: 200,
        borderRadius: 12,
        padding: '18px 16px',
        background: 'var(--stage-surface)',
        border: `1px solid ${accentAlpha(0.22)}`,
        position: 'relative',
        overflow: 'hidden',
        opacity: e,
        transform: `translateX(${(1 - e) * x}px)`,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accent,
          boxShadow: `0 0 10px ${accent}`,
        }}
      />
      <div style={{ fontSize: 18, fontWeight: 800, color: accent, marginBottom: 10 }}>{title}</div>
      {items.map((item, i) => {
        const t = Math.max(0, Math.min(1, (progress - delay - i * 0.06) / 0.35))
        const itemE = applyEasing(t, 'easeOutQuart')
        return (
          <div
            key={i}
            style={{
              fontSize: 12,
              color: 'var(--stage-text-muted)',
              margin: '4px 0',
              opacity: itemE,
              transform: `translateX(${(1 - itemE) * -10}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}
