/**
 * 一次性迁移：把源视频卡的 description 从"复刻源视频里的某某效果"
 * 改成"这张卡能干什么"。原来那批文案是逆向工程时的内部记录，
 * 对用户没有任何意义（他们不知道"源视频"是哪一条）。
 */
const fs = require('fs')
const path = require('path')

const FILE = path.resolve(__dirname, '../src/registry.ts')

const DESCRIPTIONS = {
  'srcvid-hero-title': '顶部居中霓虹大字 + 下划线擦入，开场第一眼把主题钉住。',
  'srcvid-keyword-pop': '描边发光徽章弹跳入场，把一句话里的关键词单独拎出来强调。',
  'srcvid-numbered-roadmap': '底部编号条依次滑入，用 01 / 02 罗列并列要点。',
  'srcvid-comparison-lines': '两行文字对比，第二行换强调色，一句话制造反差。',
  'srcvid-circular-relation': '中央圆 + 左右卫星 + 弧线连接，表达"这三者是同一件事"。',
  'srcvid-three-pipeline': '标题 + 三张卡横向排列，每张顶部高光条，讲清楚一条生产链。',
  'srcvid-flow-arrow': '横向节点 + 箭头依次点亮，表达前后承接关系。',
  'srcvid-negation-badge': '描边徽章缩放 + 抖动强调，用来否定一个常见误解。',
  'srcvid-statement-card': '居中大字观点卡 + 左右竖线，摆金句用。',
  'srcvid-human-ai-diagram': '左右两面板对照 + 中间箭头穿梭，讲明白"谁负责做什么"。',
  'srcvid-profile-card': '标题 + 子弹点列表逐条滑入，介绍一个人或一个定位。',
  'srcvid-phone-mockup': '竖向手机 / 社媒帖子从左侧滑入，展示成品画面。',
  'srcvid-consumption-chain': '标题 + 三节点横向流程，连线自左向右生长，讲成本消耗在哪。',
  'srcvid-classification-table': '逐行展开的表格：一列标签 + 一段描述，讲受众分类。',
  'srcvid-concept-trio': '标题 + 三张卡并排，中间那张高亮，做概念对比。',
  'srcvid-ip-circle': '中心圆 + 三个卫星标签，结尾做总结收束。',
  'srcvid-end-cta': '点赞 / 评论 / 收藏图标 + 频道名，结尾引导互动。',
}

let src = fs.readFileSync(FILE, 'utf8')
let changed = 0
const missing = []

for (const [id, desc] of Object.entries(DESCRIPTIONS)) {
  // 匹配 id -> ... -> description: '...'（description 在 id 之后、component 之前）
  const re = new RegExp(
    "(id: '" + id.replace(/-/g, '\\-') + "',[\\s\\S]{0,400}?description: ')([^']*)(')",
  )
  if (!re.test(src)) {
    missing.push(id)
    continue
  }
  src = src.replace(re, `$1${desc}$3`)
  changed++
}

fs.writeFileSync(FILE, src)
console.log('descriptions rewritten:', changed)
if (missing.length) console.warn('NOT FOUND:', missing.join(', '))
