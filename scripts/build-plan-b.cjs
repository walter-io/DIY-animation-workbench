/* eslint-disable no-console */
/**
 * 方案B（AI 编排）：直接读懂字幕内容，按视频真实结构手工配卡。
 *
 * 与方案A的区别：不做关键词打分，而是按"这期视频在讲什么"来设计——
 *   每张卡选什么卡型、放什么文案，都对应口播里的一个完整语义段。
 * 产出：B-工程.json（可直接载入工作台）+ 渲染截图 + 匹配清单 + 双按钮 loader。
 *
 * 用法：node scripts/build-plan-b.cjs
 */
const { spawn } = require('child_process')
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const PORT = process.env.PORT || '5188'
const BASE = `http://localhost:${PORT}/`
const SRT_FILE = 'E:/AI/自媒体创作/2026-09-04/字幕.srt'
const OUT_DIR = 'E:/AI/自媒体创作/2026-09-04'
const A_JSON = path.join(OUT_DIR, 'A-自动匹配-工程.json')
const B_JSON = path.join(OUT_DIR, 'B-AI编排-工程.json')
const LOADER = path.join(ROOT, 'public', 'load-matched.html')

async function waitHttp(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.status === 200) return
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('vite 未就绪')
}

/* ---------- SRT 解析（与 src/srt.ts 同口径） ---------- */
function timeToMs(t) {
  const m = /(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})/.exec(t)
  if (!m) return 0
  return Number(m[1]) * 3600000 + Number(m[2]) * 60000 + Number(m[3]) * 1000 + Number(m[4].padEnd(3, '0'))
}
function parseSrt(raw) {
  const cues = []
  for (const block of raw.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) continue
    const tl = lines.find((l) => l.includes('-->'))
    if (!tl) continue
    const [a, b] = tl.split('-->').map((s) => s.trim())
    const start = timeToMs(a)
    const end = timeToMs(b)
    if (end <= start) continue
    const text = lines.slice(lines.indexOf(tl) + 1).join('\n').trim()
    if (!text) continue
    cues.push({ index: Number(lines[0]) || cues.length + 1, start, end, text })
  }
  return cues
}

