import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E52 ·  · 二选一对比 + 内部插画
 * 视觉：标题 + 4 个能力 chip + 2 张大卡（左红"自己扛风险创业"+ 杠杆配重小图 / 右绿"去公司"+ 上涨折线图），
 *      中间 "VS" 圆徽，下方底部字幕。
 * 来源：如果你真的能力强——那你听我的 — 自己扛风险创业 vs 去任何一家公司
 * 颜色：原视频左红 / 右绿 / chip 多色 → --stage-assist / --stage-data / 多色 chips。
 */
export default function Replica2cardsVsGraphic({ params, progress }: EffectProps) {
  const titleWhite = String(params.titleWhite ?? '如果你')
  const titleGreen = String(params.titleGreen ?? '真的能力强')
  const titleMid = String(params.titleMid ?? '——那你听我的')
  const chips = String(params.chips ?? '✏ 真懂内容,📈 跑得动数据,🔧 东西能打,🪄 还懂 AIGC')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const leftTitle = String(params.leftTitle ?? '自己扛风险创业')
  const leftSub = String(params.leftSub ?? '全部风险自己扛')
  const rightTitle = String(params.rightTitle ?? '去任何一家公司')
  const rightSub = String(params.rightSub ?? '轻松拿到相当高薪的工作')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')
  const chipT = (i: number) => Math.max(0, Math.min(1, (progress - 0.15 - i * 0.06) / 0.35))
  const chipE = (i: number) => applyEasing(chipT(i), 'easeOutQuart')
  const cardT = Math.max(0, Math.min(1, (progress - 0.25) / 0.4))
  const cardE = applyEasing(cardT, 'easeOutQuart')
  const vsT = Math.max(0, Math.min(1, (progress - 0.4) / 0.3))
  const vsE = applyEasing(vsT, 'easeOutBack')
  const chipColors = ['var(--stage-primary)', 'var(--stage-data)', '#b88aff', 'var(--stage-special)']

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
        padding: '0 50px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 标题 */}
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: '#fff',
          opacity: headE,
          transform: `translateY(${(1 - headE) * -12}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {titleWhite}
        <span style={{ color: 'var(--stage-data)', textShadow: '0 0 12px var(--stage-data)' }}>{titleGreen}</span>
        {titleMid}
      </div>
      {/* 4 个能力 chip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {chips.map((c, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 8,
              border: `1.5px solid ${chipColors[i]}`,
              background: `${chipColors[i]}18`,
              fontSize: 13,
              fontWeight: 800,
              color: chipColors[i],
              boxShadow: `0 0 10px ${chipColors[i]}77`,
              opacity: chipE(i),
              transform: `translateY(${(1 - chipE(i)) * 10}px)`,
              transition: 'transform 0.1s linear, opacity 0.1s linear',
            }}
          >
            {c}
          </div>
        ))}
      </div>
      {/* 对比卡组 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        {/* 左卡（红） */}
        <div
          style={{
            width: 360,
            height: 180,
            borderRadius: 12,
            border: '1.5px solid var(--stage-assist)',
            background: 'rgba(255,122,176,0.08)',
            boxShadow: '0 0 20px rgba(255,122,176,0.22)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: cardE,
            transform: `translateX(${(-1 + cardE) * 26}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--stage-assist)' }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            {leftTitle}
          </div>
          {/* 杠杆图 */}
          <svg width={320} height={70} viewBox="0 0 320 70" style={{ flex: 1 }}>
            <polygon points="20,55 30,55 200,28 195,32" fill="rgba(255,122,176,0.7)" />
            <polygon points="200,28 210,28 175,40 165,40" fill="rgba(255,122,176,0.85)" />
            <circle cx="110" cy="30" r="4" fill="var(--stage-assist)" />
            <line x1="105" y1="40" x2="115" y2="22" stroke="var(--stage-assist)" strokeWidth="1.5" />
            <polygon points="112,18 118,18 115,12" fill="var(--stage-assist)" />
            <rect x="60" y="55" width="40" height="8" fill="var(--stage-assist)" opacity="0.6" />
            <rect x="220" y="55" width="60" height="8" fill="var(--stage-assist)" opacity="0.4" />
          </svg>
          <div
            style={{
              alignSelf: 'flex-start',
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--stage-assist)',
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--stage-assist)',
            }}
          >
            {leftSub}
          </div>
        </div>

        {/* VS */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${accent}, #ff8a4d)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#141414',
            fontSize: 18,
            fontWeight: 900,
            boxShadow: `0 0 22px ${accentAlpha(0.5)}`,
            opacity: vsE,
            transform: `scale(${0.5 + vsE * 0.5})`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            flexShrink: 0,
          }}
        >
          vs
        </div>

        {/* 右卡（绿） */}
        <div
          style={{
            width: 360,
            height: 180,
            borderRadius: 12,
            border: '1.5px solid var(--stage-data)',
            background: 'rgba(90,200,250,0.08)',
            boxShadow: '0 0 20px rgba(90,200,250,0.22)',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            opacity: cardE,
            transform: `translateX(${(1 - cardE) * 26}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800, color: 'var(--stage-data)' }}>
            <span style={{ fontSize: 18 }}>🏢</span>
            {rightTitle}
          </div>
          {/* 上涨折线 */}
          <svg width={320} height={70} viewBox="0 0 320 70" style={{ flex: 1 }}>
            <line x1="20" y1="60" x2="300" y2="60" stroke="rgba(90,200,250,0.4)" strokeWidth="1" />
            <line x1="20" y1="20" x2="300" y2="20" stroke="rgba(90,200,250,0.4)" strokeWidth="1" strokeDasharray="3 3" />
            <polyline
              points="20,55 60,50 100,45 140,40 180,30 220,25 260,18 290,12"
              fill="none"
              stroke="var(--stage-data)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 6px var(--stage-data))' }}
            />
            <circle cx="290" cy="12" r="5" fill="var(--stage-data)" />
            <rect x="30" y="32" width="60" height="20" fill="rgba(90,200,250,0.18)" stroke="var(--stage-data)" strokeWidth="1" rx="2" />
            <line x1="35" y1="38" x2="85" y2="38" stroke="var(--stage-data)" strokeWidth="1.5" />
            <line x1="35" y1="44" x2="80" y2="44" stroke="var(--stage-data)" strokeWidth="1.5" />
          </svg>
          <div
            style={{
              alignSelf: 'flex-start',
              fontSize: 12,
              fontWeight: 800,
              color: 'var(--stage-data)',
              padding: '4px 10px',
              borderRadius: 4,
              border: '1px solid var(--stage-data)',
            }}
          >
            {rightSub}
          </div>
        </div>
      </div>
    </div>
  )
}