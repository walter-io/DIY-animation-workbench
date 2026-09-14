import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E13 HyperFrames · 产品卡 + 状态 pill
 * 源视频：左侧大深色圆角产品卡（白色物体缩略图 + 阴影），右侧说明标题 + 灰色副文 + 绿色 pill。
 */
export default function SrcVidProductCardStatus({ params, progress }: EffectProps) {
  const title = String(params.title ?? 'HyperFrames · 自然语言做视频')
  const chipTop = String(params.chipTop ?? 'HyperFrames 预览 · 动态产品卡')
  const itemTitle = String(params.itemTitle ?? '杯子旋转展示')
  const itemSub = String(params.itemSub ?? '渲染中 · 元素持续运动')
  const pill = String(params.pill ?? '第 5 秒 · 阴影已补 √')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.12))           // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.25))   // 产品卡
  const t3 = Math.max(0, Math.min(1, (progress - 0.3) / 0.2))    // 右侧文字
  const t4 = Math.max(0, Math.min(1, (progress - 0.5) / 0.2))    // pill

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutQuart')
  const e3 = applyEasing(t3, 'easeOut')
  const e4 = applyEasing(t4, 'easeOutBack')

  // 物体上下浮动
  const floatY = progress > 0.4 ? Math.sin((progress - 0.4) * 6) * 6 : 0
  // 物体轻旋转
  const rotZ = progress > 0.4 ? Math.sin((progress - 0.4) * 3) * 8 : 0

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
          gap: 28,
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          opacity: e2,
          transform: `scale(${0.96 + e2 * 0.04})`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        {/* 顶部 chip */}
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: 42,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            opacity: e2,
            transition: 'opacity 0.15s linear',
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

        {/* 左侧大产品卡 */}
        <div
          style={{
            flex: 1,
            background: 'rgba(8,10,14,0.6)',
            border: '1px solid rgba(255,255,255,0.04)',
            borderRadius: 12,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* 物体（白色杯子简化） */}
          <div
            style={{
              position: 'relative',
              transform: `translateY(${floatY}px) rotate(${rotZ}deg)`,
              transition: 'transform 0.12s linear',
            }}
          >
            <svg width="100" height="100" viewBox="0 0 100 100">
              <ellipse cx="50" cy="84" rx="30" ry="6" fill="rgba(0,0,0,0.35)" />
              <path
                d="M30 32 H62 V58 Q62 70 50 70 H42 Q30 70 30 58 Z"
                fill="#e8e8ec"
                stroke="#9aa0a8"
                strokeWidth="1"
              />
              <path
                d="M62 38 Q72 38 72 50 Q72 60 62 60"
                stroke="#e8e8ec"
                strokeWidth="3"
                fill="none"
              />
              <path
                d="M38 30 Q50 24 62 30"
                stroke="#9aa0a8"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* 右侧说明 + pill */}
        <div
          style={{
            flex: '0 0 36%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 10,
            opacity: e3,
            transform: `translateX(${(1 - e3) * 12}px)`,
            transition: 'transform 0.15s linear, opacity 0.15s linear',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{itemTitle}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{itemSub}</div>
          <div style={{ marginTop: 8 }}>
            <div
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: accentAlpha(0.9),
                color: '#0a0a0a',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                transform: `scale(${0.7 + e4 * 0.3})`,
                boxShadow: `0 4px 14px ${accentAlpha(0.4)}`,
                transition: 'transform 0.15s linear',
              }}
            >
              {pill}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
