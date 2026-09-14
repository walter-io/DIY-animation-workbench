const { chromium } = require('playwright')

const project = {
  name: 'scroll', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit',
  instances: Array.from({ length: 8 }, (_, i) => ({
    id: 's' + i, effectId: 'core-number-roller', name: '卡' + i,
    start: i * 2, duration: 3, slot: i % 2 ? 'right' : 'left', fit: 'auto',
    params: { label: 'L' + i, target: 1000, suffix: '', duration: 2, align: 'left', accent: '' },
  })),
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  await page.goto('http://127.0.0.1:5183', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  const probe = () => page.evaluate(() => {
    const layout = document.querySelector('.os-tracks-layout')
    const rows = document.querySelector('.os-track-rows')
    const labels = document.querySelector('.os-track-labels')
    const tracks = document.querySelector('.os-tracks')
    if (!layout) return null
    return {
      layoutClientH: layout.clientHeight,
      layoutScrollH: layout.scrollHeight,
      layoutClientW: layout.clientWidth,
      layoutScrollW: layout.scrollWidth,
      vScroll: layout.scrollHeight > layout.clientHeight,
      hScroll: layout.scrollWidth > layout.clientWidth,
      rowsH: rows ? Math.round(rows.getBoundingClientRect().height) : null,
      labelsH: labels ? Math.round(labels.getBoundingClientRect().height) : null,
      tracksH: tracks ? Math.round(tracks.getBoundingClientRect().height) : null,
    }
  })

  console.log('default:', JSON.stringify(await probe()))

  for (const target of [200, 300, 420]) {
    await page.evaluate((h) => {
      const rz = document.querySelector('.os-timeline-resizer')
      const r = rz.getBoundingClientRect()
      const opts = { bubbles: true, clientX: r.left + 40, clientY: r.top + 4 }
      rz.dispatchEvent(new PointerEvent('pointerdown', opts))
      window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: r.left + 40, clientY: r.top + 4 - h }))
      window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    }, target)
    await page.waitForTimeout(350)
    console.log('after +' + target + ':', JSON.stringify(await probe()))
  }

  await browser.close()
})()
