/* 复现/验证：修改“清单核对”内容后，卡片是否突然放大。
 * 记录修改前/后卡片容器、iframe transform、模板面板包围盒。 */
const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'
const STORAGE_KEY = 'animation-editor-project-v1'

const project = {
  name: 'checklist-content-test',
  skin: 'dark',
  style: 'glass',
  font: 'sans',
  cardOpacity: 0.65,
  fps: 30,
  duration: 12,
  layout: 'edit',
  instances: [
    {
      id: 'i1',
      effectId: 'hf-checklist-pop',
      name: '清单核对',
      start: 0,
      duration: 5,
      slot: 'center',
      params: {
        title: '上线前检查',
        item1: '默认文案能直接生成视频',
        item2: '透明 MOV 可以叠到剪辑里',
        item3: '模板能通过修改数据复用',
        accent: '#FF5A36',
        foreground: '#F4EFE7',
      },
    },
  ],
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console.error: ' + m.text())
  })

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value))
    },
    { key: STORAGE_KEY, value: project },
  )
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.os-slot iframe', { timeout: 15000 })
  await page.waitForFunction(() => {
    const frame = document.querySelector('.os-slot iframe')
    return !!frame && frame.contentWindow && frame.contentDocument
  })
  await page.waitForTimeout(2500)

  const diagnostics = await page.evaluate(() => {
    const iframe = document.querySelector('.os-slot iframe')
    const inner = iframe && iframe.contentWindow
    const bridge = iframe ? iframe.getAttribute('srcdoc') : ''
    return {
      bridgeHasFrameSel: bridge.includes('frameSel'),
      bridgeHasFrameRect: bridge.includes('frameRect'),
      bridgeSnippet: bridge ? bridge.slice(bridge.indexOf('applyContentFit'), bridge.indexOf('applyContentFit') + 900) : '',
      innerZoom: inner && inner.__hfContentFit,
      innerRootTransform: inner && inner.document.getElementById('root') ? inner.document.getElementById('root').style.transform : '',
      parentFrameRectSeen: window.__frameRectSeen || null,
    }
  })
  console.log('DIAG:', JSON.stringify(diagnostics))

  const snapshot = async () => {
    const card = await page.evaluate(() => {
      const canvas = document.querySelector('.os-canvas')
      const slot = canvas ? canvas.querySelector('.os-slot') : null
      const el = slot ? slot.querySelector('.os-card') : null
      const iframe = canvas ? canvas.querySelector('iframe') : null
      const cr = canvas ? canvas.getBoundingClientRect() : null
      const sr = slot ? slot.getBoundingClientRect() : null
      const r = el ? el.getBoundingClientRect() : null
      const ir = iframe ? iframe.getBoundingClientRect() : null
      return {
        canvas: cr ? { w: Math.round(cr.width), h: Math.round(cr.height) } : null,
        slot: sr ? { w: Math.round(sr.width), h: Math.round(sr.height) } : null,
        slotStyle: slot ? slot.getAttribute('style') : null,
        slotClass: slot ? slot.className : null,
        cardClass: el ? el.className : null,
        cardRect: r ? { w: Math.round(r.width), h: Math.round(r.height) } : null,
        iframeRect: ir ? { w: Math.round(ir.width), h: Math.round(ir.height) } : null,
        iframeTransform: iframe ? iframe.style.transform : null,
        canvasFrames: canvas ? canvas.querySelectorAll('iframe').length : 0,
        htmlClasses: document.querySelector('.os-main')?.className ?? null,
      }
    })
    const frame = page.frames().find((f) => f !== page.mainFrame())
    const inner = frame
      ? await frame.evaluate(() => {
          const panel = document.querySelector('.panel')
          const root = document.getElementById('root')
          const pr = panel?.getBoundingClientRect()
          const rr = root?.getBoundingClientRect()
          return {
            root: { w: Math.round(rr?.width || 0), h: Math.round(rr?.height || 0) },
            panel: {
              x: Math.round(pr?.x || 0),
              y: Math.round(pr?.y || 0),
              w: Math.round(pr?.width || 0),
              h: Math.round(pr?.height || 0),
            },
            rootTransform: root?.style.transform || '',
            fitZoom: window.__hfContentFit || 1,
          }
        })
      : null
    return { card, inner }
  }

  const before = await snapshot()
  console.log('BEFORE:', JSON.stringify(before))

  const idx = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.os-panel-right .os-param-row'))
    return rows.findIndex((r) => r.querySelector('label')?.textContent?.includes('清单三'))
  })
  console.log('item3 row index:', idx)
  if (idx >= 0) {
    const rows = await page.$$('.os-panel-right .os-param-row')
    const ta = await rows[idx].$('textarea')
    if (ta) {
      await ta.fill(
        '这是一段非常长的清单内容，用来检查修改内容后卡片会不会突然被放大，包含很多很多字，让文本换行，进一步观察画面比例变化。',
      )
      await page.waitForTimeout(2500)
    }
  }

  const after = await snapshot()
  console.log('AFTER:', JSON.stringify(after))

  await page.screenshot({ path: 'E:/AI/tools/animation-controller/_reverse_tmp/checklist-content.png' })
  if (errors.length) {
    console.log('--- errors ---')
    errors.slice(0, 8).forEach((e) => console.log(e))
  } else {
    console.log('NO page errors')
  }
  await browser.close()
}

main().catch((e) => {
  console.error('FAIL:', e)
  process.exit(1)
})
