import type { CSSProperties } from 'react'
import { applyEasing } from '../easing'
import type { EasingId, SlotId } from '../types'

type AnimProps = {
  progress: number
  delay?: number
  ease?: EasingId
  rise?: number
}

function useReveal(p: AnimProps) {
  const t = Math.max(0, Math.min(1, (p.progress - (p.delay ?? 0)) / (1 - (p.delay ?? 0) || 1)))
  const eased = applyEasing(t, p.ease ?? 'easeOut')
  const rise = p.rise ?? 16
  return { opacity: eased, transform: `translateY(${(1 - eased) * rise}px)` }
}

/** 卡槽缩放锚点：按落位方向确定 transform-origin，保证缩放不跑位 */
export function slotOrigin(slot: SlotId): string {
  switch (slot) {
    case 'right':
      return 'right top'
    case 'center':
      return 'center top'
    case 'bottom':
      return 'center bottom'
    default:
      return 'left top'
  }
}

/** 子组件：标题（大字） */
export function Headline({
  text,
  size = 48,
  weight = 600,
  progress,
  delay,
  ease,
  rise,
  align = 'left',
}: AnimProps & { text: string; size?: number; weight?: number; align?: 'left' | 'center' | 'right' }) {
  const anim = useReveal({ progress, delay, ease, rise })
  const style: CSSProperties = {
    fontSize: size,
    fontWeight: weight,
    lineHeight: 1.18,
    letterSpacing: '-0.02em',
    color: 'var(--stage-accent)',
    textAlign: align,
    opacity: anim.opacity,
    transform: anim.transform,
    transition: 'transform 0.1s linear, opacity 0.1s linear',
    margin: 0,
  }
  return <div style={style}>{text}</div>
}

/** 子组件：副标题/小字 */
export function Subtext({
  text,
  size = 16,
  progress,
  delay,
  ease,
  rise,
  uppercase,
  color,
  align = 'left',
}: AnimProps & { text: string; size?: number; uppercase?: boolean; color?: string; align?: 'left' | 'center' | 'right' }) {
  const anim = useReveal({ progress, delay, ease, rise })
  const style: CSSProperties = {
    fontSize: size,
    fontWeight: 500,
    letterSpacing: uppercase ? '0.08em' : '0',
    textTransform: uppercase ? 'uppercase' : 'none',
    color: color ?? 'var(--stage-text-muted)',
    textAlign: align,
    opacity: anim.opacity,
    transform: anim.transform,
    transition: 'transform 0.1s linear, opacity 0.1s linear',
  }
  return <div style={style}>{text}</div>
}

/** 子组件：数字滚动（颜色优先用强调强色 --stage-accent-strong，未设置时回退主题文字色） */
export function CountUp({
  value,
  progress,
  size = 96,
  weight = 700,
  suffix,
  delay,
  ease = 'easeOutQuart',
}: AnimProps & { value: number; size?: number; weight?: number; suffix?: string }) {
  const anim = useReveal({ progress, delay, ease, rise: 24 })
  const eased = applyEasing(Math.max(0, Math.min(1, (progress - (delay ?? 0)) / (1 - (delay ?? 0) || 1))), ease)
  const shown = Math.round(eased * value)
  const style: CSSProperties = {
    fontSize: size,
    fontWeight: weight,
    lineHeight: 1,
    letterSpacing: '-0.04em',
    color: 'var(--stage-accent-strong, var(--stage-accent))',
    fontVariantNumeric: 'tabular-nums',
    opacity: anim.opacity,
    transform: anim.transform,
    transition: 'transform 0.1s linear, opacity 0.1s linear',
  }
  return (
    <div style={style}>
      {shown.toLocaleString('en-US')}
      {suffix ? <span style={{ fontSize: size * 0.58, fontWeight: 500, opacity: 0.8, marginLeft: 4 }}>{suffix}</span> : null}
    </div>
  )
}

/** 子组件：单条对比条（颜色优先用强调强色，未设置时回退主题强调色） */
export function Bar({
  ratio,
  progress,
  color = 'var(--stage-accent-strong, var(--stage-accent))',
  delay = 0,
  ease = 'easeOut',
}: AnimProps & { ratio: number; color?: string }) {
  const anim = useReveal({ progress, delay, ease, rise: 16 })
  return (
    <div
      style={{
        height: '100%',
        width: `${Math.max(0, Math.min(1, ratio)) * 100}%`,
        background: color,
        borderRadius: 6,
        transform: `scaleX(${anim.opacity})`,
        transformOrigin: 'left',
        transition: 'transform 0.1s linear',
      }}
    />
  )
}

/** 子组件：分隔线 */
export function Divider({ progress, align = 'left', width = 64 }: AnimProps & { align?: 'left' | 'center' | 'right'; width?: number }) {
  const anim = useReveal({ progress })
  return (
    <div
      style={{
        width,
        height: 2,
        background: 'var(--stage-accent)',
        marginTop: 12,
        opacity: anim.opacity,
        transform: `scaleX(${anim.opacity})`,
        transformOrigin: align,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    />
  )
}

/** 子组件：角标胶囊 */
export function Tag({ text, progress, delay }: AnimProps & { text: string }) {
  const anim = useReveal({ progress, delay, rise: 12 })
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--stage-text-muted)',
        padding: '4px 10px',
        border: '1px solid var(--stage-border)',
        borderRadius: 4,
        display: 'inline-block',
        opacity: anim.opacity,
        transform: anim.transform,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      {text}
    </div>
  )
}

