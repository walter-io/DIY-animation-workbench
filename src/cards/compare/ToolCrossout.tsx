import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * 工具替代 / 排除卡
 *
 * 视频中"没条件用 Codex、Claude Code → 国产工具全都能胜任"效果：
 * 先展示被划掉的旧工具，再高亮替代工具。适合"方案替代/工具推荐"。
 */
export default function ToolCrossout({ params, progress }: EffectProps) {
  const title = String(params.title ?? '没条件用')
  const subtitle = String(params.subtitle ?? '没关系，工作流不必停下。')
  const altTitle = String(params.altTitle ?? '国产替代全都能胜任')
  const oldTools = String(params.oldTools ?? 'Codex\nClaude Code')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const newTools = String(params.newTools ?? 'TRAE Work\nQclaw\nAutoClaw\nCoPaw')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  const crossColor = String(params.crossColor ?? '#ef4444')

  const head = Math.max(0, Math.min(1, progress / 0.2))
  const headEased = applyEasing(head, 'easeOutQuart')

  const crossStart = 0.35
  const crossEnd = 0.55
  const crossT = Math.max(0, Math.min(1, (progress - crossStart) / (crossEnd - crossStart)))
  const crossEased = applyEasing(crossT, 'easeOut')

  const altStart = 0.55

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 26,
        padding: '28px 32px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          opacity: headEased,
          transform: `translateY(${(1 - headEased) * 16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--stage-accent)', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 14, color: 'var(--stage-text-muted)', marginTop: 6 }}>{subtitle}</div>
      </div>

      <div style={{ display: 'flex', gap: 28, justifyContent: 'center', position: 'relative' }}>
        {oldTools.map((tool, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.1 - i * 0.08) / 0.3))
          const e = applyEasing(t, 'easeOutBack')
          return (
            <div
              key={tool}
              style={{
                position: 'relative',
                width: 96,
                height: 96,
                borderRadius: 20,
                background: 'var(--stage-surface)',
                border: '1.5px solid var(--stage-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--stage-text-muted)',
                opacity: e * (0.3 + 0.7 * (1 - crossEased)),
                transform: `scale(${e})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
                filter: crossEased > 0.8 ? 'grayscale(0.8)' : 'none',
              }}
            >
              {tool}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    width: '130%',
                    height: 4,
                    background: crossColor,
                    borderRadius: 2,
                    boxShadow: `0 0 10px ${crossColor}`,
                    transform: `rotate(-45deg) scaleX(${crossEased})`,
                    transformOrigin: 'left center',
                    opacity: crossEased,
                    transition: 'transform 0.1s linear, opacity 0.1s linear',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          textAlign: 'center',
          opacity: Math.max(0, Math.min(1, (progress - altStart) / 0.2)),
          transform: `translateY(${(1 - Math.max(0, Math.min(1, (progress - altStart) / 0.2))) * 14}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--stage-primary)' }}>{altTitle}</div>
      </div>

      <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
        {newTools.map((tool, i) => {
          const t = Math.max(0, Math.min(1, (progress - altStart - 0.06 - i * 0.06) / 0.3))
          const e = applyEasing(t, 'easeOutBack')
          const color = ['#5ac8fa', '#a78bfa', '#ec4899', '#34d399', '#ffd166', '#ff7ab0'][i % 6]
          return (
            <div
              key={tool}
              style={{
                width: 88,
                height: 88,
                borderRadius: 18,
                background: 'var(--stage-surface)',
                border: `2px solid ${color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color,
                boxShadow: `0 0 20px ${color}44`,
                opacity: e,
                transform: `scale(${0.7 + e * 0.3})`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              {tool}
            </div>
          )
        })}
      </div>
    </div>
  )
}
