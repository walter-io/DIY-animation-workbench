import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E36 ·  · A→B 问句对比
 * 视觉：两个描边小面板 —— 左灰右橙，中间橙色箭头；面板内 eyebrow 小字 + 大字问句/数值。
 * 来源：QUESTION A 变慢了? → QUESTION B 可接受成本? · FIRST RUN 04:00 → SECOND RUN ?
 */
export default function ReplicaAbQuestion({ params, progress }: EffectProps) {
  const labelA = String(params.labelA ?? 'QUESTION A')
  const textA = String(params.textA ?? '变慢了?')
  const labelB = String(params.labelB ?? 'QUESTION B')
  const textB = String(params.textB ?? '可接受成本?')
  const accent = ACCENT

  const aT = Math.max(0, Math.min(1, progress / 0.4))
  const aE = applyEasing(aT, 'easeOutQuart')
  const arrT = Math.max(0, Math.min(1, (progress - 0.2) / 0.3))
  const arrE = applyEasing(arrT, 'easeOutQuart')
  const bT = Math.max(0, Math.min(1, (progress - 0.3) / 0.4))
  const bE = applyEasing(bT, 'easeOutBack')

  const chip = (
    _label: string,
    _text: string,
    active: boolean,
    e2: number,
    fromX: number
  ): React.CSSProperties => ({
    minWidth: 200,
    padding: '12px 20px 14px',
    borderRadius: 8,
    border: `1px solid ${active ? accent : 'rgba(255,255,255,0.3)'}`,
    background: 'rgba(10,10,12,0.82)',
    boxShadow: active ? `0 0 20px ${accentAlpha(0.22)}` : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    opacity: e2,
    transform: `translateX(${fromX}px)`,
    transition: 'transform 0.1s linear, opacity 0.1s linear',
  })

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={chip(labelA, textA, false, aE, (1 - aE) * -24)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>{labelA}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{textA}</div>
      </div>

      {/* 箭头 */}
      <svg width="52" height="24" viewBox="0 0 52 24" style={{ opacity: arrE, transform: `translateX(${(1 - arrE) * -12}px)`, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
        <line x1="2" y1="12" x2="40" y2="12" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <polygon points="38,5 50,12 38,19" fill={accent} />
      </svg>

      <div style={chip(labelB, textB, true, bE, (1 - bE) * 24)}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: accent }}>{labelB}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: accent, textShadow: `0 0 14px ${accentAlpha(0.4)}` }}>{textB}</div>
      </div>
    </div>
  )
}