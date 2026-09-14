import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E14 HyperFrames · 时间轴 + 修正提示
 * 源视频：底部水平时间轴 0-Ns 刻度，activeSec 处高亮圆角小窗 + 绿色"已自动修正 √" pill，
 * 顶部提示气泡 + 主区域产品预览。
 */
export default function SrcVidTimelineFix({ params, progress }: EffectProps) {
  const title = String(params.title ?? 'HyperFrames · 自然语言做视频')
  const chipTop = String(params.chipTop ?? 'HyperFrames 预览 · 动态产品卡')
  const itemTitle = String(params.itemTitle ?? '杯子旋转展示')
  const itemSub = String(params.itemSub ?? '渲染中 · 元素持续运动')
  const totalSec = Number(params.totalSec ?? 8)
  const activeSec = Number(params.activeSec ?? 5)
  const fixedText = String(params.fixedText ?? '已自动修正 √')
  const bubbleText = String(params.bubbleText ?? '做一个杯子旋转展示')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.1))            // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.2))    // 主区
  const t3 = Math.max(0, Math.min(1, (progress - 0.3) / 0.15))   // 提示气泡
  const t4 = Math.max(0, Math.min(1, (progress - 0.4) / 0.2))    // 时间轴
  const t5 = Math.max(0, Math.min(1, (progress - 0.55) / 0.2))   // 高亮 + 修正 pill

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutQuart')
  const e3 = applyEasing(t3, 'easeOutBack')
  const e4 = applyEasing(t4, 'easeOut')
  const e5 = applyEasing(t5, 'easeOutBack')

  const ticks: number[] = []
  for (let i = 0; i <= totalSec; i++) ticks.push(i)

  const floatY = progress > 0.4 ? Math.sin((progress - 0.4) * 6) * 4 : 0

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: accent,
          opacity: e1,
          transform: `translateX(${(1 - e1) * -16}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 20 }}>④</span>
        {title}
      </div>

      <div
        style={{
          flex: 1,
          background: '#10131A',
          border: '1px solid #20242e',
          borderRadius: 14,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          opacity: e2,
          transform: `scale(${0.96 + e2 * 0.04})`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 6px ${accent}`,
            }}
          />
          {chipTop}
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 28, position: 'relative' }}>
          {/* 主产品卡 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(8,10,14,0.6)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                transform: `translateY(${floatY}px)`,
                transition: 'transform 0.12s linear',
              }}
            >
              <svg width="86" height="86" viewBox="0 0 100 100">
                <ellipse cx="50" cy="84" rx="30" ry="6" fill="rgba(0,0,0,0.35)" />
                <path
                  d="M30 32 H62 V58 Q62 70 50 70 H42 Q30 70 30 58 Z"
                  fill="#e8e8ec"
                  stroke="#9aa0a8"
                  strokeWidth="1"
                />
                <path d="M62 38 Q72 38 72 50 Q72 60 62 60" stroke="#e8e8ec" strokeWidth="3" fill="none" />
                <path d="M38 30 Q50 24 62 30" stroke="#9aa0a8" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            {/* 顶部提示气泡 */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: '50%',
                transform: `translateX(-50%) translateY(${(1 - e3) * -12}px)`,
                opacity: e3,
                transition: 'transform 0.15s linear, opacity 0.15s linear',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 999,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.7)',
                    boxShadow: '0 0 0 2px rgba(255,255,255,0.15)',
                  }}
                />
                {bubbleText}
              </div>
            </div>
          </div>

          {/* 右侧说明 */}
          <div
            style={{
              flex: '0 0 30%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{itemTitle}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{itemSub}</div>
          </div>
        </div>

        {/* 底部时间轴 */}
        <div
          style={{
            position: 'relative',
            height: 56,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            opacity: e4,
            transition: 'opacity 0.15s linear',
          }}
        >
          {ticks.map((s) => {
            const isActive = s === activeSec
            return (
              <div
                key={s}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  position: 'relative',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 22,
                      padding: '4px 10px',
                      background: accentAlpha(0.9),
                      color: '#0a0a0a',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transform: `scale(${0.7 + e5 * 0.3}) translateY(${(1 - e5) * 4}px)`,
                      boxShadow: `0 4px 12px ${accentAlpha(0.4)}`,
                      transition: 'transform 0.15s linear',
                    }}
                  >
                    {fixedText}
                  </div>
                )}
                <div
                  style={{
                    width: 1,
                    height: isActive ? 12 : 8,
                    background: isActive ? accent : 'rgba(255,255,255,0.25)',
                  }}
                />
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? accent : 'rgba(255,255,255,0.4)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {s}s
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
