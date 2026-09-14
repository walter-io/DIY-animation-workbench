import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E17 上手路径 · 流程节点串联
 * 源视频：3 个深色圆角节点横向排列，节点之间用黄绿色水平线串联（线条自左向右生长），
 * 节点上带 ✅ 黄绿圆点 + 状态 pill，最右虚线"更多流程 +"扩展节点 + 灰色箭头。
 */
export default function SrcVidFlowChainNodes({ params, progress }: EffectProps) {
  const chipTop = String(params.chipTop ?? '08 · 上手路径')
  const title = String(params.title ?? '上手路径 · 先跑通再扩展')
  const defaultNodes = [
    { text: '重复流程', done: false, pill: '' },
    { text: '跑起来', done: true, pill: '' },
    { text: '检查结果', done: true, pill: '结果容易检查 √' },
  ]
  const nodes = String(params.nodes ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [t, d, p] = line.split(',')
      return { text: t, done: d === 'done', pill: p ?? '' }
    })
  const nodesFinal = nodes.length ? nodes : defaultNodes
  const moreText = String(params.moreText ?? '更多流程 +')
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.1))            // 标题
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.25))    // 节点
  const t3 = Math.max(0, Math.min(1, (progress - 0.3) / 0.25))    // 连接线
  const t4 = Math.max(0, Math.min(1, (progress - 0.55) / 0.2))    // pill
  const t5 = Math.max(0, Math.min(1, (progress - 0.7) / 0.2))     // 更多 +

  const e1 = applyEasing(t1, 'easeOut')
  const e4 = applyEasing(t4, 'easeOutBack')
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
        gap: 22,
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
          color: accent,
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
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
        }}
      >
        {nodesFinal.map((n, i) => {
          const segDelay = i * 0.1
          const nodeEnter = Math.max(0, Math.min(1, (t2 - segDelay) * 4))
          const lineEnter = Math.max(0, Math.min(1, (t3 - segDelay) * 4))
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: i === 0 ? '0 0 auto' : '0 0 auto',
                position: 'relative',
              }}
            >
              {/* 节点 */}
              <div
                style={{
                  position: 'relative',
                  padding: '12px 22px',
                  background: '#10131A',
                  border: `1.5px solid ${n.done && lineEnter > 0.6 ? accent : '#2a2f3a'}`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  minWidth: 110,
                  opacity: nodeEnter,
                  transform: `translateY(${(1 - nodeEnter) * 16}px) scale(${0.85 + nodeEnter * 0.15})`,
                  boxShadow:
                    n.done && lineEnter > 0.6
                      ? `0 0 14px ${accentAlpha(0.35)}`
                      : '0 4px 14px rgba(0,0,0,0.25)',
                  transition: 'transform 0.15s linear, opacity 0.15s linear, border-color 0.2s linear, box-shadow 0.2s linear',
                }}
              >
                {n.done && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: accent,
                      color: '#0a0a0a',
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: lineEnter,
                      transform: `scale(${lineEnter})`,
                      transition: 'transform 0.2s linear, opacity 0.2s linear',
                    }}
                  >
                    ✓
                  </span>
                )}
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#fff',
                  }}
                >
                  {n.text}
                </span>

                {/* 节点上方 pill */}
                {n.pill && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -36,
                      left: '50%',
                      transform: `translateX(-50%) scale(${0.7 + e4 * 0.3}) translateY(${(1 - e4) * 8}px)`,
                      padding: '4px 12px',
                      background: accentAlpha(0.95),
                      color: '#0a0a0a',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      opacity: e4,
                      boxShadow: `0 4px 12px ${accentAlpha(0.4)}`,
                      transition: 'transform 0.15s linear, opacity 0.15s linear',
                    }}
                  >
                    {n.pill}
                  </div>
                )}
              </div>

              {/* 连接线（节点之间） */}
              {i < nodesFinal.length - 1 && (
                <div
                  style={{
                    width: 60,
                    height: 3,
                    background: accent,
                    transformOrigin: 'left center',
                    transform: `scaleX(${lineEnter})`,
                    boxShadow: `0 0 8px ${accentAlpha(0.5)}`,
                    transition: 'transform 0.25s linear',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* 末尾灰色斜线 + 虚线"更多流程 +" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginLeft: 8,
            opacity: e5,
            transform: `translateX(${(1 - e5) * 16}px)`,
            transition: 'transform 0.15s linear, opacity 0.15s linear',
          }}
        >
          <div
            style={{
              width: 40,
              height: 2,
              background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 8px)',
              transform: 'rotate(8deg)',
              transformOrigin: 'left center',
            }}
          />
          <div
            style={{
              padding: '10px 18px',
              border: '1.5px dashed rgba(255,255,255,0.3)',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.5)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {moreText}
          </div>
        </div>
      </div>
    </div>
  )
}
