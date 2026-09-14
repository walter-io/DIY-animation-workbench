const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const project = {
  name: 'hf-test', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
  instances: [{ id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
    params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万里程碑', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 } }],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('IFRAME', m.type(), m.text().slice(0, 200)) })

  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(2500)

  const frame = page.frames().find((f) => f !== page.mainFrame())
  // 检查模板脚本读到的 targetValue 和 counter 对象
  const diag = await frame.evaluate(() => {
    const v = window.__hyperframes?.getVariables ? window.__hyperframes.getVariables() : null
    const valueEl = document.getElementById('value')
    const tl = window.__timelines?.main
    let counterInfo = 'n/a'
    // gsap tweens 内幕：检查 tl 的 children
    if (tl && tl.getChildren) {
      const children = tl.getChildren().map((c) => ({ type: c.constructor?.name, target: c.targets?.(false)?.length }))
      counterInfo = JSON.stringify(children)
    }
    return { vars: v, valueText: valueEl?.textContent, counterInfo, tlExists: !!tl }
  })
  console.log('DIAG:', JSON.stringify(diag, null, 2))

  // 手动触发一次 onUpdate 等价操作：把数字强制设置
  await frame.evaluate(() => {
    const valueEl = document.getElementById('value')
    valueEl.textContent = '1,285,000'
  })
  await page.waitForTimeout(200)
  console.log('after manual set:', await frame.evaluate(() => document.getElementById('value')?.textContent))

  // 播放试试（progress 0.5 → 让 timeline 播放）
  await frame.evaluate(() => {
    const tl = window.__timelines.main
    tl.paused(false)
    tl.progress(0.3)
  })
  await page.waitForTimeout(500)
  console.log('after play progress(0.3):', await frame.evaluate(() => document.getElementById('value')?.textContent))

  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })
