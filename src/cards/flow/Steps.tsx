import type { EffectProps } from '../../types'
import { Subtext, StepNum } from '../../components/primitives'

/** 步骤流程卡：1-2-3 竖排步骤 */
export function StepsCard({ params, progress }: EffectProps) {
  const title = String(params.title ?? '三步上手')
  const steps = String(params.steps ?? '第一步,导入素材\n第二步,选择模板\n第三步,导出成品').split('\n').filter(Boolean)
  return (
    <div className="os-card" style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <Subtext text={title} size={15} uppercase progress={progress} delay={0.02} />
      {steps.map((s, i) => {
        const d = 0.1 + i * 0.15
        const t = Math.max(0, Math.min(1, (progress - d) / (1 - d || 1)))
        const [num, text] = s.split(',')
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: t, transform: `translateX(${(1 - t) * -14}px)`, transition: 'opacity 0.1s linear, transform 0.1s linear' }}>
            <StepNum n={Number(num) || i + 1} progress={progress} delay={d} active={t > 0.6} />
            <span style={{ fontSize: 19, color: 'var(--stage-text)' }}>{text ?? ''}</span>
          </div>
        )
      })}
    </div>
  )
}
