import type { EffectProps } from '../../types'
import { ACCENT } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E16 安全边界 · 4 档风险色块
 * 源视频：标题 + 红色边框卡"AI 不能自己做的事" + 4 个风险等级色块（红/黄/绿/紫）。
 * 动效：先灰色锁缩放进入 → 一项项变色（红高风险 / 黄中风险 / 绿低风险 / 紫特殊）。
 */
export default function SrcVidSafetyLocks({ params, progress }: EffectProps) {
  const chipTop = String(params.chipTop ?? '07 · 安全边界')
  const title = String(params.title ?? '安全边界 · 这四步由你确认')
  const cardTitle = String(params.cardTitle ?? 'AI 不能自己做的事')
  const defaultItems = [
    '登录,高风险,#ef4444',
    '付款,高风险,#f97316',
    '删除,中风险,#eab308',
    '正式发布,中风险,#a855f7',
  ]
  const items = String(params.items ?? defaultItems.join('\n'))
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [t, lvl, color] = line.split(',')
      return { title: t, level: lvl ?? '中风险', color: color ?? '#eab308' }
    })
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.12))          // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.2))   // 红框卡
  const t3 = Math.max(0, Math.min(1, (progress - 0.3) / 0.4))   // 4 档色块逐项亮起

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutQuart')

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
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          opacity: e1,
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

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#fff',
          opacity: e1,
          transform: `translateX(${(1 - e1) * -16}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        {title}
      </div>

      <div
        style={{
          flex: 1,
          border: '1.5px solid #E63946',
          borderRadius: 14,
          padding: 22,
          background: 'rgba(230,57,70,0.04)',
          boxShadow: '0 0 0 1px rgba(230,57,70,0.15), 0 8px 32px rgba(0,0,0,0.35)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          opacity: e2,
          transform: `scale(${0.96 + e2 * 0.04})`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#E63946',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              background: 'rgba(230,57,70,0.18)',
              border: '1px solid #E63946',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#E63946',
            }}
          >
            ⚠
          </span>
          {cardTitle}
        </div>

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, 1fr)`,
            gap: 12,
          }}
        >
          {items.map((it, i) => {
            const lit = Math.max(0, Math.min(1, (t3 - i * 0.15) * 4))
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: 16,
                  borderRadius: 10,
                  background: lit > 0 ? `${it.color}1A` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${lit > 0 ? it.color : '#2a2f3a'}`,
                  boxShadow: lit > 0 ? `0 0 16px ${it.color}55` : 'none',
                  transform: `scale(${0.85 + lit * 0.15})`,
                  opacity: 0.5 + lit * 0.5,
                  transition: 'transform 0.15s linear, opacity 0.15s linear, background 0.2s linear, border-color 0.2s linear, box-shadow 0.2s linear',
                }}
              >
                <svg width="22" height="26" viewBox="0 0 22 26">
                  <rect
                    x="3"
                    y="11"
                    width="16"
                    height="13"
                    rx="2"
                    fill={lit > 0 ? it.color : 'rgba(255,255,255,0.3)'}
                    stroke={lit > 0 ? it.color : 'rgba(255,255,255,0.4)'}
                    strokeWidth="1.2"
                  />
                  <path
                    d="M6 11 V8 Q6 3 11 3 Q16 3 16 8 V11"
                    stroke={lit > 0 ? it.color : 'rgba(255,255,255,0.4)'}
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="11" cy="17" r="1.6" fill={lit > 0 ? '#0a0a0a' : 'rgba(255,255,255,0.5)'} />
                </svg>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: lit > 0 ? '#fff' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {it.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: lit > 0 ? it.color : 'rgba(255,255,255,0.35)',
                    fontWeight: 500,
                  }}
                >
                  {it.level}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
