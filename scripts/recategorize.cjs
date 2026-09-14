/**
 * 一次性迁移：动效库重新分类 + 源视频复刻卡重命名。
 *
 * 旧分类混了"内容类型"和"来源"（数据/文字/信息/段落/叠加/源视频复刻/插件），
 * 源视频卡统一顶着"源视频·xxx"前缀、且挤在一个 17 项的大类里，很难找。
 *
 * 新分类按"在成片里承担的作用"划分：
 *   开场 / 金句 / 数据 / 对比 / 流程 / 关系 / 列表 / 人物 / 贴片 / 结尾 / 字幕 / 装饰 / 大屏模板
 *
 * 用法: node scripts/recategorize.cjs
 *
 * ⚠️ 本脚本已执行完毕，下面的 MAP 分类值已与 src/registry.ts 现状同步（再跑不会改变结果）。
 * 现在的分类唯一真相源是 src/effectCategories.ts（CATEGORY_ORDER / EffectCategory），
 * 卡片文件也已按分类分目录放在 src/cards/<分类>/ 下；要改分类请直接改 registry.ts。
 */
const fs = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '../src/registry.ts')

/** effectId → { name?, category? } */
const MAP = {
  // ===== 开场：点题、立住主题 =====
  'big-title': { category: '开场' },
  'section-header': { category: '开场' },
  'show-bracket': { category: '贴片' },
  'srcvid-hero-title': { name: '开场霓虹主标题', category: '开场' },

  // ===== 强调：一句话 / 一个词的强打 =====
  'golden-reveal': { category: '金句' },
  'quote-card': { category: '金句' },
  'label-row': { category: '列表' },
  'srcvid-keyword-pop': { name: '关键词弹跳高亮', category: '金句' },
  'srcvid-negation-badge': { name: '否定徽章强调', category: '金句' },
  'srcvid-statement-card': { name: '金句观点卡', category: '金句' },
  'srcvid-comparison-lines': { name: '反差对比双行', category: '对比' },
  'srcvid-concept-trio': { name: '概念对比三卡', category: '对比' },

  // ===== 文字：段落、清单、表格 =====
  'bullet-list': { category: '列表' },
  'two-col': { category: '对比' },
  'info-board': { category: '列表' },
  'timeline-card': { category: '流程' },
  'steps-card': { category: '流程' },
  'chapter-roadmap': { category: '流程' },
  'compare-table': { category: '对比' },
  'command-card': { category: '贴片' },
  'srcvid-classification-table': { name: '人群分类表', category: '列表' },

  // ===== 数据：数字、图表、进度（保持原分类） =====
  // ===== 结构：流程、关系、链路 =====
  'concept-map': { category: '关系' },
  'tool-crossout': { category: '对比' },
  'srcvid-three-pipeline': { name: '三段生产链', category: '流程' },
  'srcvid-flow-arrow': { name: '流程箭头串联', category: '流程' },
  'srcvid-circular-relation': { name: '环形关系图', category: '关系' },
  'srcvid-consumption-chain': { name: '想法消耗链路', category: '流程' },
  'srcvid-numbered-roadmap': { name: '底部编号路线', category: '流程' },

  // ===== 人物：人、分工、设备 =====
  'srcvid-human-ai-diagram': { name: '人机分工对照图', category: '人物' },
  'srcvid-profile-card': { name: '人物画像卡', category: '人物' },
  'srcvid-phone-mockup': { name: '手机竖屏预览', category: '贴片' },

  // ===== 结尾：收尾、总结、CTA =====
  'cta-card': { category: '结尾' },
  'srcvid-end-cta': { name: '结尾三连引导', category: '结尾' },
  'srcvid-ip-circle': { name: 'IP 圆环总结', category: '结尾' },

  // ===== 装饰：纯氛围动效 =====
  'logo-orbiter': { category: '关系' },
  'logo-sphere': { category: '关系' },
  'orbit-core': { category: '关系' },

  // ===== 字幕 =====
  'srt-subtitle': { category: '字幕' },
}

let src = fs.readFileSync(FILE, 'utf8')
let changed = 0
let missing = []

for (const [id, patch] of Object.entries(MAP)) {
  // 匹配 id -> name -> category 三行，按需要替换 name / category
  const re = new RegExp(
    "(id: '" + id.replace(/[-]/g, '\\-') + "',\\n(\\s+)name: ')([^']*)(',\\n\\s+category: ')([^']*)(')",
  )
  const m = re.exec(src)
  if (!m) {
    missing.push(id)
    continue
  }
  const nextName = patch.name ?? m[3]
  const nextCat = patch.category ?? m[5]
  src = src.replace(re, `$1${nextName}$4${nextCat}$6`)
  changed++
}

fs.writeFileSync(FILE, src)
console.log('renamed/recategorized:', changed)
if (missing.length) console.warn('NOT FOUND:', missing.join(', '))
