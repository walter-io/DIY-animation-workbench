const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5183', { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.removeItem('animation-editor-project-v1'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  // 抓分类结构 + 轨道滚动条状态
  const cats = await page.$$eval('.os-lib-cat', (nodes) =>
    nodes.map((n) => n.innerText.replace(/\n/g, ' ')),
  )
  console.log('categories:\n  ' + cats.join('\n  '))

  const scroll = await page.evaluate(() => {
    const l = document.querySelector('.os-tracks-layout')
    return l
      ? {
          clientH: l.clientHeight, scrollH: l.scrollHeight,
          clientW: l.clientWidth, scrollW: l.scrollWidth,
          vScroll: l.scrollHeight > l.clientHeight,
          hScroll: l.scrollWidth > l.clientWidth,
        }
      : null
  })
  console.log('track scroll:', JSON.stringify(scroll))

  await page.screenshot({ path: 'lib-1-overview.png' })

  // 展开"开场"和"强调"看看命名
  await page.screenshot({ path: 'lib-2-top.png', clip: { x: 0, y: 0, width: 340, height: 950 } })

  // 拉高轨道再确认没有滚动条
  const rz = await page.$('.os-timeline-resizer')
  const rb = await rz.boundingBox()
  await page.mouse.move(rb.x + 60, rb.y + 4)
  await page.mouse.down()
  await page.mouse.move(rb.x + 60, rb.y - 120, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const scroll2 = await page.evaluate(() => {
    const l = document.querySelector('.os-tracks-layout')
    return { vScroll: l.scrollHeight > l.clientHeight, hScroll: l.scrollWidth > l.clientWidth }
  })
  console.log('track scroll (tall):', JSON.stringify(scroll2))
  await page.screenshot({ path: 'lib-3-track.png', clip: { x: 0, y: 600, width: 1680, height: 350 } })

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()
