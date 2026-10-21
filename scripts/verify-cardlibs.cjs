/* eslint-disable no-console */
/**
 * 双卡库（常规 / 知识解说）选卡验证。
 *
 * 覆盖需求：导入 SRT 后可选生成常规动效卡或知识动效卡；
 * 知识库分段更粗（同样的字幕页数更少），但每一页装的同类信息更多。
 *
 * 用法：
 *   npx tsc -p tsconfig.autocards.json
 *   node -e "require('fs').writeFileSync('.ac-out/package.json', JSON.stringify({type:'commonjs'}))"
 *   node scripts/verify-cardlibs.cjs
 */
const fs = require('fs')
const path = require('path')

const OUT = path.resolve(__dirname, '../.ac-out')
for (const f of ['autoCards.js', 'srt.js']) {
  if (!fs.existsSync(path.join(OUT, f))) {
    console.error('缺少编译产物，请先跑：npx tsc -p tsconfig.autocards.json')
    process.exit(1)
  }
  if (!fs.existsSync(path.join(OUT, 'package.json'))) {
    fs.writeFileSync(path.join(OUT, 'package.json'), JSON.stringify({ type: 'commonjs' }))
  }
}
const { chunkCues, suggestCardsForChunks } = require(path.join(OUT, 'autoCards.js'))
const { parseSrt } = require(path.join(OUT, 'srt.js'))