/* ---------- 方案B卡片表：cues 为 1-based 字幕序号（含头含尾） ---------- */
const PLAN = [
  { cues: [1, 3], effect: 'srcvid-hero-title', name: '开场主标题', fit: 'full', slot: 'center', p: { title: '这么多大模型该怎么选择', subtitle: '为什么没有豆包和千问' } },
  { cues: [4, 9], effect: 'srcvid-profile-card', name: '混元4 画像', p: { title: '混元4 preview', items: '前端能力非常强\n预览版已超出预期\n跻身国内第一梯队' } },
  { cues: [10, 14], effect: 'srcvid-keyword-pop', name: '免费时间点', p: { text: '9月10号前都免费' } },
  { cues: [15, 19], effect: 'info-board', name: '混元3 信息板', p: { title: '混元3', rows: '定位,日常办公好用之选\n免费,9月底前\n位置,deepseek v4 flash 之下' } },
  { cues: [20, 27], effect: 'srcvid-statement-card', name: 'GLM5.3 定位', p: { text: '复杂任务直接上 GLM5.3：国内最强推理 没有之一' } },
  { cues: [28, 34], effect: 'srcvid-comparison-lines', name: 'GLM5.2 反差', p: { line1: '即便 GLM5.3 没出来', line2: 'GLM5.2 依然吊打其他推理模型' } },
  { cues: [35, 37], effect: 'golden-reveal', name: '使用原则', p: { tag: '使用原则', lines: '优先 GLM5.2 / GLM5.3\n前提：积分足够\nWorkBuddy 积分倍率较高' } },
  { cues: [38, 42], effect: 'label-row', name: 'GLM5.3 flash 标签', p: { labels: 'GLM5.3 flash\n视觉编程\n识别图片\n视觉任务' } },
  { cues: [43, 45], effect: 'tool-crossout', name: '5v turbo 被替代', p: { title: '视觉模型选谁', subtitle: '有了新版就不用旧的', oldTools: 'GLM 5v turbo', altTitle: '直接用', newTools: 'GLM5.3 flash' } },
  { cues: [46, 49], effect: 'srcvid-negation-badge', name: 'minimax 不考虑', p: { text: 'minimax m3 半年没更新' } },
  { cues: [50, 57], effect: 'two-col', name: '混元4 vs Kimi K3', p: { leftTitle: '混元4', rightTitle: 'Kimi K3', left: '前端能力更强一点点', right: '处理长任务\n科研推理更强' } },
  { cues: [58, 62], effect: 'tool-crossout', name: 'Kimi 旧款淘汰', p: { title: '上一代不用考虑', subtitle: '能力不算突出', oldTools: 'kimi k2.7 code\nkimi k2.6', altTitle: '直接用', newTools: 'kimi k3' } },
  { cues: [63, 66], effect: 'info-board', name: 'deepseek flash 信息板', p: { title: 'deepseek v4 flash', rows: '性价比,高\n官方涨价,倍率没变\n适合,积分不多' } },
  { cues: [67, 71], effect: 'srcvid-flow-arrow', name: '处理不了就升级', p: { nodes: '混元3,deepseek v4 flash,deepseek v4 pro' } },
  { cues: [72, 78], effect: 'section-header', name: '章节·文本任务', fit: 'full', slot: 'center', p: { num: '01', title: '文本任务怎么选', subtitle: '图片 / 设计稿 / 视频除外' } },
  { cues: [79, 86], effect: 'srcvid-numbered-roadmap', name: '文本任务排名', p: { items: '01|GLM5.3\n02|GLM5.2\n03|混元4 preview\n04|deepseek v4 pro\n05|deepseek v4 flash\n06|混元3' } },
  { cues: [87, 92], effect: 'srcvid-numbered-roadmap', name: '视觉任务排名', p: { items: '01|Kimi K3\n02|GLM5.3 flash\n03|混元3' } },
  { cues: [93, 98], effect: 'srcvid-statement-card', name: '混元4 为何没进排名', p: { text: '混元4 没进排名：官方定义纯文本模型' } },
  { cues: [99, 101], effect: 'golden-reveal', name: '真实排名', p: { tag: '真实排名', lines: 'Kimi K3\n混元4 preview\nGLM5.3 flash\n按这个排名处理任务' } },
  { cues: [102, 103], effect: 'srcvid-keyword-pop', name: '免费原则', p: { text: '能用免费的就用免费的' } },
  { cues: [104, 111], effect: 'srcvid-statement-card', name: '豆包去哪了', p: { text: '豆包：只有字节自己能用（火山引擎）' } },
  { cues: [112, 115], effect: 'srcvid-end-cta', name: '结尾三连', fit: 'full', slot: 'center', p: { name: '就是这么简单的道理', icons: '赞,评,藏' } },
]

