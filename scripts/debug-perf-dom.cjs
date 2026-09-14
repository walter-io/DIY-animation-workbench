const { chromium } = require('playwright')

const project = {
  name: 'perf', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: { layout: 'off', x: 1384, y: 754, w: 480, h: 270, circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false, borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1 },
  hostClips: [], cardOpacity: 0.65, fps: 30, duration: 30, layout: 'edit', presets: [],
  instances: [
    { id: 'p1', effectId: 'bullet-list', name: '要点清单卡', start: 0, duration: 30, slot: 'left', fit: 'auto', params: { title: '标题', items: '一\n二\n三', accent: '', showRank: true } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
  await page.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)

  const info = await page.evaluate(() => {
    const classes = new Set()
    document.querySelectorAll('.os-panel-left *').forEach((el) => {
      if (el.className && typeof el.className === 'string') {
        el.className.split(/\s+/).forEach((c) => c && classes.add(c))
      }
    })
    const buttons = [...document.querySelectorAll('button')].slice(0, 25).map((b) => ({
      title: b.title, aria: b.getAttribute('aria-label'), text: (b.textContent || '').trim().slice(0, 12),
    }))
    return {
      leftPanelClasses: [...classes].filter((c) => /preview|lib|card/.test(c)).slice(0, 40),
      previewEls: document.querySelectorAll('[class*="preview"]').length,
      canvasSpec: document.querySelector('.os-canvas-spec')?.textContent ?? 'NOT FOUND',
      buttons,
    }
  })
  console.log(JSON.stringify(info, null, 2))
  await browser.close()
})()