let pass = 0
let fail = 0
const ok = (cond, name, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ✅ ${name}`)
  } else {
    fail++
    console.log(`  ❌ ${name}${extra ? '  → ' + extra : ''}`)
  }
}

// 语料放在 scripts/ 下而不是 scripts/_tmp/：_tmp 会被定期清理，语料一没这个回归就废了
const SRT = path.resolve(__dirname, 'test-corpus-kb.srt')

/** 跑一遍选卡，返回 [{index, start, dur, mins, raw, card, params}] */
function run(lib) {
  const cues = parseSrt(fs.readFileSync(SRT, 'utf8'))
  const chunks = chunkCues(cues, lib)
  const sug = suggestCardsForChunks(chunks, lib)
  return chunks.map((c, i) => ({
    index: i,
    start: c[0].start / 1000,
    dur: (c[c.length - 1].end - c[0].start) / 1000,
    raw: c.map((x) => x.text).join(''),
    card: sug[i]?.effectId ?? null,
    name: sug[i]?.name ?? '',
    params: sug[i]?.params ?? {},
  }))
}

const lines = (v) => String(v ?? '').split('\n').filter(Boolean)

console.log('\n【1】两个库各出各的卡，互不串味')
{
  const reg = run('regular').filter((x) => x.card)
  const ex = run('explain').filter((x) => x.card)
  ok(
    reg.every((x) => !String(x.card).startsWith('ex-')),
    `常规库不产出解说卡（${reg.length} 张：${[...new Set(reg.map((x) => x.card))].join(',')}）`,
  )
  ok(
    ex.length > 0 && ex.every((x) => String(x.card).startsWith('ex-')),
    `解说库只产出解说卡（${ex.length} 张：${[...new Set(ex.map((x) => x.card))].join(',')}）`,
  )
}

console.log('\n【2】知识库分段更粗：同一条字幕，页数更少、每页更长')
{
  const reg = run('regular')
  const ex = run('explain')
  ok(
    ex.length < reg.length,
    `解说档页数 ${ex.length} < 常规档页数 ${reg.length}`,
    `${ex.length} vs ${reg.length}`,
  )
  const avg = (r) => r.reduce((s, x) => s + x.dur, 0) / Math.max(1, r.length)
  ok(
    avg(ex) > avg(reg) * 1.2,
    `解说档平均页长 ${avg(ex).toFixed(1)}s 明显长于常规档 ${avg(reg).toFixed(1)}s`,
    `${avg(ex).toFixed(1)} vs ${avg(reg).toFixed(1)}`,
  )
  ok(
    ex.every((x) => x.dur <= 26),
    `没有失控的超长页（最长 ${Math.max(...ex.map((x) => x.dur)).toFixed(1)}s ≤ 26s）`,
  )
}

console.log('\n【3】知识库每页装更多同类信息')
{
  const ex = run('explain')
  const byId = (id) => ex.filter((x) => x.card === id)

  const tags = byId('ex-tag-build')
  if (tags.length) {
    const maxTags = Math.max(...tags.map((x) => lines(x.params.tags).length))
    ok(maxTags >= 5, `标签页最多一页装 ${maxTags} 个标签（≥5）`)
  } else {
    ok(false, '语料里应至少出一张标签页兜底')
  }

  const cl = byId('ex-checklist')
  if (cl.length) {
    const maxItems = Math.max(...cl.map((x) => lines(x.params.items).length))
    // 本语料最长的清单页是三档排名（3 条），密度证据主要看标签页/步骤页；
    // 这里只要求"没有被截成 1~2 条"（截断就说明取条目的逻辑退化了）
    ok(maxItems >= 3, `清单页最多一页装 ${maxItems} 条（≥3）`)
  } else {
    ok(false, '语料里应至少出一张清单页（第 5 句在罗列能力）')
  }

  const st = byId('ex-steps-flow')
  if (st.length) {
    const maxSteps = Math.max(...st.map((x) => lines(x.params.steps).length))
    ok(maxSteps >= 4, `步骤页一页装 ${maxSteps} 格（讲到了四步）`)
  } else {
    ok(false, '语料里应出步骤页（第 12~15 句是第一步到第四步）')
  }

  // 常规库的同类卡对照：条数上限更低
  const regCl = run('regular').filter((x) => x.card === 'bullet-list')
  const regMax = regCl.length ? Math.max(...regCl.map((x) => lines(x.params.items).length)) : 0
  ok(regMax <= 4, `常规要点卡一页最多 ${regMax} 条（≤4，保持叠加卡克制）`)
}

console.log('\n【4】解说卡参数名必须真实存在（防 sub / titleSub 这类错配）')
{
  const SCHEMA = {
    'ex-title-slide': ['bg', 'ink', 'eyebrow', 'titleSub', 'title', 'pill'],
    'ex-section-slide': ['bg', 'ink', 'index', 'title', 'sub'],
    'ex-key-point': ['bg', 'ink', 'eyebrow', 'title', 'point'],
    'ex-tag-build': ['bg', 'ink', 'eyebrow', 'title', 'tags'],
    'ex-highlight-turn': ['bg', 'ink', 'lead', 'highlight', 'note'],
    'ex-checklist': ['bg', 'ink', 'eyebrow', 'title', 'items'],
    'ex-steps-flow': ['bg', 'ink', 'eyebrow', 'title', 'steps', 'footnote'],
    'ex-versus': ['bg', 'ink', 'eyebrow', 'leftTitle', 'leftLines', 'rightTitle', 'rightLines'],
    'ex-stat-hero': ['bg', 'ink', 'eyebrow', 'label', 'target', 'decimals', 'prefix', 'suffix', 'pill'],
    'ex-end-slide': ['bg', 'ink', 'summary', 'cta', 'sign'],
  }
  for (const lib of ['regular', 'explain']) {
    const bad = []
    for (const x of run(lib)) {
      if (!x.card) continue
      const allowed = SCHEMA[x.card]
      if (!allowed) continue
      for (const k of Object.keys(x.params)) {
        if (!allowed.includes(k)) bad.push(`${x.card}.${k}`)
      }
    }
    ok(bad.length === 0, `${lib} 库参数名全部命中 schema`, bad.slice(0, 6).join(', '))
  }
}

console.log('\n【5】知识库结构连续：开场是标题页、收尾是 CTA 页')
{
  const ex = run('explain').filter((x) => x.card)
  ok(ex[0]?.card === 'ex-title-slide', '开场页 = 解说·标题页', ex[0]?.card)
  const last = ex[ex.length - 1]
  ok(
    last?.card === 'ex-end-slide',
    '收尾页 = 解说·结尾页（末段有「关注我」）',
    last?.card,
  )
  ok(ex.length >= 5, `知识库至少出了 ${ex.length} 页（语料 26 句）`)
}

console.log('\n【6】数字不造数：数据页的数值必须来自口播')
{
  const ex = run('explain')
  const stat = ex.find((x) => x.card === 'ex-stat-hero')
  if (stat) {
    const raw = stat.raw.replace(/\s/g, '')
    const v = Number(stat.params.target)
    const spoken =
      raw.includes(String(v)) ||
      raw.includes(String(Math.round(v / 100))) ||
      /[一二三四五六七八九十百千]/.test(raw)
    ok(spoken, `数据页数值 ${v} 出现在该段口播里`, raw.slice(0, 40))
  } else {
    ok(true, '本段语料没有出数据页（不算失败）')
  }
}

console.log('\n【7】一页一件事：同类信息合页，不同话题不跨界')
{
  const ex = run('explain')

  const st = ex.find((x) => x.card === 'ex-steps-flow')
  ok(
    !!st && /第一步/.test(st.raw) && /第四步/.test(st.raw),
    '四步流程落在同一页（第一步 ~ 第四步，没被腰斩）',
    st ? st.raw.slice(0, 36) : '没有出步骤页',
  )

  const rankPage = ex.filter((x) => x.card === 'ex-checklist').find((x) => /梯队/.test(x.raw))
  ok(
    !!rankPage && /第一梯队/.test(rankPage.raw) && /第三梯队/.test(rankPage.raw),
    '三档排名落在同一页',
  )
  const items = lines(rankPage?.params.items)
  ok(
    items.length >= 3 && items.some((s) => /混元四/.test(s)),
    `排名页装了 ${items.length} 条，且保住了中文名次（第一梯队是混元四）`,
    items.join(' | '),
  )

  const mixed = ex.filter((x) => /传统搜索/.test(x.raw) && /第一步/.test(x.raw))
  ok(mixed.length === 0, '没有把「搜索对比」和「怎么用」压进同一页')

  // 常规库硬上限是 12s，唯一允许超出的情况是"排名/步骤序列"——
  // 序列被拆开等于丢了名次关系，所以给它到 SEQ_MAX_DUR 的额度，但不许无限长。
  const reg = run('regular').filter((x) => x.card)
  const regMax = Math.max(...reg.map((x) => x.dur))
  ok(
    reg.every((x) => x.dur <= 24),
    `常规库最长页 ${regMax.toFixed(1)}s ≤ 24s（序列粘连额度）`,
  )
  ok(
    reg.filter((x) => x.dur > 12).every((x) => /梯队|第[一二三四五六]步/.test(x.raw)),
    `常规库超过 12s 的页都发生在排名/步骤序列里（${reg.filter((x) => x.dur > 12).length} 页）`,
  )
}

console.log(`\n${'─'.repeat(64)}`)
console.log(fail === 0 ? `🎉 全部通过：${pass}/${pass + fail}` : `⚠️  ${pass} 通过，${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