;(async () => {
  const srt = fs.readFileSync(SRT_FILE, 'utf8')
  const cues = parseSrt(srt)
  if (cues.length !== 115) console.log('⚠ 字幕句数 =', cues.length, '（预期 115）')
  const byIdx = new Map(cues.map((c) => [c.index, c]))

  const base = JSON.parse(fs.readFileSync(A_JSON, 'utf8'))
  const subtitles = base.instances.filter((i) => i.effectId === 'srt-subtitle')

  let n = 0
  const cards = PLAN.map((item) => {
    const first = byIdx.get(item.cues[0])
    const last = byIdx.get(item.cues[1])
    if (!first || !last) throw new Error('cue 序号越界: ' + JSON.stringify(item.cues))
    n += 1
    const start = first.start / 1000
    const end = last.end / 1000
    const sourceQuote = cues
      .filter((c) => c.index >= item.cues[0] && c.index <= item.cues[1])
      .map((c) => c.text)
      .join(' ')
      .slice(0, 500)
    return {
      id: 'planb_' + String(n).padStart(2, '0'),
      effectId: item.effect,
      name: `${item.name}`,
      start,
      duration: Math.max(2, end - start),
      slot: item.slot ?? (n % 2 === 0 ? 'left' : 'right'),
      fit: item.fit ?? 'auto',
      paint: [],
      params: { ...item.p },
      director: {
        sourceQuote,
        intent: `${item.name}：按该段口播语义手工配卡（方案B）`,
        requiredInformation: ['该段字幕中的关键信息'],
        forbiddenInformation: ['口播未出现的数字、英文标签、模板编号'],
      },
    }
  })

  const project = { ...base, instances: [...subtitles, ...cards] }
  fs.writeFileSync(B_JSON, JSON.stringify(project, null, 2))
  console.log('💾 B 工程 → ' + B_JSON + '（字幕 ' + subtitles.length + ' + 手工卡 ' + cards.length + '）')

  // 起 dev server 渲染截图
  const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', PORT, '--strictPort'], { cwd: ROOT, shell: false })
  let viteLog = ''
  vite.stdout.on('data', (d) => (viteLog += d.toString()))
  vite.stderr.on('data', (d) => (viteLog += d.toString()))
  try {
    await waitHttp(BASE)
  } catch {
    vite.kill()
    throw new Error('vite 启动失败:\n' + viteLog)
  }
  const browser = await chromium.launch()
  try {
    const rp = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await rp.addInitScript((p) => {
      globalThis.__EXPORT_PROJECT = p
      globalThis.__EXPORT_ALPHA = false
    }, project)
    await rp.goto(BASE + '?render=1', { waitUntil: 'domcontentloaded' })
    await rp.waitForFunction(() => {
      const r = globalThis.__render
      return r && r.ready
    }, { timeout: 30000 })
    await rp.evaluate(() => globalThis.document.fonts.ready)

    // 渲染 6 张代表性卡
    const picks = [0, 1, 8, 11, 14, 15, 21].filter((i) => i < cards.length)
    for (const i of picks) {
      const c = cards[i]
      // 取卡片时长的 60%：列表类卡的子项是依次入场，太早截会拍到半成品
      const t = c.start + c.duration * 0.6
      await rp.evaluate(
        (tt) =>
          new Promise((res) => {
            globalThis.__render.seek(tt)
            requestAnimationFrame(() => requestAnimationFrame(() => res()))
          }),
        t,
      )
      await rp.waitForTimeout(130)
      const file = path.join(OUT_DIR, `B-AI编排-卡${String(i + 1).padStart(2, '0')}-${c.name}.png`)
      await rp.locator('.os-canvas').screenshot({ path: file }).catch(() => {})
      console.log('📸 ' + c.name + ' @' + t.toFixed(1) + 's')
    }

    // 工作台全景：把 B 工程写进 localStorage 后刷新，截图时间轴（与方案A对比用）
    const wp = await browser.newPage({ viewport: { width: 1760, height: 1080 } })
    await wp.goto(BASE, { waitUntil: 'domcontentloaded' })
    await wp.evaluate((json) => localStorage.setItem('animation-editor-project-v1', json), JSON.stringify(project))
    await wp.reload({ waitUntil: 'domcontentloaded' })
    await wp.locator('.os-topbar').waitFor({ state: 'visible', timeout: 30000 })
    await wp.waitForTimeout(900)
    const wbShot = path.join(OUT_DIR, 'B-AI编排-工作台.png')
    await wp.screenshot({ path: wbShot })
    console.log('📸 B 工作台截图 → ' + wbShot)

    // 匹配清单
    const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`
    const clean = (s, n2 = 60) => {
      const t = String(s ?? '').replace(/\s+/g, ' ').replace(/[\u200b-\u200f\u2028-\u202f\u00ad\ufeff]/g, '').trim()
      return t.length <= n2 ? t : t.slice(0, n2 - 1) + '…'
    }
    const md = [
      '# B-AI编排：字幕 → 动效卡 匹配清单',
      '',
      '- 22 个语义段，16 种卡型；每张卡对应口播的一个完整语义段（不打分，直接按内容设计）',
      '- 字幕卡 ' + subtitles.length + ' 张（与方案A相同，来自同一次字幕导入）',
      '',
      '| # | 时间段 | 卡名 | 卡型 | 关键文案 |',
      '|---|--------|------|------|----------|',
    ]
    cards.forEach((c, i) => {
      const keys = Object.entries(c.params)
        .filter(([, v]) => v !== '')
        .slice(0, 2)
        .map(([k, v]) => `${k}=${clean(String(v), 40)}`)
        .join(' | ')
      md.push(`| ${i + 1} | ${mmss(c.start)}–${mmss(c.start + c.duration)} | ${c.name} | ${c.effectId} | ${keys} |`)
    })
    fs.writeFileSync(path.join(OUT_DIR, 'B-AI编排-匹配清单.md'), md.join('\n'))
    console.log('📄 B 清单已写')

    // 双按钮 loader（A / B）
    const aMin = JSON.stringify(base)
    const bMin = JSON.stringify(project)
    const html = [
      "<!doctype html><html lang='zh-CN'><head><meta charset='utf-8'>",
      '<title>载入动效卡工程 · 动效编辑台</title>',
      "<meta name='viewport' content='width=device-width,initial-scale=1'>",
      "<style>html,body{margin:0;height:100%;background:#0b0b0d;color:#eaeaea;font:14px/1.6 -apple-system,'PingFang SC',sans-serif}",
      ".box{max-width:600px;margin:10vh auto;padding:28px;border:1px solid #2a2a2e;border-radius:14px;background:#15151a}",
      'h1{font-size:20px;margin:0 0 6px}p{margin:6px 0;color:#a0a0a4}',
      "button{appearance:none;border:0;cursor:pointer;color:#fff;font-size:15px;padding:11px 18px;border-radius:9px;margin:14px 8px 0 0;font-weight:600}",
      '.a{background:#3478f6}.b{background:#9a6cf0}.a:hover{background:#4690ff}.b:hover{background:#ab85f5}',
      ".ok{color:#7be28b}.err{color:#ff6e6e}.small{font-size:12px;color:#6e6e72}</style></head>",
      "<body><div class='box'><h1>📥 载入动效卡工程</h1>",
      '<p>同一份字幕（115 句）两种配卡方案，选一个载入编辑台：</p>',
      "<p><b style='color:#7fb2ff'>方案A · 自动匹配</b>：优化后的打分算法，31 张卡，13 种卡型（语义信号门控 + 指标过滤 + 停顿分段）</p>",
      "<p><b style='color:#c3a6ff'>方案B · AI 编排</b>：按视频内容手工设计，22 张卡，16 种卡型（每段一个完整语义、卡型贴合内容）</p>",
      "<p class='small'>前提：动效编辑台 dev server 正在运行，本页从同一 origin 打开。</p>",
      "<button class='a' id='la'>载入方案A</button>",
      "<button class='b' id='lb'>载入方案B</button>",
      "<p id='msg' class='small'></p>",
      '<script>window.__A=' + aMin + ';window.__B=' + bMin + ';',
      "function load(p){try{localStorage.setItem('animation-editor-project-v1',JSON.stringify(p));var m=document.getElementById('msg');m.className='ok small';m.textContent='✓ 已写入，即将跳转…';setTimeout(function(){location.href='./'},250)}catch(e){var m=document.getElementById('msg');m.className='err small';m.textContent='✗ '+e.message}}",
      "document.getElementById('la').onclick=function(){load(window.__A)};document.getElementById('lb').onclick=function(){load(window.__B)}<\/script>",
      '</div></body></html>',
    ].join('')
    fs.writeFileSync(LOADER, html)
    console.log('📄 双方案 loader → ' + LOADER + '（' + Math.round(html.length / 1024) + 'KB）')
  } finally {
    try {
      await browser.close()
    } catch {
      /* ignore */
    }
    vite.kill()
  }
  console.log('\ndone ✅')
})().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
