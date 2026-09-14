/* eslint-disable no-console */
/**
 * 自动匹配「方案A」验证：在页面里通过 vite 动态 import 真实源码模块
 * （src/srt.ts + src/autoCards.ts），跑分段 + 选卡 + 造数检查。
 * 自包含 spawn vite，跑完 kill。
 *
 * 用法：node scripts/verify-autocards2.cjs
 */
const { spawn } = require('child_process')
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PORT = process.env.PORT || '5191'
const BASE = `http://localhost:${PORT}/`
const SRT_FILE = process.env.SRT || 'E:/AI/自媒体创作/2026-09-04/字幕.srt'

async function waitHttp(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('vite 未在 ' + timeoutMs + 'ms 内就绪')
}

const mmss = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
const clean = (s, n = 60) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\u200b-\u200f\u2028-\u202f\u00ad\ufeff]/g, '')
    .trim()
  return t.length <= n ? t : t.slice(0, n - 1) + '…'
}

;(async () => {
  const srt = fs.readFileSync(SRT_FILE, 'utf8')

  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], {
    cwd: ROOT,
    shell: false,
  })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  try {
    await waitHttp(BASE)
  } catch (e) {
    vite.kill()
    console.error('❌ vite 启动失败：\n' + viteLog)
    throw e
  }

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })

    const res = await page.evaluate(async (text) => {
      const srtMod = await import('/src/srt.ts')
      const auto = await import('/src/autoCards.ts')
      const cues = srtMod.parseSrt(text)
      const chunks = auto.chunkCues(cues)
      const sugg = auto.suggestCardsForChunks(chunks)
      return {
        cueCount: cues.length,
        chunks: chunks.map((c) => ({
          start: c[0].start / 1000,
          end: c[c.length - 1].end / 1000,
          n: c.length,
          text: c.map((x) => x.text).join(' '),
        })),
        cards: sugg.map((s) => (s ? { effectId: s.effectId, name: s.name, role: s.role, params: s.params } : null)),
        metricSamples: ['混元4', 'GLM5.2', 'Kimi K3', 'deepseek v4 flash', '9月10号', '9月底', '5v turbo', '占比 68%', '增长 32%'].map(
          (s) => [s, auto.metricNumbers(s)],
        ),
      }
    }, srt)

    console.log('字幕句数 =', res.cueCount, '｜ 分段数 =', res.chunks.length)

    console.log('\n=== 指标过滤自检（型号/日期应被剔除）===')
    for (const [s, out] of res.metricSamples) {
      console.log('  ' + JSON.stringify(s).padEnd(24) + ' -> metrics=' + JSON.stringify(out))
    }

    const durs = res.chunks.map((c) => c.end - c.start)
    console.log('\n=== 语义分段 ===')
    console.log('  段时长 min=' + Math.min(...durs).toFixed(1) + 's max=' + Math.max(...durs).toFixed(1) + 's avg=' + (durs.reduce((a, b) => a + b, 0) / durs.length).toFixed(1) + 's')
    console.log('  每段句数 = ' + res.chunks.map((c) => c.n).join(','))

    console.log('\n=== 选卡结果 ===')
    const byType = {}
    res.cards.forEach((s, i) => {
      if (!s) return
      byType[s.effectId] = (byType[s.effectId] ?? 0) + 1
      const c = res.chunks[i]
      const keys = Object.entries(s.params)
        .filter(([, v]) => v !== '' && v !== 0)
        .slice(0, 3)
        .map(([k, v]) => `${k}=${clean(String(v), 32)}`)
        .join(' | ')
      console.log(`${String(i + 1).padStart(2)} ${mmss(c.start)}–${mmss(c.end)} (${(c.end - c.start).toFixed(1)}s) [${s.role}] ${s.name} (${s.effectId})`)
      console.log('     字幕: ' + clean(c.text, 68))
      console.log('     参数: ' + keys)
    })
    console.log('\n=== 卡型分布 ===')
    console.log('  ' + Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join('  '))

    console.log('\n=== 造数检查（数字必须能在该段字幕里找到）===')
    // 动效控制类参数（时长/半径/高亮序号…）不是画面上的数据，不参与校验
    const NON_DATA_NUMERIC =
      /^(activeIndex|dimAt|duration|size|radius|orbitDuration|spinDuration|totalSec|activeSec|cols|tiltX|enterSpeed|contentScale|count)$/
    let bad = 0
    res.cards.forEach((s, i) => {
      if (!s) return
      const srcNums = (res.chunks[i].text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
      for (const [k, v] of Object.entries(s.params)) {
        if (NON_DATA_NUMERIC.test(k)) continue
        if (typeof v === 'number' && v > 0 && !srcNums.some((n) => Math.abs(n - v) < 0.01)) {
          console.log(`  ⚠ #${i + 1} ${s.effectId}.${k}=${v} 无来源`)
          bad++
        }
      }
    })
    console.log(bad === 0 ? '  ✅ 无造数' : `  ❌ ${bad} 处造数`)
  } finally {
    try {
      await browser.close()
    } catch {
      /* ignore */
    }
    vite.kill()
  }
})().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
