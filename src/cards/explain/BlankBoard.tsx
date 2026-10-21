import type { EffectProps } from '../../types'
import { paperStyle, seg } from './explainKit'

/**
 * 解说·空白底板：一整页背景，没有内容。
 * 用来配合「元素」里的小零件自由拼页 —— 先铺一张底板，再把标题/药丸/标签叠上去。
 * 背景色四选一：米白（解说卡原本的纸感色）/ 白色 / 黑色 / 透明。
 */
export default function BlankBoard({ params, progress }: EffectProps) {
  const variant = String(params.variant ?? '米白')
  const showBar = params.showBar === true
  const barColor = String(params.barColor ?? '#f2a63a')
  const barHeight = Number(params.barHeight ?? 8)

  return (
    <div style={paperStyle(variant)}>
      {showBar && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: barHeight,
            width: '100%',
            background: 'rgba(127, 127, 127, 0.22)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.round(seg(progress, 0, 0.9) * 100)}%`,
              background: barColor,
            }}
          />
        </div>
      )}
    </div>
  )
}
