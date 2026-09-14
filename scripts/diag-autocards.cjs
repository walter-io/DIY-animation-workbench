/* eslint-disable no-console */
/**
 * 自动选卡诊断器（纯 Node，不需要浏览器）。
 * 编译 src/{autoCards,script,srt,types}.ts → .ac-out，直接跑真实算法。
 *
 * 用法：
 *   npx tsc -p tsconfig.autocards.json
 *   node scripts/diag-autocards.cjs [srtPath]
 */
const fs = require('fs')
const path = require('path')

const OUT = path.resolve(__dirname, '../.ac-out')
if (!fs.existsSync(path.join(OUT, 'autoCards.js'))) {
  console.error('缺少编译产物，请先跑：npx tsc -p tsconfig.autocards.json')
  process.exit(1)
}
const { chunkCues, suggestCardsForChunks } = require(path.join(OUT, 'autoCards.js'))
const { parseSrt } = require(path.join(OUT, 'srt.js'))

const file = process.argv[2] || path.resolve(__dirname, '_tmp/test-corpus.srt')
const cues = parseSrt(fs.readFileSync(file, 'utf8'))
const chunks = chunkCues(cues)
const suggestions = suggestCardsForChunks(chunks)

const mmss = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const clean = (s, n) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').replace(/[\n]+/g, ' / ').trim()
  return t.length <= n ? t : t.slice(0, n - 1) + '…'
}

console.log(`字幕：${path.basename(file)}   共 ${cues.length} 条 cue → 切成 ${chunks.length} 段 → 出 ${suggestions.filter(Boolean).length} 张卡\n`)
console.log('─'.repeat(118))
console.log(
  '#   时间        时长   卡型                     原文（取前 46 字）                              卡内文案',
)
console.log('─'.repeat(118))

const counts = {}
suggestions.forEach((s, i) => {
  const chunk = chunks[i]
  const start = chunk[0].start / 1000
  const end = chunk[chunk.length - 1].end / 1000
  const raw = chunk.map((c) => c.text).join('')
  if (s) counts[s.effectId] = (counts[s.effectId] ?? 0) + 1
  const body = s
    ? Object.entries(s.params)
        .filter(([, v]) => typeof v === 'string' && v)
        .map(([k, v]) => `${k}=${clean(v, 34)}`)
        .join('  ')
    : '（跳过）'
  console.log(
    `${String(i + 1).padStart(2)}  ${mmss(start)}   ${(end - start).toFixed(1).padStart(4)}s  ` +
      `${clean(s ? `${s.name}` : '—', 12).padEnd(22)}  ` +
      `${clean(raw, 46).padEnd(48)}  ${clean(body, 60)}`,
  )
})
console.log('─'.repeat(118))
console.log('\n卡型分布：')
Object.entries(counts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(`  ${k.padEnd(34)} ${v}`))
