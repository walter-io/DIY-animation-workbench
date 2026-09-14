import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E19 ·  · 左上小 UI 截图窗口
 * 视觉：浮动在左上角的小窗口，描边发光，内含 1 个标题 + 多行模拟内容文字。
 * 来源：OPENAI ACADEMY / Skills 官方文档截图
 */
export default function ReplicaCodeWindow({ params, progress }: EffectProps) {
  const header = String(params.header ?? 'OPENAI ACADEMY / Skills')
  const title = String(params.title ?? 'Introducing skills in ChatGPT')
  const lines = String(params.lines ?? 'Skills are lists of instructions that ChatGPT can use to perform specific tasks. For example, you can upload skills files to engineering blogs, formats, and requirements, and have them applied to a saved result.')
    .split(/[,，\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const accent = ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.5))
  const e = applyEasing(t, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: 28,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          width: 380,
          borderRadius: 6,
          background: 'rgba(255,255,255,0.94)',
          border: `1.5px solid ${accentAlpha(0.85)}`,
          boxShadow: `0 0 22px ${accentAlpha(0.4)}, 0 0 60px ${accentAlpha(0.18)}`,
          padding: 0,
          overflow: 'hidden',
          opacity: e,
          transform: `translateY(${(1 - e) * -16}px) scale(${0.92 + e * 0.08})`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 顶部品牌头 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#222',
            background: '#f6f7f9',
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
          <span style={{ color: accent }}>{header}</span>
        </div>

        {/* 标题 */}
        <div
          style={{
            padding: '14px 16px 4px',
            fontSize: 16,
            fontWeight: 800,
            color: '#0a0a0a',
          }}
        >
          {title}
        </div>

        {/* 内容文字 */}
        <div
          style={{
            padding: '4px 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {lines.slice(0, 4).map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                lineHeight: 1.5,
                color: '#3a3a3a',
                background: i % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent',
                padding: '3px 6px',
                borderRadius: 3,
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}