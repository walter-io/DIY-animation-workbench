import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E39 ·  · 编号章节展示
 * 视觉：左圆形头像（PRESENTER / VIDEO FEED）+ 右侧 "01 先锁定内容" 大标题 +
 *      橙框内容面板（文字行 / 剪映时间线 / 社交截图 三种变体）+ 步骤 chips 行 + footer 线 + 底部字幕。
 * 来源：01 先锁定内容 · 02 先测试，再批量 · 只需一件事情
 * 颜色映射：原视频橙 → --stage-special（金）。
 */
export default function ReplicaSectionShowcase({ params, progress }: EffectProps) {
  const number = String(params.number ?? '01')
  const title = String(params.title ?? '先锁定内容')
  const eyebrow = String(params.eyebrow ?? 'LOCK CONTENT BEFORE VISUAL PRODUCTION')
  const panelHeader = String(params.panelHeader ?? '● CODEX / SCRIPT LOCK / SCREEN RECORDING')
  const panelVariant = String(params.panelVariant ?? 'text') // text | editor | posts
  const panelText = String(
    params.panelText ?? '按照"矛盾—原因—认知转折—观众代入—判断方法—本期验证—下期结果"推进，删除预计约2分钟。'
  )
  const chips = String(params.chips ?? '文案锁定,试读删减,拍摄留白,A-roll / SRT')
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
  const footer = String(params.footer ?? 'CHANGE ONE LINE → EVERY DOWNSTREAM TIMECODE MOVES')
  const caption = String(params.caption ?? '我先在Codex里完成文案')
  const accent = ACCENT

  const headT = Math.max(0, Math.min(1, progress / 0.4))
  const headE = applyEasing(headT, 'easeOutQuart')
  const panelT = Math.max(0, Math.min(1, (progress - 0.15) / 0.4))
  const panelE = applyEasing(panelT, 'easeOutQuart')
  const chipBase = 0.4

  // 剪映时间线 mockup 的彩色片段行
  const editorRows = [
    { h: 16, clips: ['62%', '30%'], colors: ['var(--stage-assist)', 'var(--stage-primary)'] },
    { h: 12, clips: ['48%', '40%'], colors: ['var(--stage-data)', 'var(--stage-special)'] },
    { h: 20, clips: ['25%', '55%', '12%'], colors: ['var(--stage-special)', 'var(--stage-assist)', 'var(--stage-data)'] },
    { h: 12, clips: ['70%', '22%'], colors: ['var(--stage-primary)', 'var(--stage-special)'] },
  ]

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        padding: '0 40px',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      {/* 左：头像 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          opacity: headE,
          transform: `translateX(${(1 - headE) * -30}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div
          style={{
            width: 210,
            height: 210,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.35)',
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.16), rgba(255,255,255,0.04))`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 56,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 700,
          }}
        >
          👤
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)' }}>
          PRESENTER / VIDEO FEED
        </div>
        <div style={{ width: 210, height: 1, background: 'rgba(255,255,255,0.2)' }} />
      </div>

      {/* 右：标题 + 面板 + chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1000, flex: 1 }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, opacity: headE, transition: 'opacity 0.1s linear' }}>
          <span style={{ fontSize: 58, fontWeight: 900, color: accent, textShadow: `0 0 20px ${accentAlpha(0.45)}` }}>{number}</span>
          <span style={{ fontSize: 44, fontWeight: 900, color: '#fff' }}>{title}</span>
        </div>
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, ${accent}, ${accentAlpha(0.1)})`,
            transform: `scaleX(${headE})`,
            transformOrigin: 'left center',
          }}
        />
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: accent, opacity: headE }}>{eyebrow}</div>

        {/* 内容面板 */}
        <div
          style={{
            borderRadius: 10,
            border: `1.5px solid ${accentAlpha(0.6)}`,
            background: 'rgba(9,9,11,0.9)',
            boxShadow: `0 0 24px ${accentAlpha(0.14)}`,
            opacity: panelE,
            transform: `translateY(${(1 - panelE) * 20}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              borderBottom: '1px dashed rgba(255,255,255,0.14)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <span style={{ color: accent, marginRight: 8 }}>●</span>
            {panelHeader}
          </div>
          <div style={{ margin: 14, padding: 14, borderRadius: 6, border: '1px dashed rgba(255,255,255,0.16)', minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {panelVariant === 'text' && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--stage-data)' }}>34s ›</div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{panelText}</div>
                <div style={{ marginTop: 'auto', alignSelf: 'flex-start', fontSize: 12, color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 10px', borderRadius: 3 }}>编辑</div>
              </>
            )}
            {panelVariant === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editorRows.map((row, ri) => (
                  <div key={ri} style={{ display: 'flex', gap: 4, height: row.h }}>
                    {row.clips.map((w, ci) => {
                      const ct = Math.max(0, Math.min(1, (progress - 0.25 - ri * 0.06 - ci * 0.03) / 0.3))
                      return (
                        <div
                          key={ci}
                          style={{
                            width: `calc(${w} - 4px)`,
                            borderRadius: 3,
                            background: row.colors[ci],
                            opacity: applyEasing(ct, 'easeOutQuart') * 0.85,
                            transform: `scaleX(${applyEasing(ct, 'easeOutQuart')})`,
                            transformOrigin: 'left center',
                          }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
            {panelVariant === 'posts' && (
              <div style={{ display: 'flex', gap: 14 }}>
                {[0, 1].map((i) => {
                  const pt = Math.max(0, Math.min(1, (progress - 0.25 - i * 0.1) / 0.35))
                  const pe = applyEasing(pt, 'easeOutQuart')
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        opacity: pe,
                        transform: `translateY(${(1 - pe) * 14}px)`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
                        <div style={{ width: 90, height: 7, borderRadius: 3, background: 'rgba(255,255,255,0.25)' }} />
                      </div>
                      <div style={{ width: '100%', height: 8, borderRadius: 3, background: 'rgba(255,255,255,0.14)' }} />
                      <div style={{ width: '70%', height: 8, borderRadius: 3, background: i === 0 ? accentAlpha(0.5) : 'rgba(255,255,255,0.14)' }} />
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {[0, 1, 2].map((j) => (
                          <div key={j} style={{ width: 34, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.12)' }} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 步骤 chips 行 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {chips.map((c, i) => {
            const active = i === chips.length - 1
            const ct = Math.max(0, Math.min(1, (progress - chipBase - i * 0.07) / 0.35))
            const ce = applyEasing(ct, 'easeOutBack')
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    minWidth: 128,
                    padding: '9px 14px',
                    borderRadius: 7,
                    border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.28)'}`,
                    background: 'rgba(9,9,11,0.9)',
                    boxShadow: active ? `0 0 16px ${accentAlpha(0.2)}` : 'none',
                    opacity: ce,
                    transform: `translateX(${(1 - ce) * -18}px)`,
                    transition: 'transform 0.1s linear, opacity 0.1s linear',
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.45)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: active ? accent : '#fff' }}>{c}</div>
                </div>
                {i < chips.length - 1 && <span style={{ color: accent, fontSize: 16 }}>→</span>}
              </div>
            )
          })}
        </div>

        {/* footer 线 */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', opacity: panelE }}>
          {footer}
        </div>

        {/* 底部字幕 */}
        {caption && (
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: accent,
              textShadow: `0 0 14px ${accentAlpha(0.35)}`,
              opacity: applyEasing(Math.max(0, Math.min(1, (progress - 0.55) / 0.35)), 'easeOutQuart'),
            }}
          >
            {caption}
          </div>
        )}
      </div>
    </div>
  )
}