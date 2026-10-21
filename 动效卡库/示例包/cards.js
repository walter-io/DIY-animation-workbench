/**
 * 示例包 · 动效卡入口。
 *
 * 这是一个**纯浏览器 ESM 模块**（不是 TSX，不会被编译：它 runtime 才被 import 进来），
 * 所以：
 *  - 不能用 JSX，用 React.createElement（下面简写成 h）；
 *  - 不能 import 'react'，用主程序挂在 window.__OS_WORKBENCH__ 上的 React；
 *  - default 导出 EffectDef[]，字段口径必须和主程序 src/types.ts 的 EffectDef 一致。
 *
 * 动画只能靠 progress 推进（0~1），**不要用 CSS animation / setTimeout** ——
 * 导出是逐帧 seek + 截图，走真实时钟的动画会被录成随机相位。
 */
const { React } = window.__OS_WORKBENCH__
const h = React.createElement

/** 淡 + 上移的小入场：只用 progress 算，导出逐帧也对得上 */
function riseIn(progress, delay = 0, dist = 26) {
  const t = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.001, 1 - delay)))
  const e = 1 - Math.pow(1 - t, 3)
  return { opacity: e, transform: `translateY(${(1 - e) * dist}px)` }
}

const boxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
  width: '100%',
  padding: '44px 52px',
  boxSizing: 'border-box',
  borderRadius: 22,
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--stage-accent, #4aa3ff) 22%, rgba(10,14,22,0.9)), rgba(8,11,18,0.94))',
  border: '1px solid color-mix(in srgb, var(--stage-accent, #4aa3ff) 45%, transparent)',
  boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
  color: 'var(--stage-text, #ffffff)',
}

/** 卡一：洞察数值卡 —— 大数字 + 标签 + 一行注解 */
function InsightValueCard({ params, progress }) {
  const value = String(params.value ?? '3.2 倍')
  const label = String(params.label ?? '人均产出提升')
  const note = String(params.note ?? '样本：12 个团队 / 8 周')
  return h(
    'div',
    { style: boxStyle },
    h(
      'div',
      { style: { fontSize: 20, letterSpacing: 2, opacity: 0.72, ...riseIn(progress, 0, 14) } },
      label,
    ),
    h(
      'div',
      {
        style: {
          fontSize: 92,
          fontWeight: 800,
          lineHeight: 1.05,
          color: 'var(--stage-accent, #4aa3ff)',
          textShadow: '0 6px 26px color-mix(in srgb, var(--stage-accent, #4aa3ff) 45%, transparent)',
          ...riseIn(progress, 0.12, 30),
        },
      },
      value,
    ),
    h(
      'div',
      { style: { fontSize: 18, opacity: 0.72, ...riseIn(progress, 0.42, 18) } },
      note,
    ),
  )
}

/** 卡二：三行结论卡 —— 一句话标题 + 三条要点依次浮现 */
function InsightConclusionCard({ params, progress }) {
  const title = String(params.title ?? '本期结论')
  const points = String(params.points ?? '流程缩短 40%\n返工基本消失\n新人两天上手')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return h(
    'div',
    { style: boxStyle },
    h(
      'div',
      { style: { fontSize: 34, fontWeight: 700, ...riseIn(progress, 0, 20) } },
      title,
    ),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      points.map((line, i) =>
        h(
          'div',
          {
            key: `${i}-${line}`,
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 22,
              ...riseIn(progress, Math.min(0.75, 0.18 + i * 0.18), 18),
            },
          },
          h('span', {
            style: {
              width: 10,
              height: 10,
              borderRadius: 999,
              background: 'var(--stage-special, #ffd166)',
              flex: '0 0 auto',
            },
          }),
          h('span', null, line),
        ),
      ),
    ),
  )
}

export default [
  {
    id: 'pack-insight-value',
    name: '洞察数值卡',
    category: '数据',
    description: '拓展包示例：大数字 + 标签 + 注解，适合强调一个关键结论。',
    component: InsightValueCard,
    schema: [
      { key: 'label', label: '标签', type: 'text', default: '人均产出提升' },
      { key: 'value', label: '数值', type: 'text', default: '3.2 倍' },
      { key: 'note', label: '注解', type: 'text', default: '样本：12 个团队 / 8 周' },
    ],
    defaultParams: { label: '人均产出提升', value: '3.2 倍', note: '样本：12 个团队 / 8 周' },
  },
  {
    id: 'pack-insight-conclusion',
    name: '三行结论卡',
    category: '列表',
    description: '拓展包示例：一句话标题 + 三条要点依次浮现。',
    component: InsightConclusionCard,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '本期结论' },
      { key: 'points', label: '要点(换行分隔)', type: 'text', default: '流程缩短 40%\n返工基本消失\n新人两天上手' },
    ],
    defaultParams: { title: '本期结论', points: '流程缩短 40%\n返工基本消失\n新人两天上手' },
  },
]
