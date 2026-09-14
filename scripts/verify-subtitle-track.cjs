/**
 * 字幕轨 / 背景透明度 的行为验证脚本。
 *
 *   npm run verify:subtitle
 *
 * 只验证纯逻辑（subtitleTrack.ts / srt.ts / cardOpacity.ts），不依赖浏览器。
 * 浏览器里那部分（背景层是否真的消失、模糊是否跟着没）用 verify:ui 做截图核对。
 */
const {
  SUBTITLE_EFFECT,
  MIN_SUBTITLE_DURATION,
  planSubtitleCards,
  buildSubtitleInstances,
  subtitleTrack,
  clampSubtitleRange,
  normalizeSubtitleTrack,
  subtitleTrackHasOverlap,
  insertSubtitleCard,
  splitLegacySubtitleInstance,
  isSubtitle,
  subtitleTextOf,
} = require('../.verify-out/subtitleTrack.js')
const { parseSrt } = require('../.verify-out/srt.js')
const {
  alphaToTransparency,
  transparencyToAlpha,
  transparencyPercent,
  alphaOfCssColor,
} = require('../.verify-out/cardOpacity.js')

let passed = 0
let failed = 0

function ok(name, cond, detail) {
  if (cond) {
    passed++
    console.log(`  \u2713 ${name}`)
  } else {
    failed++
    console.log(`  \u2717 ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function eq(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  ok(name, a === e, `期望 ${e}，实际 ${a}`)
}

function section(title) {
  console.log(`\n${title}`)
}

/**
 * 全局唯一的假 id 生成器。
 * 注意：整条字幕轨是靠 id 索引的，测试里如果每个 factory 都从 1 开始会撞号，
 * 撞号后断言会失败——这恰恰说明 id 唯一性是这套逻辑的前提。
 */
const nextId = (() => {
  let n = 0
  return () => `sub_${++n}`
})()

/** 断言轨道按时间有序且互不重叠 */
function assertCleanTrack(label, instances) {
  ok(`${label}：轨道内无重叠`, !subtitleTrackHasOverlap(instances), '存在重叠区间')
  const track = subtitleTrack(instances)
  let ordered = true
  for (let i = 1; i < track.length; i++) {
    if (track[i].start < track[i - 1].start) ordered = false
  }
  ok(`${label}：按时间顺序排列`, ordered)
  ok(
    `${label}：每张卡都有时长`,
    track.every((i) => i.duration >= MIN_SUBTITLE_DURATION - 1e-6),
  )
}

// 时间码辅助：秒 → SRT 时间码
function tc(sec) {
  const ms = Math.round(sec * 1000)
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`
}

function srtOf(lines) {
  return lines
    .map(([start, end, text], i) => `${i + 1}\n${tc(start)} --> ${tc(end)}\n${text}`)
    .join('\n\n')
}

// ─────────────────────────────────────────────────────────────
section('1. 背景透明度数值映射（100% = 完全隐藏，0% = 完全不透明）')
// ─────────────────────────────────────────────────────────────
eq('alpha 1（背景全实）→ 界面显示 0%', transparencyPercent(1), 0)
eq('alpha 0（背景全隐）→ 界面显示 100%', transparencyPercent(0), 100)
eq('滑杆 100% → alpha 0（背景层 opacity: 0，无背景无模糊）', transparencyToAlpha(1), 0)
eq('滑杆 0% → alpha 1（背景层 opacity: 1，完全不透明）', transparencyToAlpha(0), 1)
eq('滑杆 65% → alpha 0.35', transparencyToAlpha(0.65), 0.35)
eq('alpha 0.35 → 滑杆 65%', alphaToTransparency(0.35), 0.65)
ok(
  '往返换算无漂移（0~100% 每 5% 一档）',
  Array.from({ length: 21 }, (_, i) => i / 20).every(
    (t) => Math.abs(alphaToTransparency(transparencyToAlpha(t)) - t) < 1e-9,
  ),
)
eq('旧数值换算：深色玻璃底色 alpha 0.42', alphaOfCssColor('rgba(8,8,12,0.42)'), 0.42)
eq('旧数值换算：实色返回 1', alphaOfCssColor('#101014'), 1)

// ─────────────────────────────────────────────────────────────
section('2. SRT → 一句一张卡')
// ─────────────────────────────────────────────────────────────
const sample = srtOf([
  [0.0, 2.0, '欢迎来到本期节目'],
  [2.2, 4.5, '今天我们用数据讲增长'],
  [4.8, 7.0, '先看第一个数字'],
])
const cues = parseSrt(sample)
eq('解析出 3 条 cue', cues.length, 3)
const plan = planSubtitleCards(cues)
eq('生成 3 张卡的计划', plan.length, 3)
eq('第 1 句文案', plan[0].text, '欢迎来到本期节目')
eq('第 1 句时间', [plan[0].start, plan[0].duration], [0, 2])
eq('第 2 句时间（保留原停顿）', [plan[1].start, plan[1].duration], [2.2, 2.3])
eq('第 3 句时间', [plan[2].start, Math.round(plan[2].duration * 100) / 100], [4.8, 2.2])

const cards = buildSubtitleInstances(plan, { fontSize: 44, text: '', srt: '' }, nextId)
eq('生成 3 个实例', cards.length, 3)
ok('全部是口播字幕卡', cards.every(isSubtitle))
ok('全部带独立文案', cards.every((c) => subtitleTextOf(c).length > 0))
ok('全部落在底部字幕轨（slot=bottom）', cards.every((c) => c.slot === 'bottom'))
eq('命名按顺序编号', cards.map((c) => c.name), ['口播字幕 01', '口播字幕 02', '口播字幕 03'])
ok('effectId 一致（同一条轨道）', new Set(cards.map((c) => c.effectId)).size === 1)
eq('effectId 为 srt-subtitle', cards[0].effectId, SUBTITLE_EFFECT)

// ─────────────────────────────────────────────────────────────
section('3. 时间码有重叠 / 乱序的口播稿 → 依然有序不重叠')
// ─────────────────────────────────────────────────────────────
const messy = srtOf([
  [5.0, 7.0, '第三句（时间码乱序，排在第一个）'],
  [0.0, 3.0, '第一句（和第二句重叠）'],
  [2.0, 4.0, '第二句（和第一句重叠）'],
])
const messyPlan = planSubtitleCards(parseSrt(messy))
eq('乱序输入被排好序', messyPlan.map((p) => p.text.slice(0, 3)), ['第一句', '第二句', '第三句'])
ok(
  '重叠区间被修成不重叠',
  messyPlan.every((p, i) => i === 0 || p.start >= messyPlan[i - 1].start + messyPlan[i - 1].duration - 1e-6),
  JSON.stringify(messyPlan),
)
const messyCards = buildSubtitleInstances(messyPlan, { text: '', srt: '' }, nextId)
assertCleanTrack('乱序稿', messyCards)

// ─────────────────────────────────────────────────────────────
section('4. 拖动 / 改时长 → 始终夹在邻居之间，不重叠')
// ─────────────────────────────────────────────────────────────
const base = buildSubtitleInstances(
  planSubtitleCards(parseSrt(srtOf([[0, 2, 'A'], [2, 4, 'B'], [4, 6, 'C']]))),
  { text: '', srt: '' },
  nextId,
)
const [A, B, C] = base

// 往左拖到负数 → 夹到 0
eq('第 1 句往左拖出界 → 夹到 0', clampSubtitleRange(base, A.id, { start: -5, duration: 2 }), {
  start: 0,
  duration: 2,
})
// 往右拖过下一句 → 夹到下一句开头之前，且时长保持不变（用户要的是"挪位置"）
const bFar = clampSubtitleRange(base, B.id, { start: 99, duration: 2 })
ok('第 2 句往右拖过头 → 不越过第 3 句', bFar.start + bFar.duration <= C.start + 1e-6, JSON.stringify(bFar))
eq('往右拖到底：时长不被压扁，整张卡贴到下一句之前', bFar, { start: 2, duration: 2 })
// 改时长顶到下一句 → 截断
const bLong = clampSubtitleRange(base, B.id, { start: 2, duration: 99 })
eq('第 2 句时长顶到下一句 → 截断到 2s', bLong, { start: 2, duration: 2 })
// 时长压到 0 → 保底最小时长
eq('时长压到 0 → 保底 0.2s', clampSubtitleRange(base, B.id, { start: 2, duration: 0 }).duration, MIN_SUBTITLE_DURATION)
// 中间那句无论怎么改，都不会和左右邻居重叠
let overlapSeen = false
let cases = 0
for (const target of [A, B, C]) {
  for (let s = -2; s <= 8; s += 0.5) {
    for (const d of [0, 0.2, 1, 3, 9]) {
      const range = clampSubtitleRange(base, target.id, { start: s, duration: d })
      const next = base.map((i) => (i.id === target.id ? { ...i, ...range } : i))
      if (subtitleTrackHasOverlap(next)) overlapSeen = true
      cases++
    }
  }
}
ok(`穷举 3 张卡 × 21 个起点 × 5 个时长（共 ${cases} 种）：从不重叠`, !overlapSeen)

// ─────────────────────────────────────────────────────────────
section('5. 新增 / 插入：后续句子整体后移')
// ─────────────────────────────────────────────────────────────
const insAfterFirst = insertSubtitleCard(base, A.id, { text: '', srt: '' }, nextId, { text: '新句' })
eq('插入后共 4 张', subtitleTrack(insAfterFirst.instances).length, 4)
const railAfterInsert = subtitleTrack(insAfterFirst.instances)
eq('新卡紧接在第 1 句之后', [railAfterInsert[1].start, railAfterInsert[1].duration], [2, 2])
eq('原第 2 句被后移到 4s', railAfterInsert[2].start, 4)
eq('原第 3 句被后移到 6s', railAfterInsert[3].start, 6)
assertCleanTrack('插入后', insAfterFirst.instances)
eq('新卡自动选中（返回 id）', subtitleTextOf(railAfterInsert[1]), '新句')
eq('编号自动重排', railAfterInsert.map((i) => i.name), [
  '口播字幕 01',
  '口播字幕 02',
  '口播字幕 03',
  '口播字幕 04',
])

const appended = insertSubtitleCard(base, null, { text: '', srt: '' }, nextId, { text: '末尾句' })
eq('末尾追加：落在 6s', subtitleTrack(appended.instances)[3].start, 6)
assertCleanTrack('末尾追加后', appended.instances)

// 连插 5 张也不重叠
let chain = base
for (let i = 0; i < 5; i++) {
  chain = insertSubtitleCard(chain, A.id, { text: '', srt: '' }, nextId, { text: `x${i}` }).instances
}
eq('连续插入 5 张 → 共 8 张', subtitleTrack(chain).length, 8)
assertCleanTrack('连续插入后', chain)

// ─────────────────────────────────────────────────────────────
section('6. 旧工程迁移：一整轨 SRT 长卡 → 一句一张卡')
// ─────────────────────────────────────────────────────────────
const legacy = {
  id: 'legacy_1',
  effectId: SUBTITLE_EFFECT,
  name: '口播字幕',
  start: 0,
  duration: 7,
  slot: 'bottom',
  fit: 'auto',
  params: { srt: sample, fontSize: 44, align: 'center', color: '#fff', box: true, bg: 'rgba(0,0,0,0.55)' },
}
const split = splitLegacySubtitleInstance(legacy, nextId)
eq('拆成 3 张', split.length, 3)
ok('每张都带自己的文案', split.every((i) => subtitleTextOf(i).length > 0))
ok('拆完不再保留整轨 SRT', split.every((i) => !i.params.srt))
eq('其它参数被继承（字号）', split[0].params.fontSize, 44)
eq('时间沿用原 cue', [split[1].start, split[1].duration], [2.2, 2.3])
assertCleanTrack('拆分后', split)
eq('重复拆分是幂等的（新格式不再被拆）', splitLegacySubtitleInstance(split[0], nextId), null)

// 起始时间不为 0 的长卡，拆分后要保留偏移
const offsetLegacy = { ...legacy, start: 10, duration: 7 }
const offsetSplit = splitLegacySubtitleInstance(offsetLegacy, nextId)
eq('带偏移的长卡：第一句起点 = 10s', subtitleTrack(offsetSplit)[0].start, 10)

// ─────────────────────────────────────────────────────────────
section('7. normalizeSubtitleTrack：兜底修正任何重叠')
// ─────────────────────────────────────────────────────────────
const broken = [
  { id: 'a', effectId: SUBTITLE_EFFECT, name: '口播字幕', start: 3, duration: 2, params: { text: 'a' } },
  { id: 'b', effectId: SUBTITLE_EFFECT, name: '口播字幕', start: 1, duration: 5, params: { text: 'b' } },
  { id: 'c', effectId: SUBTITLE_EFFECT, name: '口播字幕', start: 2, duration: 2, params: { text: 'c' } },
  { id: 'z', effectId: 'golden-reveal', name: '金句', start: 0, duration: 2, params: {} },
]
const fixed = normalizeSubtitleTrack(broken)
assertCleanTrack('兜底修正后', fixed)
eq('非字幕卡不受影响', fixed.find((i) => i.id === 'z').start, 0)
ok('修正后仍按时间排好', subtitleTrack(fixed).map((i) => i.id).join() === 'b,c,a', subtitleTrack(fixed).map((i) => i.id).join())

console.log(`\n${'─'.repeat(52)}`)
console.log(failed === 0 ? `全部通过：${passed} 项` : `通过 ${passed} 项，失败 ${failed} 项`)
// 用 exitCode 而不是 process.exit()：后者会截断还没 flush 的 stdout
process.exitCode = failed === 0 ? 0 : 1
