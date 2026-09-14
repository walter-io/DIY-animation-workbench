import type { EffectProps } from '../../types'

/**
 * 节目角标卡（SHOW BRACKET）
 *
 * 左上角持续角标：眉头小标签 + 主标 + 副标 + 段号 + 段名 + 可选副信息。
 * 适合放在 left 槽或自由定位，持续显示节目/章节进度。
 */
export default function ShowBracket({ params, progress, isPreview }: EffectProps) {
  const kicker = String(params.kicker ?? 'AI 内容工作流')
  const title = String(params.title ?? '本期拆解')
  const subtitle = String(params.subtitle ?? '链接 · 内容 · 流程 · 越用越顺手')
  const segNum = String(params.segNum ?? '01')
  const segName = String(params.segName ?? '开篇·建立认知')
  const footnote = String(params.footnote ?? '')

  const head = Math.max(0, Math.min(1, progress / 0.2))
  const headEased = head
  const seg = Math.max(0, Math.min(1, (progress - 0.15) / 0.7))
  const segEased = seg

  return (
    <div
      className="os-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: isPreview ? 8 : 14,
        width: '100%',
        height: '100%',
        minHeight: '100%',
      }}
    >
      <div
        style={{
          fontSize: isPreview ? 10 : 14,
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--stage-text-muted)',
          opacity: headEased,
          transform: `translateY(${(1 - headEased) * 6}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontSize: isPreview ? 28 : 56,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--stage-accent)',
          opacity: headEased,
          transform: `translateY(${(1 - headEased) * 10}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: isPreview ? 11 : 16,
          fontWeight: 500,
          color: 'var(--stage-text-muted)',
          opacity: headEased,
          transition: 'opacity 0.1s linear',
        }}
      >
        {subtitle}
      </div>
      <div
        style={{
          width: '100%',
          height: 1,
          background: 'var(--stage-border)',
          opacity: headEased,
          transition: 'opacity 0.1s linear',
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isPreview ? 10 : 16,
          opacity: segEased,
          transform: `translateY(${(1 - segEased) * 8}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <span
          style={{
            fontSize: isPreview ? 18 : 32,
            fontWeight: 700,
            color: 'var(--stage-primary)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {segNum}
        </span>
        <span
          style={{
            width: 1,
            alignSelf: 'stretch',
            background: 'var(--stage-border)',
            height: isPreview ? 14 : 22,
          }}
        />
        <span
          style={{
            fontSize: isPreview ? 12 : 18,
            fontWeight: 600,
            color: 'var(--stage-text)',
            letterSpacing: '0.02em',
          }}
        >
          {segName}
        </span>
      </div>
      {footnote && (
        <div
          style={{
            fontSize: isPreview ? 9 : 12,
            color: 'var(--stage-text-muted)',
            letterSpacing: '0.06em',
            opacity: segEased,
            transition: 'opacity 0.1s linear',
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  )
}
