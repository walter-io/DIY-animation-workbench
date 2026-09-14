const { chromium } = require('playwright')

const project = {
  name: 'preset-test', skin: 'dark', style: 'glass', font: 'sans',
  palette: { accent: '#5ac8fa', data: '#5ac8fa', special: '#ffd166' },
  cardOpacity: 0.65, fps: 30, duration: 20, layout: 'edit',
  presets: [],
  instances: [
    { id: 'p1', effectId: 'core-number-roller', name: '数字滚动', start: 0, duration: 10, slot: 'left', fit: 'auto', params: { label: '原始标签', target: 100, suffix: '', duration: 2, align: 'left', accent: '' } },
    { id: 'p2', effectId: 'core-number-roller', name: '数字滚动 2', start: 10, duration: 10, slot: 'left', fit: 'auto', params: { label: '另一张', target: 200, suffix: '', duration: 2, align: 'left', accent: '' } },
  ],
}

const readState = (page) => page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
  return {
    presets: (raw.presets ?? []).map((p) => ({ name: p.name, effectId: p.effectId, label: p.params.label, hasStyle: !!p.style })),
    instances: (raw.instances ?? []).map((i) => ({ id: i.id, label: i.params.label, w: i.w, cs: i.contentScale })),
  }
})

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  await page.goto('http://127.0.0.1:5190', { waitUntil: 'networkidle' })
  await page.evaluate((p) => {
    localStorage.removeItem('animation-editor-presets-v1')
    localStorage.setItem('animation-editor-project-v1', JSON.stringify(p))
  }, project)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // --- 1) 面板出现"预设"分区，且是空的
  const hasSection = await page.$$eval('.os-param-divider', (ns) => ns.some((n) => n.textContent.startsWith('预设')))
  console.log('1. 预设分区存在:', hasSection)

  // --- 2) 改参数后存预设
  await page.fill('.os-param-row textarea', '调好的标签')
  await page.waitForTimeout(300)
  await page.click('button:has-text("＋ 存当前为预设")')
  await page.waitForTimeout(250)
  await page.fill('.os-preset-draft input', '我的数字样式')
  await page.click('.os-preset-draft button:has-text("保存")')
  await page.waitForTimeout(400)
  let st = await readState(page)
  console.log('2. 存预设后:', JSON.stringify(st.presets))

  // --- 3) 改坏参数 → 应用预设 → 应恢复
  await page.fill('.os-param-row textarea', '被改坏了')
  await page.waitForTimeout(300)
  await page.click('.os-preset-item button:has-text("应用")')
  await page.waitForTimeout(400)
  st = await readState(page)
  console.log('3. 应用后 p1/p2 标签:', JSON.stringify(st.instances.map((i) => i.label)))

  // --- 4) "全部 N" 批量应用（应显示 全部2，两张都刷）
  const allBtn = await page.$('.os-preset-item button:has-text("全部")')
  const allTxt = allBtn ? (await allBtn.innerText()).trim() : '(无)'
  const allDisabled = allBtn ? await allBtn.isDisabled() : null
  console.log('4. 批量按钮:', allTxt, 'disabled=', allDisabled)

  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.os-param-row')]
    const row = rows.find((r) => r.textContent.includes('目标值') || r.querySelector('input[type=range]'))
    const input = row?.querySelector('input[type=range]')
    if (input) {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
      set.call(input, '9999')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await page.waitForTimeout(300)
  await page.fill('.os-param-row textarea', '批量标签')
  await page.waitForTimeout(300)
  await page.click('.os-preset-item button:has-text("全部")')
  await page.waitForTimeout(500)
  st = await readState(page)
  console.log('   批量应用后两张卡:', JSON.stringify(st.instances.map((i) => i.label)))

  // --- 5) 改名
  await page.dblclick('.os-preset-name')
  await page.waitForTimeout(200)
  await page.fill('.os-preset-name-input', '改过的名字')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  st = await readState(page)
  console.log('5. 改名后:', JSON.stringify(st.presets.map((p) => p.name)))

  // --- 6) 预设确实在 project JSON 里（导出会带走）
  const inProjectJson = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('animation-editor-project-v1') || '{}')
    return Object.prototype.hasOwnProperty.call(raw, 'presets') && raw.presets.length === 1
  })
  console.log('6. presets 写入工程 JSON:', inProjectJson)

  await page.screenshot({ path: 'preset-panel.png', clip: { x: 1390, y: 0, width: 290, height: 950 } })

  // --- 7) 删除
  await page.click('.os-preset-item .os-preset-act-x')
  await page.waitForTimeout(400)
  st = await readState(page)
  console.log('7. 删除后剩:', st.presets.length)

  console.log('errors:', errors.slice(0, 5))
  await browser.close()
})()
