import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E41 ·  · 时间成本双面板账单
 * 视觉：标题行 + 左 TIME 面板（05:00 巨字 + 堆叠比例条 + 4 个 mini chips + 括号注记）+
 *      右 COST 面板（¥0 巨字 + 21% 圆环 + 免费重置行）。
 * 来源：FIRST PRODUCTION / TIME & COST LEDGER — 上一期，真实的时间与成本
 * 颜色映射：原视频橙 → --stage-special（金）。
 */
export default function ReplicaTimeCost({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'FIRST PRODUCTION / TIME & COST LEDGER')
  const titleWhite = String(params.titleWhite ?? '上一期，真实的')
  const titleOrange = String(params.titleOrange ?? '时间与成本')
  const rightEyebrow = String(params.rightEyebrow ?? 'REAL INPUT / NO ESTIMATE')
  const bigTime = String(params.bigTime ?? '05:00')
  const bigTimeLabel = String(params.bigTimeLabel ?? 'TOTAL TIME / 含文案总计')
  const prodLabel = String(params.prodLabel ?? 'VIDEO PRODUCTION / 除开文案 04:00')
  const segments = String(params.segments ?? '1小时|20,30分|10,30分|10,3小时|60')
  const chips = String(params.chips ?? '文案|01:00,拍摄|00:30,剪辑停顿口误|00:30,Codex 动画|03:00')
  const bracketNote = String(params.bracketNote ?? '视频制作 04:00（不含文案）')
  const costValue = String(params.costValue ?? '¥0')
  const costLabel = String(params.costLabel ?? '新增付费')
  const ringPct = Number(params.ringPct ?? 21)
  const ringLabel = String(params.ringLabel ?? '周额度 已消耗')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.35))
  const headE = applyEasing(headT, 'easeOutQuart')
  const leftT = Math.max(0, Math.min(1, (progress - 0.12) / 0.4))
  const leftE = applyEasing(leftT, 'easeOutQuart')
  const rightT = Math.max(0, Math.min(1, (progress - 0.3) / 0.4))
  const rightE = applyEasing(rightT, 'easeOutQuart')

  const segs = segments
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const [label, w] = seg.split('|').map((x) => x.trim())
      return { label, w: Number(w) || 20 }
    })
  const chipList = chips
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const [label, val] = seg.split('|').map((x) => x.trim())
      return { label, val }
    })
  const segTotal = segs.reduce((a, s) => a + s.w, 0) || 100

  const panel = (_children: React.ReactNode, e: number): React.CSSProperties => ({
    flex: 1,
    borderRadius: 10,
    border: `1.5px solid ${accentAlpha(0.6)}`,
    background: 'rgba(9,9,11,0.9)',
    boxShadow: `0 0 24px ${accentAlpha(0.13)}`,
    padding: '16px 20px 18px',
    opacity: e,
    transform: `translateY(${(1 - e) * 22}px)`,
    transition: 'transform 0.1s linear, opacity 0.1s linear',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    position: 'relative',
  })

  const ringR = 34
  const ringC = 2 * Math.PI * ringR

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 56px',
        gap: 16,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, opacity: headE, transition: 'opacity 0.1s linear' }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.22em', color: accent }}>{eyebrow}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fff' }}>
            {titleWhite} <span style={{ color: accent, textShadow: `0 0 16px ${accentAlpha(0.4)}` }}>{titleOrange}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>{rightEyebrow}</div>
        </div>
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.1)})`,
            transform: `scaleX(${headE})`,
            transformOrigin: 'left center',
          }}
        />
      </div>

      {/* 双面板 */}
      <div style={{ display: 'flex', gap: 22 }}>
        {/* TIME 面板 */}
        <div style={panel(null, leftE)}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: accent }}>
            TIME / <span style={{ color: 'rgba(255,255,255,0.5)' }}>实笔投入</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            <span style={{ fontSize: 58, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{bigTime}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{bigTimeLabel}</span>
            <span style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: accent }}>{prodLabel}</span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)' }}>
            FIVE-HOUR BREAKDOWN / ACTUAL RATIO
          </div>
          {/* 堆叠比例条 */}
          <div style={{ display: 'flex', height: 46, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.14)' }}>
            {segs.map((s, i) => {
              const st = Math.max(0, Math.min(1, (progress - 0.2 - i * 0.06) / 0.3))
              const active = i === segs.length - 1
              return (
                <div
                  key={i}
                  style={{
                    width: `${(s.w / segTotal) * 100}%`,
                    background: active ? accent : 'rgba(255,255,255,0.12)',
                    borderRight: i < segs.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: active ? 18 : 13,
                    fontWeight: 800,
                    color: active ? '#141414' : 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transform: `scaleX(${applyEasing(st, 'easeOutQuart')})`,
                    transformOrigin: 'left center',
                  }}
                >
                  {s.label}
                </div>
              )
            })}
          </div>
          {/* mini chips */}
          <div style={{ display: 'flex', gap: 10 }}>
            {chipList.map((c, i) => {
              const active = i === chipList.length - 1
              const ct = Math.max(0, Math.min(1, (progress - 0.32 - i * 0.05) / 0.3))
              const ce = applyEasing(ct, 'easeOutQuart')
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 6,
                    border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.18)'}`,
                    opacity: ce,
                    transform: `translateY(${(1 - ce) * 12}px)`,
                  }}
                >
                  <span style={{ width: 3, height: 22, background: active ? accent : 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: active ? accent : '#fff', whiteSpace: 'nowrap' }}>{c.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{c.val}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* 括号注记 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '72%', height: 8, borderLeft: `1.5px solid ${accentAlpha(0.6)}`, borderRight: `1.5px solid ${accentAlpha(0.6)}`, borderBottom: `1.5px solid ${accentAlpha(0.6)}`, borderRadius: '0 0 6px 6px' }} />
            <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{bracketNote}</div>
          </div>
          <span style={{ position: 'absolute', right: 14, top: 14, width: 7, height: 7, borderRadius: '50%', background: accent }} />
        </div>

        {/* COST 面板 */}
        <div style={{ ...panel(null, rightE), flex: 0.62 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: accent }}>
            COST / <span style={{ color: 'rgba(255,255,255,0.5)' }}>真实花销</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: accent, textShadow: `0 0 20px ${accentAlpha(0.4)}` }}>{costValue}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{costLabel}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 'auto' }}>
            <svg width={ringR * 2 + 14} height={ringR * 2 + 14} viewBox={`0 0 ${ringR * 2 + 14} ${ringR * 2 + 14}`}>
              <circle cx={ringR + 7} cy={ringR + 7} r={ringR} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
              <circle
                cx={ringR + 7}
                cy={ringR + 7}
                r={ringR}
                fill="none"
                stroke={accent}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={ringC}
                strokeDashoffset={ringC * (1 - (ringPct / 100) * applyEasing(Math.max(0, Math.min(1, (progress - 0.45) / 0.4)), 'easeOutQuart'))}
                transform={`rotate(-90 ${ringR + 7} ${ringR + 7})`}
                style={{ filter: `drop-shadow(0 0 6px ${accentAlpha(0.5)})` }}
              />
              <text x="50%" y="54%" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="900">
                {ringPct}%
              </text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{ringLabel}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}>WEEKLY LIMIT USED</span>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed rgba(255,255,255,0.16)', paddingTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>⟳ 免费重置</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>x1</span>
          </div>
          <span style={{ position: 'absolute', right: 14, top: 14, width: 7, height: 7, borderRadius: '50%', background: accent }} />
        </div>
      </div>
    </div>
  )
}