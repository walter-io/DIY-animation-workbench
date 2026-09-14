import type { EffectProps } from '../../types'

/**
 * 终端命令卡（COMMAND CARD）
 *
 * 命令/链接展示：眉头小标签 + 命令/链接内容 + 来源标签。
 * 适合演示操作步骤或嵌入代码/URL。
 */
export default function CommandCard({ params, progress }: EffectProps) {
  const kicker = String(params.kicker ?? '单条命令')
  const title = String(params.title ?? '交给助手处理')
  const command = String(params.command ?? 'https://example.com/xxx')
  const sourceLabel = String(params.sourceLabel ?? '链接')
  const hint = String(params.hint ?? '')

  const head = Math.max(0, Math.min(1, progress / 0.2))
  const cmd = Math.max(0, Math.min(1, (progress - 0.2) / 0.7))

  return (
    <div
      className="os-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        width: '100%',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--stage-special)',
          opacity: head,
          transition: 'opacity 0.1s linear',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          opacity: head,
          transform: `translateY(${(1 - head) * 8}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--stage-accent)',
            lineHeight: 1.2,
          }}
        >
          {title}
        </span>
        {hint && (
          <span style={{ fontSize: 13, color: 'var(--stage-text-muted)' }}>{hint}</span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: '12px 14px',
          borderRadius: 10,
          background: 'var(--stage-surface-strong)',
          border: '1px solid var(--stage-border)',
          opacity: cmd,
          transform: `translateY(${(1 - cmd) * 10}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--stage-data)',
          }}
        >
          {sourceLabel}
        </span>
        <span
          style={{
            fontSize: 15,
            color: 'var(--stage-text)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            wordBreak: 'break-all',
          }}
        >
          {command}
        </span>
      </div>
    </div>
  )
}
