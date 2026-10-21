import type { EffectProps } from '../../types'
import { EX_WHITE, AmberPill, inkAlpha, paperStyle, popStyle, riseStyle, seg } from './explainKit'

/**
 * 解说·强调页：铺垫行 + 特大号琥珀色药丸（转折/强调结论）。
 * 参考"但它没有行动能力"那页 —— 先列一堆好处，再用一页强调转折或关键短板。
 */
export default function ExplainerHighlight({ params, progress }: EffectProps) {
  const lead = String(params.lead ?? '会聊天、会写文案、会写代码…')
  const highlight = String(params.highlight ?? '但它没有行动能力')
  const note = String(params.note ?? '')

  const tLead = seg(progress, 0.02, 0.14)
  const tHighlight = seg(progress, 0.16, 0.16)
  const tNote = seg(progress, 0.32, 0.14)

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 42 }}>
      {lead && (
        <div
          style={{
            alignSelf: 'flex-start',
            background: EX_WHITE,
            color: inkAlpha(0.62),
            fontSize: 30,
            fontWeight: 500,
            padding: '14px 32px',
            borderRadius: 999,
            boxShadow: '0 6px 18px rgba(24,26,32,0.08)',
            ...riseStyle(tLead, 16),
          }}
        >
          {lead}
        </div>
      )}
      <AmberPill text={highlight} t={tHighlight} size={52} />
      {note && (
        <div style={{ fontSize: 28, fontWeight: 500, color: inkAlpha(0.55), ...popStyle(tNote) }}>
          {note}
        </div>
      )}
    </div>
  )
}
