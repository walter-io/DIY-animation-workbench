import type { EffectProps } from '../../types'
import { ACCENT, accentAlpha } from '../../accent'
import { applyEasing } from '../../easing'

/**
 * E38 ·  · S 型七步流程图
 * 视觉：标题 + 8 卡蛇形两行（上排 01→04 向右，下排 OUTPUT←07←06←05 向左），
 *      active 卡橙框橙字，OUTPUT 大橙勾；右侧竖向拐弯连接线；底部 tiny caps footer + 圆点线。
 * 来源：AI VIDEO PRODUCTION / WORKFLOW MAP — 从一段口播，到一条成片
 * 颜色映射：原视频橙 → --stage-special（金）。
 */
export default function ReplicaSFlow({ params, progress }: EffectProps) {
  const eyebrow = String(params.eyebrow ?? 'AI VIDEO PRODUCTION / WORKFLOW MAP')
  const titleWhite = String(params.titleWhite ?? '从一段口播，')
  const titleOrange = String(params.titleOrange ?? '到一条成片')
  const rightEyebrow = String(params.rightEyebrow ?? '07 STEPS / ONE REUSABLE SYSTEM')
  const footer = String(params.footer ?? 'BREAK DOWN · LOCK · TEST ONE · BATCH · REVIEW')
  const outputTitle = String(params.outputTitle ?? '完成成片')
  const outputSub = String(params.outputSub ?? '可复用工作流')
  const steps = String(
    params.steps ??
      '文案|锁定口播内容|SCRIPT LOCKED,拍摄|锁定 A-roll / SRT|VIDEO TIMECODE,视觉规划|拆成 15 个 MG 任务|15 TASKS,静帧设计|先选代表性画面|1ST FRAME,MG 动画|测试透明 MOV 再批量|ALPHA MOV,声音|人声优先 少量点缀|VOICE FIRST,总检|剪映合成 完整检查|FINAL REVIEW'
  )
  const activeIdx = String(params.activeIdx ?? '2,3,4')
    .split(/[,，]/)
    .map((s) => Number(s.trim()))
    .filter((n) => !Number.isNaN(n))
  const accent = ACCENT

  const parsed = steps
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => {
      const p = seg.split('|').map((x) => x.trim())
      return { title: p[0] ?? '', sub: p[1] ?? '', tag: p[2] ?? '' }
    })

  const CARD_W = 336
  const CARD_H = 156
  const ROW_GAP = 56
  const GAP = 40
  const HEAD_H = 108
  const FOOT_H = 56
  const W = CARD_W * 4 + GAP * 3
  const H = HEAD_H + CARD_H + ROW_GAP + CARD_H + FOOT_H
  const row1Top = HEAD_H
  const row2Top = HEAD_H + CARD_H + ROW_GAP

  const colX = (col: number) => col * (CARD_W + GAP)

  // 入场序：row1 col0..3 = 0..3；row2 从右往左 05,06,07,OUTPUT = 4..7
  const enterIdx = (row: number, col: number) => (row === 0 ? col : 7 - col)

  const StepCard = ({ title, sub, tag, step, col, row }: { title: string; sub: string; tag: string; step: number; col: number; row: number }) => {
    const active = activeIdx.includes(step - 1)
    const t = Math.max(0, Math.min(1, (progress - 0.12 - enterIdx(row, col) * 0.05) / 0.4))
    const e = applyEasing(t, 'easeOutBack')
    return (
      <div
        style={{
          position: 'absolute',
          left: colX(col),
          top: row === 0 ? row1Top : row2Top,
          width: CARD_W,
          height: CARD_H,
          borderRadius: 10,
          border: `1.5px solid ${active ? accent : 'rgba(255,255,255,0.28)'}`,
          background: 'rgba(9,9,11,0.9)',
          boxShadow: active ? `0 0 22px ${accentAlpha(0.22)}` : 'none',
          padding: '10px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          opacity: e,
          transform: `translateY(${(1 - e) * 22}px)`,
          transition: 'transform 0.1s linear, opacity 0.1s linear',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', color: active ? accent : 'rgba(255,255,255,0.5)' }}>
            STEP {String(step).padStart(2, '0')}
          </span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? accent : 'rgba(255,255,255,0.3)' }} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: active ? accent : '#fff', marginTop: 5, textShadow: active ? `0 0 14px ${accentAlpha(0.4)}` : 'none' }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{sub}</div>
        <div
          style={{
            marginTop: 'auto',
            alignSelf: 'flex-start',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.14em',
            color: active ? accent : 'rgba(255,255,255,0.45)',
            border: `1px solid ${active ? accentAlpha(0.5) : 'rgba(255,255,255,0.2)'}`,
            padding: '2px 8px',
            borderRadius: 3,
          }}
        >
          {tag}
        </div>
      </div>
    )
  }

  const Arrow = ({ x, y, dir, delay }: { x: number; y: number; dir: 1 | -1; delay: number }) => {
    const t = Math.max(0, Math.min(1, (progress - delay) / 0.3))
    const e = applyEasing(t, 'easeOutQuart')
    return (
      <svg
        width={GAP - 8}
        height="20"
        viewBox={`0 0 ${GAP - 8} 20`}
        style={{ position: 'absolute', left: x, top: y, opacity: e, transition: 'opacity 0.1s linear' }}
      >
        <line
          x1={dir === 1 ? 2 : GAP - 10}
          y1="10"
          x2={dir === 1 ? GAP - 18 : 10}
          y2="10"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <polygon points={dir === 1 ? `${GAP - 18},4 ${GAP - 8},10 ${GAP - 18},16` : `10,4 0,10 10,16`} fill={accent} />
      </svg>
    )
  }

  // OUTPUT 卡（row2 最左）：大橙勾 + 完成成片
  const outT = Math.max(0, Math.min(1, (progress - 0.12 - 7 * 0.05) / 0.4))
  const outE = applyEasing(outT, 'easeOutBack')

  const row1MidY = row1Top + CARD_H / 2 - 10
  const row2MidY = row2Top + CARD_H / 2 - 10

  return (
    <div
      className="os-card"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <div style={{ position: 'relative', width: W, height: H }}>
        {/* 头部 */}
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.22em', color: accent, opacity: applyEasing(Math.min(1, progress / 0.3), 'easeOutQuart') }}>
          {eyebrow}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 26,
            fontSize: 40,
            fontWeight: 900,
            color: '#fff',
            opacity: applyEasing(Math.min(1, Math.max(0, (progress - 0.05) / 0.35)), 'easeOutQuart'),
          }}
        >
          {titleWhite}
          <span style={{ color: accent, textShadow: `0 0 16px ${accentAlpha(0.4)}` }}>{titleOrange}</span>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 48,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: 'rgba(255,255,255,0.5)',
            opacity: applyEasing(Math.min(1, Math.max(0, (progress - 0.1) / 0.35)), 'easeOutQuart'),
          }}
        >
          {rightEyebrow}
        </div>

        {/* row1: STEP 01-04，箭头向右 */}
        {parsed.slice(0, 4).map((s, col) => (
          <StepCard key={`r1-${col}`} {...s} step={col + 1} col={col} row={0} />
        ))}
        {[0, 1, 2].map((i) => (
          <Arrow key={`a1-${i}`} x={colX(i) + CARD_W + 4} y={row1MidY} dir={1} delay={0.35 + i * 0.05} />
        ))}

        {/* row2: OUTPUT(col0), 07(col1), 06(col2), 05(col3)，箭头向左 */}
        {parsed.slice(4, 7).map((s, i) => {
          const step = 7 - i // i=0→07(col1), i=1→06(col2), i=2→05(col3)
          const col = i + 1
          return <StepCard key={`r2-${col}`} {...s} step={step} col={col} row={1} />
        })}
        {/* OUTPUT 卡 */}
        <div
          style={{
            position: 'absolute',
            left: colX(0),
            top: row2Top,
            width: CARD_W,
            height: CARD_H,
            borderRadius: 10,
            border: `1.5px solid ${accent}`,
            background: 'rgba(9,9,11,0.9)',
            boxShadow: `0 0 26px ${accentAlpha(0.25)}`,
            padding: '10px 16px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: outE,
            transform: `translateY(${(1 - outE) * 22}px)`,
            transition: 'transform 0.1s linear, opacity 0.1s linear',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#141414',
              fontSize: 30,
              fontWeight: 900,
              boxShadow: `0 0 18px ${accentAlpha(0.5)}`,
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: accent }}>OUTPUT / FINISHED VIDEO</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: accent, textShadow: `0 0 14px ${accentAlpha(0.4)}` }}>{outputTitle}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{outputSub}</div>
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <Arrow key={`a2-${i}`} x={colX(i) + CARD_W + 4} y={row2MidY} dir={-1} delay={0.35 + (3 - i) * 0.05} />
        ))}

        {/* 右侧拐弯连接线 STEP04 → STEP05 */}
        {(() => {
          const t = Math.max(0, Math.min(1, (progress - 0.42) / 0.28))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <svg
              width={GAP + 30}
              height={ROW_GAP + CARD_H}
              viewBox={`0 0 ${GAP + 30} ${ROW_GAP + CARD_H}`}
              style={{ position: 'absolute', left: W - 14, top: row1Top + CARD_H / 2, opacity: e > 0 ? 1 : 0, transition: 'opacity 0.1s linear' }}
            >
              <path
                d={`M 6 0 L 26 0 L 26 ${ROW_GAP + CARD_H / 2} L ${GAP + 8} ${ROW_GAP + CARD_H / 2}`}
                fill="none"
                stroke={accent}
                strokeWidth="2.5"
                strokeDasharray="200"
                strokeDashoffset={200 - 200 * e}
                strokeLinecap="round"
              />
              <polygon points={`${GAP + 8},${ROW_GAP + CARD_H / 2 - 6} ${GAP + 16},${ROW_GAP + CARD_H / 2} ${GAP + 8},${ROW_GAP + CARD_H / 2 + 6}`} fill={accent} opacity={e > 0.9 ? 1 : 0} />
            </svg>
          )
        })()}

        {/* footer */}
        {(() => {
          const t = Math.max(0, Math.min(1, (progress - 0.6) / 0.3))
          const e = applyEasing(t, 'easeOutQuart')
          return (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 30,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.26em',
                  color: 'rgba(255,255,255,0.4)',
                  opacity: e,
                }}
              >
                {footer}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 14,
                  height: 1.5,
                  background: `linear-gradient(90deg, ${accentAlpha(0.7)}, ${accentAlpha(0.1)})`,
                  transform: `scaleX(${e})`,
                  transformOrigin: 'left center',
                  transition: 'transform 0.1s linear',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 10.5,
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: accent,
                  boxShadow: `0 0 10px ${accent}`,
                  opacity: e,
                }}
              />
            </>
          )
        })()}
      </div>
    </div>
  )
}