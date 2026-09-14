/**
 * 一次性迁移脚本：把卡片里 `params.accent` + alpha 十六进制后缀的写法
 * 换成 ACCENT / accentAlpha()，让所有卡统一跟随工程主题色。
 *
 *   const accent = String(params.accent ?? '#00FFC8')   →  const accent = ACCENT
 *   `${accent}99`                                       →  `${accentAlpha(0.6)}`
 *   `1px solid ${accent}4D`                             →  `1px solid ${accentAlpha(0.3)}`
 *
 * 用法: node scripts/migrate-accent.cjs
 */
const fs = require('fs')
const path = require('path')

const dir = path.resolve(__dirname, '../src/cards')
let changed = 0

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.tsx')) continue
  const full = path.join(dir, file)
  let src = fs.readFileSync(full, 'utf8')
  const before = src

  // 1) 声明行：const accent = String(params.accent ?? '#XXXXXX')
  src = src.replace(
    /const accent = String\(params\.accent \?\? '[^']*'\)/g,
    'const accent = ACCENT',
  )

  // 2) ${accent} 后跟 2 位十六进制 → accentAlpha(0.xx)
  src = src.replace(/\$\{accent\}([0-9a-fA-F]{2})\b/g, (_m, hex) => {
    const pct = Math.round((parseInt(hex, 16) / 255) * 100) / 100
    return '${accentAlpha(' + pct + ')}'
  })

  if (src === before) continue

  // 3) 补 import
  if (!/from '\.\.\/accent'/.test(src)) {
    const rel = path.relative(path.dirname(full), path.resolve(__dirname, '../src/accent')).replace(/\\/g, '/')
    src = src.replace(
      /^(import[^\n]*\n)/,
      `$1import { ACCENT, accentAlpha } from '${rel.startsWith('.') ? rel : './' + rel}'\n`,
    )
  }

  fs.writeFileSync(full, src)
  changed++
  console.log('migrated', file)
}

console.log('done, files changed:', changed)
