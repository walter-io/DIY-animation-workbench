import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E49 ·  · 虚线角括号 stat 三卡
 * 视觉：3 张 stat 卡（2+1 排布）每张只有 4 个角的 L 形虚线边框（无完整描边）+ 图标 + 标题 + 副标 + 巨号数值 + 单位。
 * 来源：谁家后院真有油田? — 某某文化 / 某某动漫 / 某文在线
 * 颜色：原视频橙/紫/青 → --stage-special / --stage-primary / --stage-data。
 */
export default function ReplicaBracketStats({ params, progress }: EffectProps) {
  const titleWhite = String(params.titleWhite ?? '谁家后院真有油田?')
  const titleOrange = String(params.titleOrange ?? '还是这些机构')
  const items = String(
    params.items ??
      '👥|某某文化|员工一年扩充到千人规模|月营收超 5000万|5,000|万/月|var(--stage-special),🏢|某某动漫|从 30 人扩到 800 人|—|800|人|var(--stage-primary),📈|某文在线|目标年化产能|—|1,038|部/年|var(--stage-data)'
  )
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const p = seg.split('|').map((x) => x.trim())
      return { icon: p[0] ?? '◧', title: p[1] ?? '', line1: p[2] ?? '', line2: p[3] ?? '', value: p[4] ?? '', unit: p[5] ?? '', color: p[6] ?? ACCENT }
    })
  const caption = String(params.caption ?? '机构已匿名处理 · 数据为公开报道口径')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.3))
  const headE = applyEasing(headT, 'easeOutQuart')
  const itemT = (i: number) => Math.max(0, Math.min(1, (progress - 0.2 - i * 0.1) / 0.4))
  const itemE = (i: number) => applyEasing(itemT(i), 'easeOutQuart')

  const Bracket = ({ color, opacity }: { color: string; opacity: number }) => (
    <>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 18, height: 18, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderTopLeftRadius: 4, opacity }} />
      <div style={{ position: 'absolute', right: 0, top: 0, width: 18, height: 18, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderTopRightRadius: 4, opacity }} />
      <div style={{ position: 'absolute', left: 0, bottom: 0, width: 18, height: 18, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, borderBottomLeftRadius: 4, opacity }} />
      <div style={{ position: 'absolute', right: 0, bottom: 0, width: 18, height: 18, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, borderBottomRightRadius: 4, opacity }} />
    </>
  )

  const Card = ({ it, idx }: { it: typeof items[number]; idx: number }) => (
    <div
      style={{
        position: 'relative',
        width: 320,
        height: 156,
        padding: '20px 24px 18px',
        opacity: itemE(idx),
        transform: `translateY(${(1 - itemE(idx)) * 18}px) scale(${0.95 + itemE(idx) * 0.05})`,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      <Bracket color={it.color} opacity={0.85} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 10,
            background: `${it.color}22`,
            border: `1px solid ${it.color}66`,
            color: it.color,
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 0 12px ${it.color}55`,
          }}
        >
          {it.icon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{it.title}</span>
          {it.line1 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.line1}</span>}
          {it.line2 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{it.line2}</span>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: it.color, lineHeight: 1, textShadow: `0 0 14px ${it.color}77` }}>{it.value}</div>
          <div style={{ fontSize: 12, color: it.color, marginTop: 4 }}>{it.unit}</div>
        </div>
      </div>
    </div>
  )

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
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          opacity: headE,
          transform: `translateY(${(1 - headE) * -14}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        {titleWhite}
        <span style={{ color: accent, textShadow: `0 0 14px ${accentAlpha(0.4)}` }}>{titleOrange}</span>
      </div>
      {/* 上排 2 张 + 下排 1 张 */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        {items.slice(0, 2).map((it, i) => (
          <Card key={i} it={it} idx={i} />
        ))}
      </div>
      {items.length > 2 && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {items.slice(2).map((it, i) => (
            <Card key={i + 2} it={it} idx={i + 2} />
          ))}
        </div>
      )}
      {caption && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            padding: '4px 12px',
            border: '1px solid rgba(255,255,255,0.12)',
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