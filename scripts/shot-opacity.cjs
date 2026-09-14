const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto('http://127.0.0.1:5181', { waitUntil: 'networkidle' })
  const project = {
    name: 'op', skin: 'dark', style: 'glass', font: 'sans',
    palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
    cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit',
    instances: [
      { id: 'o1', effectId: 'section-header', name: '段头', start: 0, duration: 20, slot: 'center', fit: 'box', free: true, x: 540, y: 380, w: 840, h: 320, params: { num: '01', title: '第一部分', subtitle: '本段讲什么是真正重要', accent: '' } },
    ],
  }
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // 推到 2s，让动画显示
  await page.evaluate(() => {
    const ruler = document.querySelector('.os-ruler')
    if (ruler) {
      const r = ruler.getBoundingClientRect()
      ruler.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + (2/20)*r.width, clientY: r.top + 5 }))
    }
  })
  await page.waitForTimeout(400)

  // 60% 透明度
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const row = rows.find((r) => r.textContent.includes('背景透明度'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '0.6')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'opacity-60.png' })

  // 15% 透明度（几乎全透明）
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const row = rows.find((r) => r.textContent.includes('背景透明度'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '0.15')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'opacity-15.png' })

  // 100% 透明度（实心）
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const row = rows.find((r) => r.textContent.includes('背景透明度'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      setter.call(input, '1')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'opacity-100.png' })

  // 读取参数面板的 文字
  const labels = await page.evaluate(() => {
    const row = [...document.querySelectorAll('.os-param-row')].find((r) => r.textContent.includes('背景透明度'))
    return row ? row.innerText : '?'
  })
  console.log('opacity row text:', labels.replace(/\n/g, ' | '))
  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()
