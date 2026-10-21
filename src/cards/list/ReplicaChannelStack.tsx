import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E47 ·  · 3 渠道卡片堆
 * 视觉：3 行渠道卡（图标 + 标题 + 副标 + 右侧"正路/官方 2-5 折"小 badge），
 *      最后一行橙色高亮（揭示"中转站"这个真实渠道）。最下加一行小标"还有一个你拿不到的渠道"。
 * 来源：这差价是怎么来的? — 自部署/批量采购/中转站账号池
 * 颜色：原视频"答案行"橙色高亮 → --stage-special（金）+ alpha 14% 背景。
 */
export default function ReplicaChannelStack({ params, progress }: EffectProps) {
  const titleWhite = String(params.titleWhite ?? '这差价是')
  const titleOrange = String(params.titleOrange ?? '怎么来的?')
  const rows = String(
    params.rows ??
      '🖥|自部署开源模型|各家公司自己部署（H3 这类）|正路|cyan,🛒|批量采购|大公司包量，成本远低于你|正路|cyan,🗂|中转站账号池|脚本注册薅新人额度 → 聚合池|官方 2-5 折|orange'
  )
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const p = seg.split('|').map((x) => x.trim())
      return { icon: p[0] ?? '', title: p[1] ?? '', sub: p[2] ?? '', badge: p[3] ?? '', tone: p[4] ?? 'cyan' }
    })
  const caption = String(params.caption ?? '还有一个你拿不到的渠道')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')
  const toneToColor: Record<string, string> = { cyan: 'var(--stage-data)', orange: accent, red: 'var(--stage-assist)', purple: 'var(--stage-primary)' }
  const toneToBg: Record<string, string> = {
    cyan: 'rgba(90,200,250,0.18)',
    orange: accentAlpha(0.16),
    red: 'rgba(255,122,176,0.18)',
    purple: 'rgba(139,157,255,0.18)',
  }

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 18,
        padding: '0 40px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div
        style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          opacity: headE,
          transform: `translateY(${(1 - headE) * -14}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {titleWhite}
        <span style={{ color: accent, textShadow: `0 0 16px ${accentAlpha(0.4)}` }}>{titleOrange}</span>
      </div>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, i) => {
          const t = Math.max(0, Math.min(1, (progress - 0.2 - i * 0.1) / 0.4))
          const e = applyEasing(t, 'easeOutQuart')
          const isHighlight = r.tone === 'orange'
          const col = toneToColor[r.tone] ?? 'var(--stage-data)'
          const bg = toneToBg[r.tone] ?? 'rgba(90,200,250,0.16)'
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 20px 16px',
                borderRadius: 12,
                background: bg,
                border: isHighlight ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.1)',
                boxShadow: isHighlight ? `0 0 22px ${accentAlpha(0.22)}` : 'none',
                opacity: e,
                transform: `translateX(${(1 - e) * -24}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: isHighlight ? accent : col,
                  color: isHighlight ? '#141414' : '#0a0a0d',
                  fontSize: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {r.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: isHighlight ? accent : '#fff' }}>{r.title}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{r.sub}</span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: col,
                  color: '#0a0a0d',
                  whiteSpace: 'nowrap',
                  boxShadow: `0 0 10px ${col}77`,
                }}
              >
                {r.badge}
              </div>
            </div>
          )
        })}
      </div>
      {caption && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.65)',
            padding: '5px 14px',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999,
            opacity: applyEasing(Math.min(1, (progress - 0.5) / 0.3), 'easeOutQuart'),
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}