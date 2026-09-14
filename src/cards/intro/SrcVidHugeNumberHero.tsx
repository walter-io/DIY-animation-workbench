import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

type CornerPos = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_MAP: Record<CornerPos, { top?: number; bottom?: number; left?: number; right?: number; br: 'top left' | 'top right' | 'bottom left' | 'bottom right'; width: number; height: number; brW: number; brH: number; blW: number; blH: number }> = {
  tl: { top: 60, left: 60, br: 'top left', width: 28, height: 28, brW: 2, brH: 12, blW: 12, blH: 2 },
  tr: { top: 60, right: 60, br: 'top right', width: 28, height: 28, brW: 2, brH: 12, blW: 12, blH: 2 },
  bl: { bottom: 60, left: 60, br: 'bottom left', width: 28, height: 28, brW: 2, brH: 12, blW: 12, blH: 2 },
  br: { bottom: 60, right: 60, br: 'bottom right', width: 28, height: 28, brW: 2, brH: 12, blW: 12, blH: 2 },
}

function CornerMark({ pos, opacity }: { pos: CornerPos; opacity: number }) {
  const m = CORNER_MAP[pos]
  return (
    <div
      style={{
        position: 'absolute',
        top: m.top,
        bottom: m.bottom,
        left: m.left,
        right: m.right,
        width: m.width,
        height: m.height,
        opacity,
        transition: 'opacity 0.15s linear',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: pos.startsWith('t') ? 0 : 'auto',
          bottom: pos.startsWith('b') ? 0 : 'auto',
          left: pos.endsWith('l') ? 0 : 'auto',
          right: pos.endsWith('r') ? 0 : 'auto',
          width: '100%',
          height: m.brH,
          background: ACCENT,
          boxShadow: `0 0 6px ${accentAlpha(0.6)}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: pos.startsWith('t') ? 0 : 'auto',
          bottom: pos.startsWith('b') ? 0 : 'auto',
          left: pos.endsWith('l') ? 0 : 'auto',
          right: pos.endsWith('r') ? 0 : 'auto',
          width: m.blW,
          height: '100%',
          background: ACCENT,
          boxShadow: `0 0 6px ${accentAlpha(0.6)}`,
        }}
      />
    </div>
  )
}

/**
 * E10 90% 巨型数字主题
 * 源视频开场：黑底 + 巨大黄绿数字 + 柔光晕 + 四角 L 形取景框 + 顶部眉头 chip。
 */
export default function SrcVidHugeNumberHero({ params, progress }: EffectProps) {
  const num = String(params.number ?? '90%')
  const caption = String(params.caption ?? '的人只拿它聊天')
  const chipLeft = String(params.chipLeft ?? '01 · 开场')
  const chipRight = String(params.chipRight ?? 'Codex 插件 ×5')
  const accent = ACCENT

  // 入场节奏：chip 滑入 → 数字弹入 → 副文淡入
  const t1 = Math.max(0, Math.min(1, progress / 0.18))   // chip
  const t2 = Math.max(0, Math.min(1, (progress - 0.12) / 0.4)) // 数字
  const t3 = Math.max(0, Math.min(1, (progress - 0.4) / 0.3))  // 副文
  const t4 = Math.max(0, Math.min(1, (progress - 0.55) / 0.25)) // 角标

  const e1 = applyEasing(t1, 'easeOutQuart')
  const e2 = applyEasing(t2, 'easeOutBack')
  const e3 = applyEasing(t3, 'easeOut')
  const e4 = applyEasing(t4, 'easeOut')

  // 数字柔光呼吸（在 0.5~0.7 区间脉冲一次）
  const pulse = progress > 0.5 && progress < 0.75
    ? 1 + Math.sin((progress - 0.5) / 0.25 * Math.PI) * 0.18
    : 0

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
        overflow: 'hidden',
      }}
    >
      {/* 暗色网格背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.6,
        }}
      />
      {/* 数字背后的柔光晕 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 720,
          height: 320,
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(ellipse at center, ${accentAlpha(0.28)} 0%, ${accentAlpha(0.08)} 40%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />

      {/* 顶部眉头 chips */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 28,
          display: 'flex',
          gap: 8,
          opacity: e1,
          transform: `translateX(${(1 - e1) * -16}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            background: 'rgba(20,22,30,0.85)',
            border: `1px solid ${accentAlpha(0.4)}`,
            borderRadius: 4,
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 500,
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
          {chipLeft}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 28,
          right: 28,
          opacity: e1,
          transform: `translateX(${(1 - e1) * 16}px)`,
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '5px 12px',
            background: 'rgba(20,22,30,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12,
          }}
        >
          {chipRight}
        </div>
      </div>

      {/* 居中大数字 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${0.85 + e2 * 0.15})`,
          opacity: e2,
          textAlign: 'center',
          transition: 'transform 0.15s linear, opacity 0.15s linear',
        }}
      >
        <div
          style={{
            fontSize: 220,
            fontWeight: 900,
            lineHeight: 1,
            color: accent,
            letterSpacing: -4,
            textShadow:
              `0 0 ${32 + pulse * 22}px ${accentAlpha(0.55)},` +
              `0 0 ${10 + pulse * 6}px ${accentAlpha(0.35)},` +
              `0 2px 0 ${accentAlpha(0.2)}`,
            fontFamily:
              'Inter, "SF Pro Display", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
          }}
        >
          {num}
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 16,
            color: 'rgba(255,255,255,0.75)',
            opacity: e3,
            transform: `translateY(${(1 - e3) * 12}px)`,
            transition: 'transform 0.15s linear, opacity 0.15s linear',
          }}
        >
          {caption}
        </div>
      </div>

      {/* 四角取景框 */}
      <CornerMark pos="tl" opacity={e4} />
      <CornerMark pos="tr" opacity={e4} />
      <CornerMark pos="bl" opacity={e4} />
      <CornerMark pos="br" opacity={e4} />
    </div>
  )
}
