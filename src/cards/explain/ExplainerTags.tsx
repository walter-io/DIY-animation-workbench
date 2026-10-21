import type { EffectProps } from '../../types'
import { Eyebrow, WhitePill, paperStyle, riseStyle, popSeg, seg, splitList } from './explainKit'

/**
 * 解说·标签页：标题下方一排白色药丸标签，跟着口播逐个弹出。
 * 参考"可以聊天 / 可以写文案 / 可以写文章…"那类能力列举 —— 一句一个标签。
 */
export default function ExplainerTags({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? '它能做什么')
  const title = String(params.title ?? '大语言模型能干什么')
  const tags = splitList(params.tags, '可以聊天\n可以写文案\n可以写文章\n可以写视频脚本', 8)

  const tEyebrow = seg(progress, 0.02)
  const tTitle = seg(progress, 0.08, 0.14)
  // 标签逐个弹出：从 progress 0.26 开始，到 0.9 均匀铺完
  const span = 0.64 / Math.max(1, tags.length)
  const tagT = (i: number) => popSeg(progress, 0.26 + i * span, Math.min(0.12, span))

  return (
    <div style={{ ...paperStyle(params.bg, params.ink), justifyContent: 'center', padding: '0 130px', gap: 44 }}>
      <Eyebrow text={eyebrow} t={tEyebrow} />
      <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.2, ...riseStyle(tTitle, 26) }}>
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          maxWidth: 1500,
        }}
      >
        {tags.map((tag, i) => (
          <WhitePill key={i} text={tag} t={tagT(i)} size={30} />
        ))}
      </div>
    </div>
  )
}
