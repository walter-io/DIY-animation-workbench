import type { EffectProps } from '../../types'
import { StatRow } from '../../components/primitives'

/** 数据网格卡：2x2 四指标 */
export function DataGridCard({ params, progress }: EffectProps) {
  const items = String(params.items ?? '新增用户,1200\n付费转化,8.4%\n次日留存,61%\n平均时长,7.5分')
    .split('\n')
    .map((s) => s.split(','))
    .filter((a) => a.length >= 2)
  return (
    <div className="os-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 36px', width: '100%' }}>
      {items.slice(0, 4).map(([k, v], i) => (
        <StatRow key={i} label={k} value={v} index={i} progress={progress} />
      ))}
    </div>
  )
}
