import { useMemo } from 'react'
import type { EffectProps } from '../../types'
import { parseSrt } from '../../srt'
import { alphaOfCssColor } from '../../cardOpacity'

/**
 * 口播字幕卡。
 *
 * 两种用法（靠 params.text 区分）：
 *  - 新格式：一句一张卡。params.text 就是这一句的字幕，整张卡只负责把它显示出来。
 *    这样每张卡可以单独选中、改文案、调时长、拖动、删除、插入。
 *  - 旧格式：一张卡装整轨 SRT（params.srt），卡内按 progress 还原真实秒数、逐句切换。
 *    只用于兼容拆分之前的老工程，导入时会被自动拆成新格式。
 *
 * 两种模式都是纯 progress 驱动（无 setInterval），可以逐帧导出。
 */
export default function SrtSubtitle({ params, progress, meta }: EffectProps) {
  const single = String(params.text ?? '')
  const raw = String(params.srt ?? '')
  const cues = useMemo(() => (single ? [] : parseSrt(raw)), [single, raw])
  const fontSize = Number(params.fontSize ?? 44)
  const align = String(params.align ?? 'center') as 'left' | 'center' | 'right'
  const color = String(params.color ?? '#ffffff')
  const box = params.box !== false
  const bg = String(params.bg ?? 'rgba(0,0,0,0.55)')
  // 背景调成全透明时不该还留一圈高亮边框：边框跟着背景的 alpha 一起淡出
  const bgAlpha = alphaOfCssColor(bg)

  const totalMs = Math.max(1, (meta.duration || 1) * 1000)
  const nowMs = progress * totalMs

  let text = single
  let visible: number

  if (single) {
    // 单句模式：句首 0.12s 淡入、句尾 0.15s 淡出（短句自动收窄，避免整句都在渐变）
    const fadeIn = Math.min(120, totalMs / 3)
    const fadeOutMs = Math.min(150, totalMs / 3)
    visible = Math.max(
      0,
      Math.min(1, fadeIn > 0 ? nowMs / fadeIn : 1, fadeOutMs > 0 ? (totalMs - nowMs) / fadeOutMs : 1),
    )
  } else {
    let cur: { start: number; end: number; text: string } | null = null
    for (const c of cues) {
      if (nowMs >= c.start && nowMs < c.end) {
        cur = c
        break
      }
    }
    // 句尾最后 0.15s 淡出
    const fadeOut = cur && nowMs > cur.end - 150 ? Math.max(0, (cur.end - nowMs) / 150) : 1
    visible = cur ? Math.min(1, fadeOut) : 0
    text = cur?.text ?? ''
  }

  const justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center'

  return (
    <div className="os-srt-wrap" style={{ justifyContent }}>
      <div
        className="os-srt-bar"
        style={{
          fontSize,
          color,
          textAlign: align,
          background: box ? bg : 'transparent',
          border:
            box && bgAlpha > 0.01
              ? `1px solid rgba(255, 255, 255, ${(0.14 * bgAlpha).toFixed(3)})`
              : 'none',
          opacity: visible,
        }}
      >
        <span className="os-srt-line">{text}</span>
      </div>
    </div>
  )
}
