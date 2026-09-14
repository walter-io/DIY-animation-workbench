import type { EffectProps } from '../../types'
import { applyEasing } from '../../easing'

/**
 * E53 ·  · 大金球徽章 + 双侧 chip
 * 视觉：居中大金黄色渐变圆球（带菱形图标 + 大字标题 + 副标），
 *      左红描边 chip + 右蓝描边 chip 漂浮两侧，下方底部字幕。
 * 来源：它赌不起你的主业 — 你的主业 / 确定性·稳稳发光 + 它赌不起你的主业 / AI 短剧·业余补充
 * 颜色：原视频金球 → --stage-special（金），红 chip → --stage-assist，蓝 chip → --stage-primary。
 */
export default function ReplicaYellowBallBadge({ params, progress }: EffectProps) {
  const ballIcon = String(params.ballIcon ?? '💎')
  const ballTitle = String(params.ballTitle ?? '你的主业')
  const ballSub = String(params.ballSub ?? '确定性 · 稳稳发光')
  const leftChip = String(params.leftChip ?? '它赌不起你的主业')
  const rightChip = String(params.rightChip ?? 'AI 短剧 · 业余补充')
  const caption = String(params.caption ?? '你的能力本身，能拿到更确定、更高的回报')

  const ballT = Math.max(0, Math.min(1, progress / 0.45))
  const ballE = applyEasing(ballT, 'easeOutBack')
  const chipT = (i: number) => Math.max(0, Math.min(1, (progress - 0.25 - i * 0.1) / 0.4))
  const chipE = (i: number) => applyEasing(chipT(i), 'easeOutQuart')
  const captionT = Math.max(0, Math.min(1, (progress - 0.6) / 0.3))
  const captionE = applyEasing(captionT, 'easeOutQuart')

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 32,
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
        {/* 左 chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: '1.5px solid var(--stage-assist)',
            background: 'rgba(255,122,176,0.1)',
            color: 'var(--stage-assist)',
            fontSize: 16,
            fontWeight: 800,
            boxShadow: '0 0 14px rgba(255,122,176,0.3)',
            opacity: chipE(0),
            transform: `translateX(${(-1 + chipE(0)) * 30}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            maxWidth: 260,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {leftChip}
        </div>
        {/* 金球（固定金色，走项目 --stage-special 语义色） */}
        <div
          style={{
            position: 'relative',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #fff3a0 0%, var(--stage-special) 45%, #c4821b 95%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow: '0 0 50px color-mix(in srgb, var(--stage-special) 45%, transparent), inset 0 -8px 24px rgba(0,0,0,0.18)',
            opacity: ballE,
            transform: `scale(${0.6 + ballE * 0.4})`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 4 }}>{ballIcon}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a', textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>{ballTitle}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.7)', marginTop: 4 }}>{ballSub}</div>
        </div>
        {/* 右 chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 8,
            border: '1.5px solid var(--stage-primary)',
            background: 'rgba(139,157,255,0.1)',
            color: 'var(--stage-primary)',
            fontSize: 16,
            fontWeight: 800,
            boxShadow: '0 0 14px rgba(139,157,255,0.3)',
            opacity: chipE(1),
            transform: `translateX(${(1 - chipE(1)) * 30}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
            maxWidth: 260,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {rightChip}
        </div>
      </div>
      {caption && (
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.7)',
            padding: '6px 18px',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999,
            background: 'rgba(8,8,11,0.7)',
            opacity: captionE,
            transition: 'opacity 0.1s linear',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}