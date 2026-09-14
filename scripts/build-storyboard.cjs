/**
 * 按「分镜脚本」方案生成工程 JSON：保留全部字幕卡，动效卡由人工设计的 SHOTS 决定。
 *
 * 用法：node scripts/build-storyboard.cjs
 * 前置：npx esbuild src/registry.ts --bundle --format=cjs --outfile=.ac-out/registry.cjs --platform=node
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRT = process.env.SRT || path.join(ROOT, 'scripts', 'input', '字幕.srt')
const SRC_PROJECT = path.join(ROOT, 'scripts/_tmp/live/project.json')
const OUT_DIR = path.join(ROOT, 'scripts/_tmp/storyboard')

// ── 分镜：按叙事结构手工设计 ────────────────────────────────────────────────
const SHOTS = [
  {
    start: 0.17, end: 7.19,
    why: '开场抛出全片两个悬念：怎么选模型、为什么没有豆包和千问',
    effectId: 'srcvid-hero-title',
    params: { title: '这么多大模型该怎么选', subtitle: '以 WorkBuddy 为例，一次讲清楚' },
  },
  {
    start: 7.19, end: 22.73,
    why: '第一个重点型号：混元4 让腾讯跻身国内第一梯队',
    effectId: 'srcvid-product-card-status',
    params: {
      chipTop: '刚发布 · 预览版',
      title: '混元 4 Preview',
      itemTitle: '前端能力非常强',
      itemSub: '预览版已超出很多人预期',
      pill: '腾讯跻身第一梯队',
    },
  },
  {
    start: 22.73, end: 31.86,
    why: '实用信息 + 代价，有反差才值得出卡',
    effectId: 'srcvid-comparison-lines',
    params: { line1: '免费用到 9 月 10 号，能用就用', line2: '但经常排队、报频繁请求' },
  },
  {
    start: 31.86, end: 44.29,
    why: '排队时的备选方案，观众最关心的兜底',
    effectId: 'srcvid-product-card-status',
    params: {
      chipTop: '备选 · 免费用到 9 月底',
      title: '混元 3',
      itemTitle: '日常办公够用',
      itemSub: 'V4 Flash 之下最好用的模型',
      pill: '排队时的首选替补',
    },
  },
  {
    start: 45.82, end: 61.44,
    why: '全片最强结论：国内最强推理模型，没有之一',
    effectId: 'big-title',
    params: { kicker: '智谱 GLM', title: '国内最强推理模型', subtitle: '复杂、结果要可靠 → 优先 GLM 5.3' },
  },
  {
    start: 64.08, end: 86.42,
    why: '淘汰判断：5.1 不用看，优先 5.3 和 5.2（前提：积分充足）',
    effectId: 'tool-crossout',
    params: {
      title: '推理模型怎么挑',
      subtitle: '积分充足的前提下',
      oldTools: 'GLM 5.1',
      altTitle: '优先用',
      newTools: 'GLM 5.3\nGLM 5.2',
    },
  },
  {
    start: 91.97, end: 105.36,
    why: '视觉编程模型登场，为后面视觉排名铺垫',
    effectId: 'srcvid-product-card-status',
    params: {
      chipTop: '视觉编程模型',
      title: 'GLM 5.3 Flash',
      itemTitle: '能识别图片',
      itemSub: '专门处理视觉类任务',
      pill: '多模态',
    },
  },
  {
    start: 105.36, end: 112.48,
    why: '换代判断：有了 5.3 Flash，5v Turbo 就不用了',
    effectId: 'tool-crossout',
    params: {
      title: '视觉模型已换代',
      subtitle: '同为智谱的视觉编程模型',
      oldTools: 'GLM 5v Turbo',
      altTitle: '直接用',
      newTools: 'GLM 5.3 Flash',
    },
  },
  {
    start: 112.48, end: 122.25,
    why: '明确淘汰：六月推出至今没更新',
    effectId: 'srcvid-negation-badge',
    params: { text: 'MiniMax M3 半年没更新，不用考虑' },
  },
  {
    start: 122.27, end: 142.6,
    why: '正面交锋：混元4 前端更强，K3 长任务更强',
    effectId: 'two-col',
    params: {
      leftTitle: '混元 4',
      rightTitle: 'Kimi K3',
      left: '前端能力更强一点点',
      right: '长任务 / 科研推理更强',
    },
  },
  {
    start: 144.18, end: 161.36,
    why: '批量淘汰上一代 Kimi',
    effectId: 'bullet-list',
    params: {
      title: '上一代 Kimi 直接跳过',
      items: 'K2.7 Code：同期能力不算突出\nK2.6：同样没必要考虑',
    },
  },
  {
    start: 161.36, end: 174.11,
    why: '性价比首选，积分不多时的答案',
    effectId: 'srcvid-product-card-status',
    params: {
      chipTop: '高性价比',
      title: 'DeepSeek V4 Flash',
      itemTitle: '官方涨价，倍率没变',
      itemSub: 'WorkBuddy 里依然划算',
      pill: '积分不多就选它',
    },
  },
  {
    start: 174.11, end: 185.38,
    why: '升级路径，递进关系用序列卡表达',
    effectId: 'srcvid-numbered-roadmap',
    params: { items: '01|混元 3 先顶上\n02|搞不定换 V4 Flash\n03|还不行上 V4 Pro' },
  },
  {
    start: 185.38, end: 197.05,
    why: '为两条排名做铺垫：先分清任务类型',
    effectId: 'two-col',
    params: {
      leftTitle: '视觉任务',
      rightTitle: '文本任务',
      left: '处理图片\n设计稿\n视频',
      right: '除上面这些\n其他全是文本任务',
    },
  },
  {
    start: 197.05, end: 215.88,
    why: '全片最高潮：文本任务六强排名，必须用序列卡完整展示',
    effectId: 'srcvid-numbered-roadmap',
    params: {
      items: '01|GLM 5.3\n02|GLM 5.2\n03|混元 4 preview\n04|DeepSeek V4 Pro\n05|DeepSeek V4 Flash\n06|混元 3',
    },
  },
  {
    start: 215.88, end: 230.18,
    why: '第二条排名：视觉任务三强，同样用序列卡',
    effectId: 'srcvid-numbered-roadmap',
    params: { items: '01|Kimi K3\n02|GLM 5.3 Flash\n03|混元 3' },
  },
  {
    start: 230.18, end: 241.96,
    why: '主动答疑：混元4 前端强却没进视觉榜，增强可信度',
    effectId: 'srcvid-comparison-lines',
    params: { line1: '实测：混元 4 前端比 K3 还惊艳', line2: '但官方说它是纯文本模型' },
  },
  {
    start: 247.67, end: 256.61,
    why: '修正后的视觉排名，序列卡',
    effectId: 'srcvid-numbered-roadmap',
    params: { items: '01|Kimi K3\n02|混元 4 Preview\n03|GLM 5.3 Flash' },
  },
  {
    start: 258.08, end: 264.55,
    why: '给小白的最省事原则',
    effectId: 'bullet-list',
    params: { title: '能免费用就免费用', items: '优先：混元 4 preview\n其次：混元 3' },
  },
  {
    start: 265.74, end: 281.31,
    why: '回应开场悬念之一',
    effectId: 'bullet-list',
    params: {
      title: '为什么看不到豆包',
      items: '不只 WorkBuddy\n任何非官方平台都看不到\n字节只在火山引擎开套餐',
    },
  },
  {
    start: 281.76, end: 288.44,
    why: '回应开场悬念之二，收尾',
    effectId: 'srcvid-comparison-lines',
    params: { line1: '千问是阿里的模型', line2: '阿里跟腾讯是老对手' },
  },
]

// ── 读取字幕，给每张卡附上原始口播 ──────────────────────────────────────────
function parseSrt(text) {
  const cues = []
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/)
  for (const b of blocks) {
    const lines = b.split('\n').filter((l) => l.trim())
    if (lines.length < 2) continue
    const m = lines.find((l) => l.includes('-->'))
    if (!m) continue
    const [a, z] = m.split('-->')
    const toSec = (s) => {
      const p = s.trim().replace(',', '.').split(':')
      return (+p[0]) * 3600 + (+p[1]) * 60 + parseFloat(p[2])
    }
    const body = lines.slice(lines.indexOf(m) + 1).join(' ').trim()
    if (!body) continue
    cues.push({ start: toSec(a), end: toSec(z), text: body })
  }
  return cues
}

const cues = parseSrt(fs.readFileSync(SRT, 'utf8'))
const quoteOf = (s, e) =>
  cues.filter((c) => c.start < e && c.end > s).map((c) => c.text).join(' ').slice(0, 120)

// ── 组装工程 ────────────────────────────────────────────────────────────────
const regPath = path.join(ROOT, '.ac-out/registry.cjs')
if (!fs.existsSync(regPath)) {
  console.error('缺少 .ac-out/registry.cjs，先跑：npx esbuild src/registry.ts --bundle --format=cjs --outfile=.ac-out/registry.cjs --platform=node')
  process.exit(1)
}
const { registry } = require(regPath)
const byId = Object.fromEntries(registry.map((e) => [e.id, e]))

const src = JSON.parse(fs.readFileSync(SRC_PROJECT, 'utf8'))
const subs = src.instances.filter((i) => i.effectId === 'srt-subtitle')

const cards = SHOTS.map((s, i) => {
  const def = byId[s.effectId]
  if (!def) throw new Error('未知卡型: ' + s.effectId)
  const dur = +(s.end - s.start).toFixed(2)
  return {
    id: `inst_story_${String(i + 1).padStart(2, '0')}`,
    effectId: s.effectId,
    name: `${def.name} ${String(i + 1).padStart(2, '0')}`,
    start: +s.start.toFixed(2),
    duration: dur,
    slot: 'center',
    fit: 'full',
    paint: [],
    params: { ...(def.defaultParams || {}), ...s.params },
    director: {
      sourceQuote: quoteOf(s.start, s.end),
      intent: s.why,
      requiredInformation: ['口播中出现的信息'],
      forbiddenInformation: ['口播未出现的数字、英文标签、模板编号'],
    },
  }
})

const out = { ...src, instances: [...subs, ...cards].sort((a, b) => a.start - b.start) }
fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(path.join(ROOT, 'public/_imported-project.json'), JSON.stringify(out))
fs.writeFileSync(path.join(OUT_DIR, 'project.json'), JSON.stringify(out, null, 1))

// ── 清单 ────────────────────────────────────────────────────────────────────
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const kind = (id) => (byId[id] ? byId[id].name : id)
const main = (p) =>
  Object.entries(p)
    .filter(([k, v]) => typeof v === 'string' && v && !['accent', 'crossColor'].includes(k))
    .map(([, v]) => v)
    .join(' / ')
    .replace(/\n/g, ' → ')
    .slice(0, 70)

let md = '# 分镜清单（人工设计版）\n\n'
md += `字幕 115 条 · 时长 ${fmt(out.duration)} · 动效卡 **${cards.length} 张**（旧版自动匹配 22 张）\n\n`
md += '| # | 时间 | 卡型 | 卡内文案 | 为什么出这张卡 |\n|---|---|---|---|---|\n'
cards.forEach((c, i) => {
  md += `| ${i + 1} | ${fmt(c.start)} | ${kind(c.effectId)} | ${main(c.params)} | ${SHOTS[i].why} |\n`
})
fs.writeFileSync(path.join(OUT_DIR, '分镜清单.md'), md)

console.log(`字幕卡 ${subs.length} 张 + 动效卡 ${cards.length} 张 → public/_imported-project.json`)
console.log(`清单：${path.join(OUT_DIR, '分镜清单.md')}`)
cards.forEach((c, i) => {
  console.log(` ${String(i + 1).padStart(2)}. ${fmt(c.start)}-${fmt(c.start + c.duration)}  ${kind(c.effectId).padEnd(12)} ${main(c.params)}`)
})
