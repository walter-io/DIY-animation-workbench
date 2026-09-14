const { chromium } = require('playwright')

const project = {
  name: 'polish', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  host: {
    layout: 'off', x: 1384, y: 754, w: 480, h: 270,
    circular: false, radius: 24, focalX: 50, focalY: 50, zoom: 1, mirror: false,
    borderWidth: 4, borderColor: '#ffffff', shadow: true, opacity: 1,
  },
  hostClips: [], cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit', presets: [],
  instances: [
    { id: 'p1', effectId: 'bullet-list', name: '要点清单卡', start: 0, duration: 10, slot: 'left', fit: 'auto', params: { title: '标题', items: '一\n二\n三', accent: '', showRank: true } },
  ],
}

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5192/', { waitUntil: 'networkidle' })
  await page.evaluate((p) => localStorage.setItem('animation-editor-project-v1', JSON.stringify(p)), project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // ===== 3. 参考网格默认关闭 =====
  const grid = await page.evaluate(() => !!document.querySelector('.os-canvas-grid'))
  console.log('【3. 参考网格】默认显示 =', grid, '(应为 false)')
  const gridBtn = await page.$('button[title*="网格"], .os-dd-item:has-text("网格")')
  if (gridBtn) {
    const label = (await gridBtn.innerText()).trim()
    console.log('   顶栏开关文案 =', label)
  }

  // ===== 2. 参数面板里不应再有「预设」分区 =====
  const dividers = await page.$$eval('.os-param-divider', (ns) => ns.map((n) => n.textContent.trim()))
  console.log('\n【2. 预设】参数面板分区 =', JSON.stringify(dividers))
  console.log('   含「预设」=', dividers.some((d) => d.startsWith('预设')))

  // ===== 4. 自由定位用拨杆，不用复选框 =====
  const freeToggle = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.os-meta-cell, .os-meta-grid > label')]
    const cell = cells.find((c) => c.textContent.includes('自由定位'))
    if (!cell) return null
    return {
      hasSwitch: !!cell.querySelector('[role=switch]'),
      hasCheckbox: !!cell.querySelector('input[type=checkbox]'),
      ariaChecked: cell.querySelector('[role=switch]')?.getAttribute('aria-checked'),
    }
  })
  console.log('\n【4. 自由定位】', JSON.stringify(freeToggle))

  // 点一下拨杆，看是否生效
  const sw = await page.$('.os-meta-cell [role=switch]')
  if (sw) {
    await sw.click()
    await page.waitForTimeout(350)
    const after = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
      return raw.instances[0]?.free
    })
    console.log('   点拨杆后 instance.free =', after)
    await page.screenshot({ path: 'polish-panel.png', clip: { x: 1390, y: 0, width: 290, height: 950 } })
  }

  // ===== 1. 出镜设置在参数面板里直接改 =====
  await page.click('button:has-text("出镜")')
  await page.waitForTimeout(300)
  await page.setInputFiles('.os-dd-form input[type=file]', 'public/host-sample.mp4')
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  const hostSection = await page.evaluate(() => {
    const d = [...document.querySelectorAll('.os-param-divider')].map((n) => n.textContent.trim())
    return {
      dividers: d,
      hasHostPicker: !!document.querySelector('.os-panel-right .os-host-grid'),
      hasFocal: !!document.querySelector('.os-panel-right .os-focal-grid'),
      hasZoom: [...document.querySelectorAll('.os-panel-right label')].some((l) =>
        l.textContent.includes('画面放大'),
      ),
      switches: [...document.querySelectorAll('.os-panel-right .os-switch-label')].map((n) => n.textContent),
    }
  })
  console.log('\n【1. 出镜在参数面板】')
  console.log('   分区 =', JSON.stringify(hostSection.dividers))
  console.log('   布局选择器 =', hostSection.hasHostPicker, '| 焦点九宫格 =', hostSection.hasFocal, '| 放大滑杆 =', hostSection.hasZoom)
  console.log('   拨杆 =', JSON.stringify(hostSection.switches))

  // 直接在面板里改布局（不进顶栏）
  const order = ['不显示', '右下圆', '左下圆', '右下圆角卡', '左下圆角卡', '右侧半屏', '左侧半屏', '底部横条', '全屏垫底', '自定义']
  const panelBtns = await page.$$('.os-panel-right .os-host-opt')
  await panelBtns[order.indexOf('右侧半屏')].click()
  await page.waitForTimeout(400)
  // 直接在面板里改焦点
  const panelCells = await page.$$('.os-panel-right .os-focal-cell')
  await panelCells[5].click() // "右"
  await page.waitForTimeout(400)
  // 直接在面板里拨镜像
  await page.click('.os-panel-right .os-switch:has-text("左右镜像") [role=switch]')
  await page.waitForTimeout(400)

  const result = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    const v = document.querySelector('.os-host video')
    return {
      layout: raw.host.layout,
      focalX: raw.host.focalX,
      focalY: raw.host.focalY,
      mirror: raw.host.mirror,
      objPos: v ? getComputedStyle(v).objectPosition : null,
      vTransform: v ? getComputedStyle(v).transform : null,
    }
  })
  console.log('   面板内直接改后 →', JSON.stringify(result))

  await page.screenshot({ path: 'polish-host.png', clip: { x: 1390, y: 0, width: 290, height: 950 } })

  console.log('\nerrors:', errors.slice(0, 5))
  await browser.close()
})()
