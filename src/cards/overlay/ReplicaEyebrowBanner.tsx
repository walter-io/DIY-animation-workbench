import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E21 ·  · 左上胶囊眉条
 * 视觉：圆角矩形带左侧色条 + 英文 eyebrow + 中文副标，可换强调色。
 * 来源：WHY PEOPLE STOP / 不是不想拍，是先被工具劝退
 *      THE 3-STEP WORKFLOW / 甲方不是甩手…
 *      FEEDBACK LOOP / 脏车不可怕…
 *      YOUR NEW IDENTITY / 别再被"剪辑"两个字劝退
 */
export default function ReplicaEyebrowBanner({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'WHY PEOPLE STOP')
  const subtitle = String(params.subtitle ?? '不是不想拍，是先被工具劝退')
  const tone = String(params.tone ?? 'cyan') // cyan | purple | red | green | yellow | primary
  const accentMap: Record<string, string> = {
    cyan: 'var(--stage-data)',
    purple: 'var(--stage-primary)',
    red: 'var(--stage-assist)',
    green: 'var(--stage-data)',
    yellow: 'var(--stage-special)',
    primary: 'var(--stage-primary)',
  }
  const color = accentMap[tone] ?? ACCENT

  const t = Math.max(0, Math.min(1, progress / 0.4))
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
        padding: 24,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: 6,
          background: 'rgba(20,20,24,0.78)',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          opacity: e,
          transform: `translateX(${(-1 + e) * 16}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {/* 左侧色条 */}
        <div
          style={{
            width: 4,
            background: color,
            boxShadow: `0 0 12px ${color}`,
            flexShrink: 0,
          }}
        />
        {/* 文字 */}
        <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.18em',
              color,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{subtitle}</div>
        </div>
      </div>
    </div>
  )
}