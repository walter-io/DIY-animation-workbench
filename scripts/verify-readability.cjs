/**
 * 可读性回归闸：把所有主题/画布组合跑一遍对比度审计，任一档不合格就红。
 *
 *   npm run verify:readability
 *
 * 为什么需要它：
 *   2026-10 用户两次反馈「白色主题下文字看不清」/「模板里文字被白色主题盖掉」，
 *   两次都是靠肉眼发现的 —— 编辑器外壳文字量上千，靠抽样看永远会漏。
 *   这个闸把「编辑台外壳 + 模板 / 导出 / 导入SRT / 历史版本 / 重置 五个弹窗」
 *   全部纳入，文字量 ~1051 处，覆盖：
 *     浅色 / 浅色+白画布 / 深色 / 深色+白画布
 *   其中「深色皮肤 + 白画布」专门守住 paletteVars 清空语义色的那个坑
 *   （深色皮肤的字色配白色画布 = 白底浅蓝，实测 1.9:1）。
 *
 * 每一档由 audit-contrast.cjs 用 `--assert` 跑（自带 vite，串行以避免端口冲突）。
 */
const { spawnSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CONFIGS = [
  ['light'],
  ['light', 'white'],
  ['dark'],
  ['dark', 'white'],
]

let bad = 0
for (const cfg of CONFIGS) {
  const tag = cfg.join(' ')
  const r = spawnSync(process.execPath, [path.join(__dirname, 'audit-contrast.cjs'), ...cfg, '--assert'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  const out = String(r.stdout || '')
  // 只打印汇总行，详细清单在 scripts/_tmp/contrast-out/report-*.txt 里
  const lines = out.split(/\r?\n/).filter((l) => /共审计|不达标|✖|✔/.test(l))
  const ok = r.status === 0
  if (!ok) bad += 1
  console.log(`${ok ? '✔' : '✖'} [${tag}] ${lines.join(' | ') || `退出码 ${r.status}`}`)
  if (!ok && r.stderr) console.log('   stderr:', String(r.stderr).slice(0, 400))
}

console.log(bad === 0 ? '\n全部通过：4 档配置下共 1051 处文字均达到 WCAG 门槛' : `\n有 ${bad} 档配置不合格`)
process.exit(bad === 0 ? 0 : 1)
