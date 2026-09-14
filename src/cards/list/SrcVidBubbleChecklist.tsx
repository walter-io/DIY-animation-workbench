import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E12 Superpowers · 对话气泡 + 方案清单
 * 源视频：左侧 2 条白底圆角对话气泡（"做成什么样？" "数据源用哪个？"），
 * 右侧深色"方案清单 · 写完再动手"卡，内部 3 条带 ✅ 黄绿圆点清单。
 * 底部旧文案红色划线 + 新文案绿色"方向对了再动手"。
 */
export default function SrcVidBubbleChecklist({ params, progress }: EffectProps) {
  const title = String(params.title ?? 'Superpowers · 先问清再写')
  const bubbles = String(params.bubbles ?? '做成什么样？\n数据源用哪个？').split('\n').filter(Boolean)
  const listTitle = String(params.listTitle ?? '方案清单 · 写完再动手')
  const items = String(params.items ?? '① 明确需求\n② 整理方案\n③ 再写代码').split('\n').filter(Boolean)
  const oldLine = String(params.oldLine ?? '做一半才发现方向错了')
  const newLine = String(params.newLine ?? '方向对了再动手')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.1))          // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.2))  // 气泡
  const t3 = Math.max(0, Math.min(1, (progress - 0.3) / 0.2))  // 清单卡
  const t4 = Math.max(0, Math.min(1, (progress - 0.45) / 0.15)) // 清单项
  const t5 = Math.max(0, Math.min(1, (progress - 0.7) / 0.2))  // 底部旧/新文案

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutBack')
  const e3 = applyEasing(t3, 'easeOutQuart')
  const e5 = applyEasing(t5, 'easeOut')

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
        gap: 24,
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
        <span style={{ fontSize: 20 }}>③</span>
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 28, alignItems: 'center' }}>
        {/* 左侧：对话气泡 */}
        <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
          {bubbles.map((b, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.94)',
                color: '#0a0a0a',
                padding: '12px 20px',
                borderRadius: 16,
                borderTopLeftRadius: 16,
                borderBottomLeftRadius: i % 2 === 0 ? 4 : 16,
                fontSize: 15,
                fontWeight: 500,
                maxWidth: '100%',
                opacity: e2,
                transform: `translateX(${(1 - e2) * (i % 2 === 0 ? -16 : 12)}px)`,
                transition: 'transform 0.15s linear, opacity 0.15s linear',
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              {b}
            </div>
          ))}
        </div>

        {/* 右侧：方案清单卡 */}
        <div
          style={{
            flex: 1,
            background: '#10131A',
            border: '1px solid #20242e',
            borderRadius: 14,
            padding: '20px 22px 18px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            opacity: e3,
            transform: `translateX(${(1 - e3) * 16}px)`,
            transition: 'transform 0.15s linear, opacity 0.15s linear',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
            }}
          >
            {listTitle}
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                height: 38,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 12,
                fontSize: 14,
                color: 'rgba(255,255,255,0.85)',
                opacity: t4 > i * 0.25 ? Math.min(1, (t4 - i * 0.25) * 3) : 0,
                transform: `translateX(${(1 - Math.min(1, Math.max(0, (t4 - i * 0.25) * 3))) * 12}px)`,
                transition: 'transform 0.12s linear, opacity 0.12s linear',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: accent,
                  color: '#0a0a0a',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
              {it}
            </div>
          ))}
        </div>
      </div>

      {/* 底部：旧文案（划线）+ 新文案（绿色） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontSize: 14,
          opacity: e5,
          transform: `translateY(${(1 - e5) * 8}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <span
          style={{
            color: 'rgba(255,90,90,0.75)',
            textDecoration: 'line-through',
            textDecorationColor: 'rgba(255,90,90,0.85)',
            textDecorationThickness: 2,
          }}
        >
          {oldLine}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
        <span style={{ color: accent, fontWeight: 600 }}>{newLine}</span>
      </div>
    </div>
  )
}
