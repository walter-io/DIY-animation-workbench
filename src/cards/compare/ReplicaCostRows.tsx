import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E46 ·  · 多行 VS 成本对比 + 天平图标
 * 视觉：顶部 "$" 标题 → 多行（每行：小紫 pill 模型名 + 红官方卡 / VS / 绿渠道卡）+ 右侧天平图。
 * 来源：我们拿到的模型，便宜得多 — 字节 Seedance 2.5 / MiniMax H3
 * 颜色：原视频红/绿/紫 → --stage-assist / --stage-data / --stage-primary。
 */
export default function ReplicaCostRows({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '$ 我们拿到的模型，')
  const eyebrowOrange = String(params.eyebrowOrange ?? '便宜得多')
  const rows = String(
    params.rows ??
      '字节的 Seedance 2.5 · 30 秒一条|官方 API|每条 30 秒|40-50|块|第三方渠道|同款同质|7|块,MiniMax H3 · 768P 每秒|官方|768P 一秒|0.5|元|渠道最低|我一手见过 0.051|0.09|元'
  )
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const p = seg.split('|').map((x) => x.trim())
      return {
        title: p[0] ?? '',
        redLabel: p[1] ?? '',
        redSub: p[2] ?? '',
        redVal: p[3] ?? '',
        redUnit: p[4] ?? '',
        greenLabel: p[5] ?? '',
        greenSub: p[6] ?? '',
        greenVal: p[7] ?? '',
        greenUnit: p[8] ?? '',
      }
    })
  const caption = String(params.caption ?? '同一个模型')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.35))
  const headE = applyEasing(headT, 'easeOutQuart')
  const rowT = (i: number) => Math.max(0, Math.min(1, (progress - 0.2 - i * 0.12) / 0.4))
  const rowE = (i: number) => applyEasing(rowT(i), 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '0 32px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: headE, transition: 'opacity 0.1s linear' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: accent, color: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900 }}>$</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#fff' }}>
          {eyebrow}
          <span style={{ color: accent, textShadow: `0 0 14px ${accentAlpha(0.4)}` }}>{eyebrowOrange}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                opacity: rowE(i),
                transform: `translateX(${(-1 + rowE(i)) * 24}px)`,
                transition: 'transform 0.1s linear, opacity 0.1s linear',
              }}
            >
              <div
                style={{
                  alignSelf: 'flex-start',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: 'var(--stage-primary)',
                  border: '1px solid var(--stage-primary)',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(139,157,255,0.08)',
                }}
              >
                {r.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 180,
                    padding: '10px 14px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--stage-assist)',
                    background: 'rgba(255,122,176,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--stage-assist)' }}>{r.redLabel}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{r.redSub}</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--stage-assist)' }}>{r.redVal} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{r.redUnit}</span></span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 900, color: accent }}>vs</span>
                <div
                  style={{
                    width: 180,
                    padding: '10px 14px 12px',
                    borderRadius: 8,
                    border: '1.5px solid var(--stage-data)',
                    background: 'rgba(90,200,250,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--stage-data)' }}>{r.greenLabel}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{r.greenSub}</span>
                  <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--stage-data)' }}>{r.greenVal} <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{r.greenUnit}</span></span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* 右侧天平 */}
        <svg width="170" height="220" viewBox="0 0 170 220" style={{ opacity: applyEasing(Math.min(1, (progress - 0.4) / 0.35), 'easeOutQuart') }}>
          {/* 立柱 */}
          <line x1="85" y1="20" x2="85" y2="200" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          {/* 底座 */}
          <line x1="55" y1="200" x2="115" y2="200" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          {/* 横梁 */}
          <line x1="30" y1="30" x2="140" y2="30" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          {/* 左盘（沉下） */}
          <line x1="30" y1="30" x2="20" y2="90" stroke={accent} strokeWidth="2.5" />
          <path d="M 5 90 L 35 90 L 30 100 L 10 100 Z" fill={accent} opacity="0.9" />
          <text x="20" y="78" textAnchor="middle" fill={accent} fontSize="13" fontWeight="800">贵</text>
          {/* 右盘（高） */}
          <line x1="140" y1="30" x2="150" y2="65" stroke={accent} strokeWidth="2.5" />
          <path d="M 135 65 L 165 65 L 160 75 L 140 75 Z" fill={accent} opacity="0.9" />
          <text x="150" y="55" textAnchor="middle" fill={accent} fontSize="13" fontWeight="800">便宜</text>
        </svg>
      </div>
      {caption && (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', opacity: applyEasing(Math.min(1, (progress - 0.55) / 0.3), 'easeOutQuart') }}>
          —— {caption}
        </div>
      )}
    </div>
  )
}