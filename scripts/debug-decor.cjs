const { chromium } = require('playwright')
const BASE = 'http://127.0.0.1:5173'

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const project = {
    name: 't', skin: 'dark', style: 'glass', font: 'sans', fps: 30, duration: 6, layout: 'edit',
    instances: [
      { id: 'i1', effectId: 'hf-number-counter', name: '数字计数器', start: 0, duration: 5, slot: 'center',
        params: { title: '累计用户数', targetValue: 1285000, prefix: '', suffix: '+', note: '突破百万', accent: '#FF5A36', background: '#12100E', foreground: '#F4EFE7', duration: 5 } },
    ],
  }
  await page.addInitScript((p) => { globalThis.__EXPORT_PROJECT = p; globalThis.__EXPORT_ALPHA = false }, project)
  await page.goto(BASE + '/?render=1', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.__render?.ready, { timeout: 15000 })
  await page.waitForTimeout(2500)
  const info = await page.evaluate(() => {
    const fs = document.querySelector('.os-fullscreen-instance')
    // 列出全屏层内所有直接子元素及带 os-card 的元素
    const direct = fs ? [...fs.children].map((c) => ({ cls: c.className, tag: c.tagName })) : []
    const withCard = fs ? [...fs.querySelectorAll('.os-card')].map((c) => ({ cls: c.className, tag: c.tagName })) : []
    // 计算 iframe 内模板是否自带卡片样式
    const iframe = fs?.querySelector('iframe')
    return { direct, withCard, iframeTag: iframe?.tagName }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
}
main().catch((e) => { console.error('FAIL:', e); process.exit(1) })
