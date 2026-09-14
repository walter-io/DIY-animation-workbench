const { chromium } = require('playwright')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })

  await page.goto('http://127.0.0.1:5190/', { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.removeItem('animation-editor-project-v1')
    localStorage.removeItem('animation-editor-presets-v1')
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  // --- 1) 出镜下拉面板 ---
  await page.click('button:has-text("出镜")')
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'ui-1-host-picker.png', clip: { x: 1100, y: 0, width: 580, height: 700 } })
  await page.keyboard.press('Escape')

  // --- 2) 导入口播稿弹窗（含匹配预览）---
  const SRT = `1
00:00:00,000 --> 00:00:03,000
嗯 大家好 欢迎来到本期节目

2
00:00:03,000 --> 00:00:07,000
今天我们来聊一聊 个人IP内容工程 这件事

3
00:00:07,000 --> 00:00:11,000
就是说 为什么大部分人 做不出稳定的内容输出

4
00:00:11,000 --> 00:00:15,000
第一类 是有专业能力和观点 但是没办法稳定输出的人

5
00:00:15,000 --> 00:00:19,000
第二类 是已经在做个人IP 但是每条内容都要从头开始的人

6
00:00:19,000 --> 00:00:23,000
第三类 是有产品有业务 希望通过内容建立信任的人

7
00:00:23,000 --> 00:00:27,000
我们做了一个对比 传统方式 一条内容要花6个小时

8
00:00:27,000 --> 00:00:31,000
用内容工程的方式 只要1.5个小时 效率提升了4倍

9
00:00:31,000 --> 00:00:35,000
我们的内容转化率 从原来的8% 提升到了23%

10
00:00:35,000 --> 00:00:39,000
具体怎么做呢 第一步 先把你的方法论沉淀成模板

11
00:00:39,000 --> 00:00:43,000
第二步 把模板变成可以复用的生产流程

12
00:00:43,000 --> 00:00:47,000
第三步 用工具把流程固化下来 持续迭代

13
00:00:47,000 --> 00:00:51,000
所以结论很简单 内容不是创作问题 而是工程问题

14
00:00:51,000 --> 00:00:55,000
很多人以为 做内容是拼灵感 其实不是这样的

15
00:00:55,000 --> 00:00:59,000
排行榜上 前三名分别是 数码区 知识区 和 生活区

16
00:00:59,000 --> 00:01:03,000
嗯 那么以上就是本期全部内容 记得点赞关注收藏

17
00:01:03,000 --> 00:01:07,000
我们下期再见 拜拜
`
  await page.click('button:has-text("导入口播稿")')
  await page.waitForTimeout(400)
  await page.fill('.os-srt-textarea', SRT)
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'ui-2-srt-preview.png', clip: { x: 350, y: 80, width: 980, height: 750 } })

  await browser.close()
})()
