import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * 概念放射图
 *
 * 视频中"大模型 Reads Code"效果：左侧代码面板、中心菱形节点、
 * 右侧输出节点，以及流动的发光连线。适合"AI 能力/工作流/概念解释"。
 */
export default function ConceptMap({ params, progress }: EffectProps) {
  const leftTitle = String(params.leftTitle ?? 'CODE DRIVER')
  const codeLines = String(
    params.codeLines ?? 'useCurrentFrame()\ninterpolate(frame)\n<Composition />\nspring({fps})\nreturn <Scene />\nprops -> motion'
  )
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const centerTitle = String(params.centerTitle ?? '大模型')
  const centerSub = String(params.centerSub ?? 'READS CODE')
  const centerHint = String(params.centerHint ?? '看懂代码')
  const outputs = String(params.outputs ?? '字幕\n文案\n动效\n镜头\n导出')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const rightTitle = String(params.rightTitle ?? '完成创作')

  const head = Math.max(0, Math.min(1, progress / 0.25))
  const headEased = applyEasing(head, 'easeOutQuart')

  const outList = outputs.slice(0, 6)

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 28,
        padding: '28px 32px',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          opacity: headEased,
          transform: `translateX(${(1 - headEased) * -24}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--stage-primary)', marginBottom: 6 }}>{leftTitle}</div>
        <div
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid var(--stage-border)',
            borderRadius: 10,
            padding: '14px 16px',
            fontFamily: "'SFMono-Regular', Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.7,
            color: 'var(--stage-text-muted)',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.25)',
          }}
        >
          {codeLines.map((line, i) => {
            const t = Math.max(0, Math.min(1, (progress - 0.12 - i * 0.04) / 0.5))
            const e = applyEasing(t, 'easeOut')
            return (
              <div key={i} style={{ opacity: e, transform: `translateX(${(1 - e) * -10}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear', color: i % 2 === 0 ? '#5ac8fa' : '#a78bfa' }}>
                {line}
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={160} height={160} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {outList.map((_, i) => {
            const angle = ((i - (outList.length - 1) / 2) * 26 * Math.PI) / 180
            const x2 = 80 + Math.cos(angle) * 120
            const y2 = 80 + Math.sin(angle) * 70
            const t = Math.max(0, Math.min(1, (progress - 0.35 - i * 0.05) / 0.45))
            const e = applyEasing(t, 'easeOut')
            return (
              <line
                key={`conn-${i}`}
                x1={80}
                y1={80}
                x2={x2}
                y2={y2}
                stroke="url(#lo-flow)"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.45 * e}
                style={{ transition: 'opacity 0.1s linear' }}
              >
                <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="1.6s" repeatCount="indefinite" />
              </line>
            )
          })}
          <defs>
            <linearGradient id="lo-flow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#ec4899" stopOpacity="1" />
              <stop offset="100%" stopColor="#5ac8fa" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>

        <div
          style={{
            width: 110,
            height: 110,
            transform: `rotate(45deg) scale(${headEased})`,
            background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 36px #8b5cf6aa',
            transition: 'transform 0.1s linear',
            zIndex: 2,
          }}
        >
          <div style={{ transform: 'rotate(-45deg)', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{centerTitle}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>{centerSub}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginTop: 3 }}>{centerHint}</div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--stage-accent)',
            opacity: headEased,
            transform: `translateX(${(1 - headEased) * 24}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            marginBottom: 4,
          }}
        >
          {rightTitle}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          {outList.map((label, i) => {
            const t = Math.max(0, Math.min(1, (progress - 0.35 - i * 0.05) / 0.5))
            const e = applyEasing(t, 'easeOutBack')
            const color = ['#5ac8fa', '#a78bfa', '#ec4899', '#34d399', '#ffd166', '#ff7ab0'][i % 6]
            return (
              <div
                key={i}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: 'var(--stage-surface)',
                  border: `1.5px solid ${color}`,
                  color,
                  fontSize: 14,
                  fontWeight: 700,
                  boxShadow: `0 0 14px ${color}33`,
                  opacity: e,
                  transform: `translateX(${(1 - e) * 30}px) scale(${0.85 + e * 0.15})`,
                  transition: 'transform 0.1s linear, opacity 0.1s linear',
                }}
              >
                {label}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