/** 子组件：环形进度（SVG，progress 驱动描边） */
export function Ring({
  ratio,
  progress,
  delay = 0.1,
  size = 180,
  stroke = 14,
  color = 'var(--stage-data)',
  label,
  sublabel,
}: AnimProps & { ratio: number; size?: number; stroke?: number; color?: string; label?: string; sublabel?: string }) {
  const t = Math.max(0, Math.min(1, (progress - delay) / (1 - delay || 1)))
  const eased = applyEasing(t, 'easeOutQuart')
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const shown = Math.max(0, Math.min(1, ratio)) * eased
  const reveal = useReveal({ progress, delay, rise: 10 })
  return (
    <div style={{ position: 'relative', width: size, height: size, opacity: reveal.opacity, transform: reveal.transform, transition: 'transform 0.1s linear, opacity 0.1s linear' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--stage-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {label && <div style={{ fontSize: size * 0.24, fontWeight: 700, letterSpacing: '-0.03em', color, fontVariantNumeric: 'tabular-nums' }}>{label}</div>}
        {sublabel && <div style={{ fontSize: 13, color: 'var(--stage-text-muted)' }}>{sublabel}</div>}
      </div>
    </div>
  )
}

/** 子组件：带轨道的单条进度 */
export function ProgressTrack({
  ratio,
  progress,
  delay = 0.1,
  height = 12,
  color = 'var(--stage-data)',
}: AnimProps & { ratio: number; height?: number; color?: string }) {
  const t = Math.max(0, Math.min(1, (progress - delay) / (1 - delay || 1)))
  const eased = applyEasing(t, 'easeOutQuart')
  return (
    <div style={{ width: '100%', height, background: 'var(--stage-border)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.max(0, Math.min(1, ratio)) * eased * 100}%`,
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.1s linear',
        }}
      />
    </div>
  )
}

/** 子组件：趋势箭头（确定性方向，无随机） */
export function TrendArrow({ up = true, size = 30, color }: { up?: boolean; size?: number; color?: string }) {
  const c = color ?? (up ? 'var(--stage-data)' : 'var(--stage-assist)')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d={up ? 'M12 5l7 8h-4v6h-6v-6H5l7-8z' : 'M12 19l-7-8h4V5h6v6h4l-7 8z'}
        fill={c}
      />
    </svg>
  )
}

/** 子组件：统计行（标签 + 数值，逐条入场） */
export function StatRow({
  label,
  value,
  index,
  progress,
  color = 'var(--stage-data)',
}: AnimProps & { label: string; value: string; index: number; color?: string }) {
  const delay = 0.08 + index * 0.12
  const anim = useReveal({ progress, delay, rise: 10 })
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 24,
        opacity: anim.opacity,
        transform: anim.transform,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      <span style={{ fontSize: 17, color: 'var(--stage-text-muted)' }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

/** 子组件：步骤编号圆圈 */
export function StepNum({ n, progress, delay, active = false }: AnimProps & { n: number; active?: boolean }) {
  const anim = useReveal({ progress, delay, rise: 8 })
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `2px solid ${active ? 'var(--stage-primary)' : 'var(--stage-border)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        fontWeight: 700,
        color: active ? 'var(--stage-primary)' : 'var(--stage-text-muted)',
        opacity: anim.opacity,
        transform: anim.transform,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  )
}

/** 子组件：圆点列表项 */
export function BulletItem({
  text,
  index,
  progress,
  center = false,
  compact = false,
}: AnimProps & { text: string; index: number; center?: boolean; compact?: boolean }) {
  const delay = 0.06 + index * 0.1
  const anim = useReveal({ progress, delay, rise: 8 })
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: compact ? 12 : 18,
        width: '100%',
        flex: compact ? '0 0 auto' : 1,
        minHeight: compact ? 0 : 72,
        padding: compact ? '12px 16px' : '18px 24px',
        border: '1px solid var(--stage-border)',
        borderRadius: 14,
        background: 'var(--stage-surface-strong)',
        boxSizing: 'border-box',
        opacity: anim.opacity,
        transform: anim.transform,
        transition: 'transform 0.1s linear, opacity 0.1s linear',
      }}
    >
      <span style={{ width: compact ? 10 : 12, height: compact ? 10 : 12, borderRadius: '50%', background: 'var(--stage-primary)', flexShrink: 0 }} />
      <span
        style={{
          fontSize: compact ? 20 : 32,
          lineHeight: 1.3,
          color: 'var(--stage-text)',
          textAlign: center ? 'center' : 'left',
          flex: center ? '0 1 auto' : compact ? 1 : 1,
        }}
      >
        {text}
      </span>
    </div>
  )
}
