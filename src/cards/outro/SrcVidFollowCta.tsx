import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E18 关注我 · 结尾互动卡
 * 源视频：深色圆角大卡 + 顶部黄绿色高亮横条 + 巨字标题 + 灰色副文 + 圆点分页指示器。
 */
export default function SrcVidFollowCta({ params, progress }: EffectProps) {
  const chipTop = String(params.chipTop ?? '09 · 关注')
  const title = String(params.title ?? '关注我')
  const subtitle = String(params.subtitle ?? '带你学习更多 AI 技巧')
  const total = Number(params.total ?? 5)
  const accent = ACCENT

  const t1 = Math.max(0, Math.min(1, progress / 0.1))           // 标题 chip
  const t2 = Math.max(0, Math.min(1, (progress - 0.1) / 0.25))   // 顶部高亮条
  const t3 = Math.max(0, Math.min(1, (progress - 0.25) / 0.25))  // 巨字
  const t4 = Math.max(0, Math.min(1, (progress - 0.45) / 0.2))   // 副文
  const t5 = Math.max(0, Math.min(1, (progress - 0.6) / 0.3))    // 分页点

  const e1 = applyEasing(t1, 'easeOut')
  const e2 = applyEasing(t2, 'easeOutQuart')
  const e3 = applyEasing(t3, 'easeOutBack')
  const e4 = applyEasing(t4, 'easeOut')
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
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '80%',
            maxWidth: 720,
            background: '#0e1118',
            border: '1px solid #20242e',
            borderRadius: 16,
            padding: '44px 40px 36px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            opacity: t2,
            transform: `translateY(${(1 - e2) * 16}px) scale(${0.96 + e2 * 0.04})`,
            transition: 'transform 0.15s linear, opacity 0.15s linear',
            overflow: 'hidden',
          }}
        >
          {/* 顶部黄绿高亮横条 */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${accent} 30%, ${accent} 70%, transparent 100%)`,
              transform: `scaleX(${e2})`,
              transformOrigin: 'center center',
              boxShadow: `0 0 14px ${accentAlpha(0.7)}`,
              transition: 'transform 0.2s linear',
            }}
          />

          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: 2,
              opacity: e3,
              transform: `translateY(${(1 - e3) * 24}px) scale(${0.85 + e3 * 0.15})`,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s linear, opacity 0.15s linear',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: 16,
              color: 'rgba(255,255,255,0.6)',
              opacity: e4,
              transform: `translateY(${(1 - e4) * 8}px)`,
              transition: 'transform 0.15s linear, opacity 0.15s linear',
            }}
          >
            {subtitle}
          </div>

          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              opacity: e5,
              transition: 'opacity 0.15s linear',
            }}
          >
            {Array.from({ length: total }).map((_, i) => {
              const active = i === 0
              return (
                <div
                  key={i}
                  style={{
                    width: active ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: active ? accent : 'rgba(255,255,255,0.25)',
                    boxShadow: active ? `0 0 8px ${accentAlpha(0.7)}` : 'none',
                    transition: 'all 0.2s linear',
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
