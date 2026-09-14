/** 诊断：不同尺寸模式下，卡内文字相对外框是否居中 */
const path = require('path')
const { chromium } = require('playwright')
const { spawn } = require('child_process')

const PORT = 5196
;(async () => {
  const root = path.resolve(__dirname, '..')
  const srv = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: root, stdio: 'ignore', shell: true,
  })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) break } catch {}
    await wait(500)
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1500, height: 950 } })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  await wait(1000)
  // 清空，只留一张卡
  await page.evaluate(() => {
    const k = 'animation-editor-project-v1'
    const p = JSON.parse(localStorage.getItem(k) || '{}')
    p.instances = []
    localStorage.setItem(k, JSON.stringify(p))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await wait(900)
  const item = await page.$('.os-lib-item')
  if (item) await item.click()
  await wait(1000)

  async function pickFit(name) {
    return page.evaluate((n) => {
      const b = [...document.querySelectorAll('.os-seg-fit .os-seg-btn')].find((x) => x.textContent.trim() === n)
      if (!b) return false
      b.click()
      return true
    }, name)
  }

  const measure = () =>
    page.evaluate(() => {
      const inst = document.querySelector('.os-inst')
      if (!inst) return null
      const ir = inst.getBoundingClientRect()
      // 找第一个含可见文字的叶子元素
      const walker = document.createTreeWalker(inst, NodeFilter.SHOW_ELEMENT)
      let el = null
      while (walker.nextNode()) {
        const e = walker.currentNode
        if (e.children.length === 0 && (e.textContent || '').trim()) { el = e; break }
      }
      if (!el) return { noText: true }
      const tr = el.getBoundingClientRect()
      const body = inst.querySelector('.os-inst-body')
      const br = body ? body.getBoundingClientRect() : null
      return {
        fit: inst.className,
        instW: Math.round(ir.width), instH: Math.round(ir.height),
        textCX: Math.round(tr.left + tr.width / 2 - ir.left),
        textCY: Math.round(tr.top + tr.height / 2 - ir.top),
        offX: Math.round(tr.left + tr.width / 2 - (ir.left + ir.width / 2)),
        offY: Math.round(tr.top + tr.height / 2 - (ir.top + ir.height / 2)),
        bodyW: br ? Math.round(br.width) : null,
        bodyH: br ? Math.round(br.height) : null,
        text: (el.textContent || '').trim().slice(0, 20),
      }
    })

  for (const name of ['内容自适应', '铺满画布', '左侧半屏', '右侧半屏']) {
    const ok = await pickFit(name)
    await wait(800)
    const m = await measure()
    if (!m) { console.log(name, '测量失败'); continue }
    if (m.noText) { console.log(name, '没有找到文字元素'); continue }
    console.log(
      `${name.padEnd(6)} 外框 ${m.instW}x${m.instH} | body ${m.bodyW}x${m.bodyH} | ` +
      `文字中心相对外框中心 偏移 (${m.offX}, ${m.offY}) | 文字"${m.text}"`
    )
  }

  await page.screenshot({ path: path.join(root, 'scripts/_tmp/text-pos-righthalf.png') })
  await browser.close()
  srv.kill('SIGTERM')
})()
