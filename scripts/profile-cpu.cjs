/**
 * CPU profile：播放 3 秒，按函数自耗时聚合，定位每帧时间花在哪。
 * 用法：先起 `npx vite --port 5192`，再 node scripts/profile-cpu.cjs
 */
const { chromium } = require('playwright')

const project = {
  name: 'perf', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1 },
  hostClips: [], cardOpacity: 0.65, fps: 30, duration: 60, layout: 'edit', presets: [],
  instances: [
    { id: 'p1', effectId: 'bullet-list', name: '要点清单卡', start: 0, duration: 60, slot: 'left', fit: 'auto', params: { title: '标题', items: '一\n二\n三', accent: '', showRank: true } },
    { id: 'p2', effectId: 'compare-bars', name: '对比卡', start: 0, duration: 60, slot: 'right', fit: 'auto', params: { title: '对比', items: 'A:30\nB:70', accent: '' } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  await page.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)

  const client = await page.context().newCDPSession(page)
  await client.send('Profiler.enable')
  await client.send('Profiler.setSamplingInterval', { interval: 200 })
  await client.send('Profiler.start')

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.os-transport button')].find((b) => /播放|暂停/.test(b.textContent || ''))
    btn && btn.click()
  })
  await page.waitForTimeout(3000)

  const { profile } = await client.send('Profiler.stop')

  // 聚合自耗时
  const byId = new Map()
  for (const n of profile.nodes) byId.set(n.id, n)
  const self = new Map()
  const total = profile.samples.length
  for (const id of profile.samples) {
    const n = byId.get(id)
    if (!n) continue
    const f = n.callFrame
    const key = `${f.functionName || '(anonymous)'}  @${(f.url || '').split('/').slice(-1)[0]}:${f.lineNumber}`
    self.set(key, (self.get(key) || 0) + 1)
  }
  const durMs = (profile.endTime - profile.startTime) / 1000
  const rows = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 22)

  console.log(`采样总时长 ${durMs.toFixed(0)}ms，样本 ${total} 个\n`)
  console.log('自耗时占比   函数')
  console.log('----------   ----')
  for (const [k, v] of rows) {
    const pct = (v / total) * 100
    if (pct < 0.4) break
    console.log(`${pct.toFixed(1).padStart(6)}%   ${k}`)
  }
  await browser.close()
})()
