import type { EffectProps } from '../../types'
import { Tag, Headline } from '../../components/primitives'

export default function GoldenReveal({ params, progress }: EffectProps) {
  const raw = String(params.lines ?? '第一句金句\n第二句补充\n第三句收尾')
  const lines = raw.split('\n').filter(Boolean)
  const tag = String(params.tag ?? '核心观点')

  return (
    <div
      className="os-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        alignItems: 'flex-start',
        width: '100%',
      }}
    >
      <Tag text={tag} progress={progress} delay={0} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lines.map((line, i) => (
          <Headline
            key={i}
            text={line}
            size={48}
            progress={progress}
            delay={0.16 + i * 0.16}
            rise={18}
          />
        ))}
      </div>
    </div>
  )
}
