import type { EffectProps } from '../../../types'
import { atomStyle, popStyle, seg } from '../explainKit'

/** 解说元素·步骤芯片：小标签 STEP 01 + 步骤名，横向排一排就是流程。 */
export default function AtomStepChip({ params, progress }: EffectProps) {
  const step = String(params.step ?? 'STEP 01')
  const text = String(params.text ?? '提问')
  const size = Number(params.size ?? 30)
  const bg = String(params.bg ?? '#ffffff')
  const color = String(params.color ?? '#1d1e22')
  const stepColor = String(params.stepColor ?? '#f2a63a')
  const shadow = params.shadow !== false
  const t = seg(progress, 0, 0.15)

  return (
    <div style={atomStyle(1)}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: Math.round(size * 0.35),
          background: bg,
          borderRadius: Math.round(size * 0.7),
          padding: `${Math.round(size * 0.7)}px ${Math.round(size)}px`,
          boxShadow: shadow ? '0 8px 22px rgba(24, 26, 32, 0.10)' : 'none',
          border: '1px solid rgba(24, 26, 32, 0.05)',
          ...popStyle(t, 0.84),
        }}
      >
        <span style={{ fontSize: Math.round(size * 0.7), fontWeight: 700, color: stepColor, letterSpacing: 1 }}>
          {step}
        </span>
        <span style={{ fontSize: size, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{text}</span>
      </div>
    </div>
  )
}
