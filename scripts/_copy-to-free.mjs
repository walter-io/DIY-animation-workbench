/**
 * 把 pro 版源码复制成一个「免费版」目录。
 *
 * 刻意不用 fs.cpSync —— 本机 Node 22 上它在中文路径上会把进程直接打崩
 * （0xC0000409，无异常无输出），所以这里用 readdirSync + copyFileSync 手写递归。
 *
 * 排除项：产物 / 依赖 / 版本库 / 临时目录 / 已被清理隔离的垃圾目录。
 *   node_modules、dist          体积大且可重装 -> 不拷
 *   .git                        免费版目录已有自己的空仓库 -> 不覆盖
 *   .workbuddy                  会话与记忆，属 pro 自己的工作痕迹 -> 不拷
 *   .cleanup-quarantine         历史清理隔离区 -> 不拷
 *   .verify-build-out           验证产物 -> 不拷
 *   .cptest / .copytest 之类    测试残留 -> 不拷
 */
import fs from 'node:fs'
import path from 'node:path'

const SRC = process.argv[2]
const DST = process.argv[3]
if (!SRC || !DST) {
  console.error('usage: node copy-to-free.mjs <src> <dst>')
  process.exit(1)
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.workbuddy',
  '.cleanup-quarantine',
  '.verify-build-out',
  '.cptest',
  '.copytest',
  '.verify-out',
])
const EXCLUDE_FILES = new Set(['.vite-out.txt'])

const OUT = path.join(process.env.TEMP ?? '/tmp', 'copy-free.txt')
const lines = []
const log = (s) => {
  lines.push(s)
  fs.writeFileSync(OUT, lines.join('\n'), 'utf8')
}

let fileCount = 0
let dirCount = 0
const copied = []
const skipped = []

function copyDir(from, to, rel = '') {
  fs.mkdirSync(to, { recursive: true })
  dirCount++
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const relChild = rel ? rel + '/' + ent.name : ent.name
    const s = path.join(from, ent.name)
    const d = path.join(to, ent.name)
    if (ent.isDirectory()) {
      if (EXCLUDE_DIRS.has(ent.name)) {
        skipped.push(relChild + '/')
        continue
      }
      copyDir(s, d, relChild)
    } else if (ent.isFile()) {
      if (EXCLUDE_FILES.has(ent.name)) {
        skipped.push(relChild)
        continue
      }
      fs.copyFileSync(s, d)
      fileCount++
      if (copied.length < 40) copied.push(relChild)
    } else {
      skipped.push(relChild + ' (非普通文件)')
    }
  }
}

log('SRC = ' + SRC)
log('DST = ' + DST)
copyDir(SRC, DST)

log('--- 顶层（源） ---')
for (const e of fs.readdirSync(SRC, { withFileTypes: true })) {
  log('  ' + e.name + (e.isDirectory() ? '/' : ''))
}
log('--- 已排除 ---')
log(skipped.join('\n') || '(none)')
log('--- 结果 ---')
log('dirs = ' + dirCount + ', files = ' + fileCount)
log('--- 目标顶层 ---')
for (const e of fs.readdirSync(DST, { withFileTypes: true })) {
  log('  ' + e.name + (e.isDirectory() ? '/' : ''))
}
log('DONE')
