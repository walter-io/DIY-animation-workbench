import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E51 ·  · 漏斗图 + 顶部 chips
 * 视觉：上方 eyebrow 文字 + 3 个小描边 chips（晒收益/开班收徒/被媒体采访），下方 3 层漏斗（梯形 + 颜色渐变）。
 * 来源：这是我最想跟你说清楚的一件事：你看到的，全是活下来的 — 漏斗
 * 颜色：原视频三色 chips（橙/红/蓝）+ 漏斗三色层（金/深蓝/暗灰）→ --stage-special / --stage-assist / --stage-data。
 */
export default function ReplicaFunnelConversion({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '这是我最想跟你说清楚的一件事：你看到的，全是')
  const eyebrowOrange = String(params.eyebrowOrange ?? '活下来的')
  const chips = String(params.chips ?? '晒收益的,开班收徒的,被媒体采访的')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const layers = String(params.layers ?? '顶部,中段,沉底')
  const accent = ACCENT
  const chipColors = [accent, 'var(--stage-assist)', 'var(--stage-data)']
  // 漏斗三层：顶层走项目金 --stage-special，中底层深色渐隐（对应原视频"越来越少"的语义）
  const layerColors = ['var(--stage-special)', '#3a4a6b', '#222a3a']

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')
  const chipT = (i: number) => Math.max(0, Math.min(1, (progress - 0.18 - i * 0.07) / 0.35))
  const chipE = (i: number) => applyEasing(chipT(i), 'easeOutQuart')
  const layerT = (i: number) => Math.max(0, Math.min(1, (progress - 0.3 - (2 - i) * 0.1) / 0.4))
  const layerE = (i: number) => applyEasing(layerT(i), 'easeOutQuart')

  // 漏斗 path：3 层梯形（顶部小，下部大）
  const W = 320
  const H = 360
  // 4 个 y 锚点 + 4 个 x 半宽
  const yTop = 30
  const yMid = 160
  const yBot = 330
  const wTop = 40
  const wMid1 = 100
  const wMid2 = 130
  const wBot = 220

  const p1 = `${W / 2 - wTop},${yTop} ${W / 2 + wTop},${yTop} ${W / 2 + wMid1},${yMid} ${W / 2 - wMid1},${yMid}`
  const p2 = `${W / 2 - wMid1},${yMid} ${W / 2 + wMid1},${yMid} ${W / 2 + wMid2},${yMid + 40} ${W / 2 - wMid2},${yMid + 40}`
  const p3 = `${W / 2 - wMid2},${yMid + 40} ${W / 2 + wMid2},${yMid + 40} ${W / 2 + wBot},${yBot} ${W / 2 - wBot},${yBot}`

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
        gap: 16,
        padding: '0 60px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 顶部 eyebrow */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: '#fff',
          textAlign: 'center',
          opacity: headE,
          transform: `translateY(${(1 - headE) * -10}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {eyebrow}
        <span style={{ color: accent, textShadow: `0 0 12px ${accentAlpha(0.4)}` }}>{eyebrowOrange}</span>
      </div>
      {/* 3 个 chips */}
      <div style={{ display: 'flex', gap: 12 }}>
        {chips.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              border: `1.5px solid ${chipColors[i]}`,
              background: `${chipColors[i]}18`,
              fontSize: 14,
              fontWeight: 800,
              color: chipColors[i],
              boxShadow: `0 0 12px ${chipColors[i]}77`,
              opacity: chipE(i),
              transform: `translateY(${(1 - chipE(i)) * 12}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            <span style={{ fontSize: 12 }}>{['💰', '🎓', '🎤'][i] ?? '●'}</span>
            {c}
          </div>
        ))}
      </div>
      {/* 漏斗 */}
      <div style={{ position: 'relative', width: W, height: H }}>
        {[
          { d: p1, y: yTop, c: layerColors[0], label: layers.split(/[,，]/)[0] ?? '顶部', idx: 0 },
          { d: p2, y: yMid, c: layerColors[1], label: layers.split(/[,，]/)[1] ?? '中段', idx: 1 },
          { d: p3, y: yBot, c: layerColors[2], label: layers.split(/[,，]/)[2] ?? '沉底', idx: 2 },
        ].map((l) => (
          <div key={l.idx}>
            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                opacity: layerE(l.idx),
                transform: `translateY(${(1 - layerE(l.idx)) * 18}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
                filter: `drop-shadow(0 0 16px ${l.c}77)`,
              }}
            >
              <polygon points={l.d} fill={l.c} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: l.y + (l.idx === 0 ? 18 : 12),
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 800,
                color: '#fff',
                opacity: layerE(l.idx),
                transition: 'opacity 0.1s linear',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {l.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}