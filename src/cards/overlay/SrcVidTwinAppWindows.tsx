import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E11 Computer Use · 双应用窗口并列
 * 源视频：两张深色应用窗口左右并排，每张顶部有 macOS 红黄绿三点 + 内容 + 黄绿按钮 + 状态 pill，
 * 右卡上还有白色鼠标指针三角点击动画。
 */
export default function SrcVidTwinAppWindows({ params, progress }: EffectProps) {
  const title = String(params.title ?? 'Computer Use · 看屏幕找按钮')
  const leftTitle = String(params.leftTitle ?? '销售数据.xlsx')
  const leftRows = String(params.leftRows ?? '件\n件\n件').split('\n').filter(Boolean)
  const leftBtn = String(params.leftBtn ?? '导出报表')
  const leftTag = String(params.leftTag ?? '√ 1')
  const rightTitle = String(params.rightTitle ?? '网页后台 · 商品管理')
  const rightRows = String(params.rightRows ?? 'SKU-01 库存 420\nSKU-02 库存 138\nSKU-03 库存 976').split('\n').filter(Boolean)
  const rightBtn = String(params.rightBtn ?? '同步库存')
  const rightTags = String(params.rightTags ?? '√ 2,√ 3').split(',').filter(Boolean)
  const accent = ACCENT

  // 入场：标题 → 左卡 → 右卡 → 鼠标点击
  const t1 = Math.max(0, Math.min(1, progress / 0.12))   // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.25)) // 左卡
  const t3 = Math.max(0, Math.min(1, (progress - 0.25) / 0.25)) // 右卡
  const t4 = Math.max(0, Math.min(1, (progress - 0.5) / 0.15)) // 按钮
  const t5 = Math.max(0, Math.min(1, (progress - 0.55) / 0.15)) // 鼠标+点击
  const t6 = Math.max(0, Math.min(1, (progress - 0.7) / 0.15)) // 状态 pill

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutQuart')
  const e3 = applyEasing(t3, 'easeOutQuart')
  const e4 = applyEasing(t4, 'easeOutBack')
  const e5 = applyEasing(t5, 'easeOut')
  const e6 = applyEasing(t6, 'easeOutBack')

  const Dots = () => (
    <div style={{ display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
    </div>
  )

  const AppWindow = ({
    title: t,
    rows,
    btn,
    tags,
    enter,
  }: {
    title: string
    rows: string[]
    btn: string
    tags: string[]
    enter: number
  }) => (
    <div
      style={{
        flex: 1,
        background: '#10131A',
        border: '1px solid #20242e',
        borderRadius: 12,
        overflow: 'hidden',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
        transition: 'transform 0.15s linear, opacity 0.15s linear',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Dots />
      <div style={{ padding: '14px 18px 6px', fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
        {t}
      </div>
      <div style={{ padding: '6px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              height: 28,
              borderRadius: 5,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {r}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {tags.map((tg, i) => (
            <div
              key={i}
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: accentAlpha(0.9),
                color: '#0a0a0a',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                opacity: t6 * (i === 0 ? 1 : 0.6),
                transform: `scale(${0.8 + e6 * 0.2})`,
                transition: 'transform 0.15s linear, opacity 0.15s linear',
              }}
            >
              {tg}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          padding: '14px 18px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            background: accent,
            color: '#0a0a0a',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            transform: `scale(${0.7 + e4 * 0.3})`,
            boxShadow: `0 4px 18px ${accentAlpha(0.4)}`,
            transition: 'transform 0.15s linear',
          }}
        >
          {btn}
        </div>
      </div>
    </div>
  )

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
        <span style={{ fontSize: 20 }}>②</span>
        {title}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 24, position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <AppWindow title={leftTitle} rows={leftRows} btn={leftBtn} tags={[leftTag]} enter={e2} />
        </div>
        <div style={{ flex: 1, position: 'relative' }}>
          <AppWindow title={rightTitle} rows={rightRows} btn={rightBtn} tags={rightTags} enter={e3} />
          {/* 鼠标指针三角（点击右卡的同步库存按钮） */}
          <div
            style={{
              position: 'absolute',
              left: '58%',
              bottom: 26,
              opacity: e5,
              transform: `translate(${(1 - e5) * 12}px, ${(1 - e5) * 12}px) scale(${0.7 + e5 * 0.3})`,
              transition: 'transform 0.15s linear, opacity 0.15s linear',
              pointerEvents: 'none',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22">
              <path
                d="M2 2 L20 11 L11 13 L9 21 Z"
                fill="#ffffff"
                stroke="#0a0a0a"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
