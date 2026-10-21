/* eslint-disable no-console */
/**
 * 自动选卡回归验证（纯 Node，不用浏览器）。
 *
 * 覆盖这次修复的 5 条铁律，每条都有断言——改坏了会立刻红。
 *
 * 用法：
 *   npx tsc -p tsconfig.autocards.json
 *   node -e "require('fs').writeFileSync('.ac-out/package.json', JSON.stringify({type:'commonjs'}))"
 *   node scripts/verify-autocards3.cjs
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

/** 跑一遍选卡，返回 [{start, dur, raw, card, params}] */
function run(srtPath) {
  const cues = parseSrt(fs.readFileSync(srtPath, 'utf8'))
  const chunks = chunkCues(cues)
  const sug = suggestCardsForChunks(chunks)
  return chunks.map((c, i) => ({
    start: c[0].start / 1000,
    dur: (c[c.length - 1].end - c[0].start) / 1000,
    raw: c.map((x) => x.text).join(''),
    card: sug[i]?.effectId ?? null,
    params: sug[i]?.params ?? {},
  }))
}

const C1 = path.resolve(__dirname, '_tmp/test-corpus.srt') // 大模型横评
const C2 = path.resolve(__dirname, '_tmp/test-corpus2.srt') // Obsidian 教程

// 这两份语料和 _tmp 一起被清掉过，直接跑会抛一个看不懂的 ENOENT 堆栈。
// 先明确报缺，并指向替代回归（verify-cardlibs.cjs 的语料放在 scripts/ 下，不会再被清）。
for (const [name, p] of [['语料1', C1], ['语料2', C2]]) {
  if (!fs.existsSync(p)) {
    console.error(
      `\n⏭️  跳过：缺少${name} ${path.relative(process.cwd(), p)}\n` +
        '   这份语料历史上放在 scripts/_tmp/ 被清理掉了。\n' +
        '   自动选卡的回归请改跑：node scripts/verify-cardlibs.cjs（语料在 scripts/test-corpus-kb.srt）。\n',
    )
    process.exit(0)
  }
}

console.log('\n【1】挑重点：过渡段 / 口水段不出卡')
{
  const r = run(C1)
  const skipped = r.filter((x) => x.card === null)
  ok(skipped.length >= 3, `语料1 有 ${skipped.length} 段被判定为无价值而跳过（期望 ≥3）`)
  ok(
    skipped.some((x) => /那么我们一个一个来看/.test(x.raw)),
    '过渡句「那么我们一个一个来看」不再出卡',
  )
  ok(
    skipped.some((x) => /说完单模型/.test(x.raw)),
    '纯引子句「好，说完单模型…我的用法是这样的」不再出卡',
  )
  ok(
    r.filter((x) => x.card).length <= Math.ceil(r.length * 0.8),
    `出卡密度受控：${r.filter((x) => x.card).length}/${r.length} 段`,
  )
}

console.log('\n【2】数据段必须出数据卡，且数值与实体绑定正确')
{
  const r = run(C1)
  const acc = r.find((x) => /正确率达到了92%/.test(x.raw))
  ok(acc?.card === 'compare-bars', '「混元4 92% vs GLM5.2 71%」出对比条', acc?.card)
  ok(
    acc?.params.leftLabel === '混元4' && acc?.params.rightLabel === 'GLM5.2',
    '对比条左右标签绑定到正确实体',
    JSON.stringify(acc?.params),
  )
  ok(
    acc?.params.leftValue === 92 && acc?.params.rightValue === 71,
    '对比条数值 = 各自 cue 里的真实数值（92 / 71）',
    `${acc?.params.leftValue} / ${acc?.params.rightValue}`,
  )

  const price = r.find((x) => /8毛钱/.test(x.raw))
  ok(price?.card === 'core-number-roller', '「豆包 8毛」出数字卡而非工具矩阵', price?.card)
  ok(
    price?.params.target === 8 && price?.params.suffix === '毛',
    '数字 = 8、单位 = 毛（不是凭空造的百分比）',
    JSON.stringify(price?.params),
  )
}

console.log('\n【3】不造数：百分比卡只接受真正的百分比数值')
{
  const r = run(C1)
  const bad = r.filter(
    (x) => (x.card === 'ring-card' || x.card === 'progress-bar') && /8毛钱/.test(x.raw),
  )
  ok(bad.length === 0, '「便宜了百分之六十」这种无数字表述不会让环形图把 8 毛显示成 8%')
}

console.log('\n【4】结构完整：步骤不被腰斩、清单内容不丢')
{
  const r1 = run(C1)
  const steps = r1.find((x) => /用豆包做润色和翻译/.test(x.raw))
  ok(steps?.card === 'steps-card', '「第一/二/三步」整段出步骤卡', steps?.card)
  const stepLines = String(steps?.params.steps ?? '').split('\n')
  ok(stepLines.length === 3, '步骤卡恰好 3 步（没把"总结"算成第 4 步）', `${stepLines.length} 步`)

  const end = r1[r1.length - 1]
  const sats = String(end.params.satellites ?? '')
  ok(
    /写代码用混元/.test(sats) && /读长文用Kimi/.test(sats),
    '收尾段保住了三句结论，没被一张 CTA 图标卡吃掉',
    sats,
  )

  const r2 = run(C2)
  const cls = r2.find((x) => /三类标签/.test(x.raw))
  ok(cls?.card === 'srcvid-classification-table', '「三类标签」出分类表', cls?.card)
  ok(
    /项目/.test(String(cls?.params.rows)) &&
      /领域/.test(String(cls?.params.rows)) &&
      /资源/.test(String(cls?.params.rows)),
    '分类表填的是真正的三类（项目/领域/资源），不是开头的整句',
    String(cls?.params.rows).replace(/\n/g, ' | '),
  )
}

console.log('\n【5】弱信号不得单独触发结构卡')
{
  // "接着/然后/最后/所以" 是口语高频词，不能因为它们就出步骤卡/观点卡
  const r1 = run(C1)
  const longwen = r1.find((x) => /接着我们看长文理解/.test(x.raw))
  ok(longwen?.card !== 'steps-card', '「接着我们看长文理解」没有因为"接着"被当成步骤', longwen?.card)

  const r2 = run(C2)
  const kaiduan = r2[0]
  ok(
    kaiduan.card === 'srcvid-hero-title' || kaiduan.card === 'big-title',
    '开场出点题大标题',
    kaiduan.card,
  )
}

console.log('\n【6】卡型多样性：不要全片一个模子')
{
  for (const [name, p] of [
    ['语料1', C1],
    ['语料2', C2],
  ]) {
    const r = run(p).filter((x) => x.card)
    const kinds = new Set(r.map((x) => x.card))
    ok(
      kinds.size >= Math.min(4, Math.ceil(r.length * 0.6)),
      `${name}：${r.length} 张卡用了 ${kinds.size} 种卡型`,
      [...kinds].join(','),
    )
  }
}

console.log(`\n${'─'.repeat(60)}`)
console.log(fail === 0 ? `🎉 全部通过：${pass}/${pass + fail}` : `⚠️  ${pass} 通过，${fail} 失败`)
process.exit(fail === 0 ? 0 : 1)
