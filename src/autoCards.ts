import type { SrtCue } from './srt'
import type { DirectorInfo } from './types'
import { cuesToPhrases, cuesToText, pickHeadline, clip, metricNumbers } from './script'
import { prefEffectRanking } from './prefs'

export type AutoCardSuggestion = {
  effectId: string
  name: string
  params: Record<string, string | number | boolean>
  /** 该段在成片里承担的作用（open 开场 / body 论述 / end 收尾） */
  role?: 'open' | 'body' | 'end'
  /** 来自哪个卡库：常规（叠加小卡）/ 解说（整页幻灯片） */
  lib?: AutoCardLib
  /** 导演信息：记录内容依据，供 lint 校验（数字必须来自字幕） */
  director: DirectorInfo
}

/**
 * 自动出卡用的卡库。
 *  - regular 常规库：贴在人像口播上的局部小卡，一页一条信息
 *  - explain 解说库：整页幻灯片（PPT 式），同一页要塞下更多同类信息
 */
export type AutoCardLib = 'regular' | 'explain'

/** 构造导演信息：必含 = 卡内出现的关键信息，禁含 = 口播没有的额外数字/标签 */
function makeDirector(
  cues: SrtCue[],
  params: Record<string, string | number | boolean>,
  intent: string,
): DirectorInfo {
  const sourceQuote = cues.map((c) => c.text).join(' ').slice(0, 500)
  const nums = sourceQuote.match(/\d+(?:\.\d+)?/g) ?? []
  const requiredInformation = [...new Set(nums.slice(0, 6))].map((n) => `数字 ${n}`)
  if (requiredInformation.length === 0) requiredInformation.push('核心信息（见口播）')
  const forbidden: string[] = []
  for (const [k, v] of Object.entries(params)) {
    // 动效参数（时长/半径/序号…）不是"画面上的数据"，不该被记成造数
    if (NON_DATA_NUMERIC.test(k)) continue
    if (typeof v === 'number' && v > 0 && !nums.some((n) => Math.abs(Number(n) - v) < 0.01)) {
      forbidden.push(`无来源数字 ${v}（字段 ${k}）`)
    }
  }
  if (forbidden.length === 0) forbidden.push('口播未出现的数字、英文标签、模板编号')
  return {
    sourceQuote,
    intent,
    requiredInformation,
    forbiddenInformation: forbidden.slice(0, 8),
  }
}

type Role = 'open' | 'body' | 'end'

/** 动效控制类数字参数：不是画面上的数据，不参与"数字必须来自口播"的校验 */
const NON_DATA_NUMERIC =
  /^(activeIndex|dimAt|duration|size|radius|orbitDuration|spinDuration|totalSec|activeSec|cols|tiltX|enterSpeed|contentScale|count)$/

/**
 * 指标数字的判定已下沉到 script.ts（标题打分也要用同一套口径）。
 * 这里转出一份，保持既有导入路径可用。
 */
export { metricNumbers } from './script'

/** 已知模型名白名单：中文名（豆包/千问）和已有英文名，优先匹配 */
const MODEL_RE =
  /(混元\s?\d(?:\.\d+)?|GLM\s?\d(?:\.\d+)?(?:\s?(?:flash|pro|turbo|preview))?|Kimi\s?K?\d(?:\.\d+)?(?:\s?code)?|DeepSeek\s?[vV]?\d(?:\.\d+)?(?:\s?(?:flash|pro))?|Minimax\s?M?\d?|豆包|千问|通义|文心)/gi

/**
 * 通用拉丁实体：口播里出现的英文 / 中英混排产品名。
 *
 * ⚠️ 白名单永远追不上新模型。真实语料里的 Remotion / Codex / Claude Code /
 * TRAE Work / CoClaw / CoPaw **一个都不在名单里** → 整段被判"没有工具" →
 * 工具矩阵卡 0 分 → 该段直接被跳过。这是"导入后一半内容没卡"的头号原因。
 * 所以名单只能当补充，主体必须靠结构识别：
 * 首字母大写或含数字的拉丁词，可跟 1 个后续词（Claude Code / TRAE Work），可带版本号。
 */
const LATIN_ENTITY =
  /\b[A-Za-z][A-Za-z0-9]*(?:[.\-][A-Za-z0-9]+)*(?:\s+[A-Z][A-Za-z0-9]+)?(?:\s?\d+(?:\.\d+)?)?/g

/** 口语里夹的普通英文词 / 缩写，不是产品名，别当成工具 */
const LATIN_STOP = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'are', 'but', 'not', 'all',
  'can', 'has', 'have', 'this', 'that', 'from', 'they', 'what', 'when',
  'will', 'more', 'like', 'just', 'get', 'use', 'using', 'used', 'new',
  'now', 'how', 'why', 'its', 'was', 'were', 'been', 'out', 'about',
  'code', 'text', 'file', 'data', 'make', 'made', 'want', 'need', 'help',
  'very', 'much', 'many', 'some', 'then', 'than', 'them', 'here', 'there',
])

/** 白名单匹配（数值绑定继续用它，避免拉丁词污染"谁=多少"的配对） */
function toolMentions(text: string): string[] {
  return uniqueMatches(text.match(MODEL_RE) ?? [])
}

/**
 * 段内出现的"实体"（工具 / 模型 / 产品）= 白名单 + 拉丁结构识别。
 * 用于判断"这段是不是在罗列工具"。
 */
function entityMentions(text: string): string[] {
  const named = uniqueMatches(text.match(MODEL_RE) ?? [])
  const latin: string[] = []
  for (const raw of text.match(LATIN_ENTITY) ?? []) {
    const t = raw.replace(/\s+/g, ' ').trim()
    // 太短（AI / VS / OK）或普通英文词 → 不算产品名
    if (t.length < 3) continue
    if (LATIN_STOP.has(t.toLowerCase())) continue
    if (/^\d/.test(t)) continue
    latin.push(t)
  }
  // 白名单优先，拉丁补充
  const seen = new Set(named.map((s) => s.toLowerCase()))
  for (const t of latin) {
    if (seen.has(t.toLowerCase())) continue
    // "GLM 5" 这种白名单已覆盖的片段，别重复算
    if (named.some((n) => n.toLowerCase().includes(t.toLowerCase()))) continue
    seen.add(t.toLowerCase())
    named.push(t)
  }
  return named
}

function uniqueMatches(found: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of found) {
    const t = raw.replace(/\s+/g, ' ').trim()
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/** 语义信号名 */
export type SignalName =
  | 'steps' | 'enum' | 'compare' | 'rank' | 'percent' | 'trend' | 'price'
  | 'conclusion' | 'cta' | 'classification' | 'concept' | 'relation'
  | 'negation' | 'replace' | 'recommend' | 'free'
  /**
   * 并列列举：「TRAE Work、CoClaw、CoPaw 全都能胜任」。
   * 口播列工具时几乎从不说"排名第一/对比一下"，全靠顿号（ASR 常写成逗号）串起来——
   * 没有这个信号，这类最该出工具矩阵的段会一个信号都命中不了。
   */
  | 'list'

/**
 * 强信号 = 口播里**显式**说出来的结构标记（"第一步"、"排名前三"、"便宜了60%"）。
 *
 * ⚠️ 这里刻意不含"然后 / 接着 / 最后 / 所以 / 其实 / 不是 / 适合"这类口语高频词。
 * 口播稿几乎每段都会飘过这些连接词，把它们当信号会导致"每段都命中每种卡"，
 * 最后谁分高谁赢、跟内容毫无关系——这是"匹配出来不对"的头号根因。
 * 这类词只放在下面的 WEAK 里，单独命中**不能**触发任何结构卡。
 */
const STRONG: Record<SignalName, RegExp> = {
  // 「环节」「先…再…最后」也是流程标记：口播讲流水线时常不说"第一步"
  steps:
    /第[一二三四五六]步|第一步|第二步|第三步|第四步|步骤是|流程是|分[三四五]步|环节|先[^。！？]{0,12}再[^。！？]{0,12}最后/,
  enum: /第[一二三四五六](?:个|件|项|点|条|句|种|类|步|块|部分)|[一二三四五六](?:句话|个点|个原因|个方法|个技巧|条建议|件事)|有以下|清单如下|排名前[一二三四五六]/,
  compare: /对比|相比|比起|而[^，。]{0,6}只有|[Vv][Ss]|高于|低于|超过|领先|不如|胜过|差距|前者|后者|最便宜|最贵|最强|最快|更[好强快便宜高省]|只有\s*\d/,
  rank: /排名|排行榜|TOP\s?\d|前三|前[一二三四]名|第[一二三四]名|名次|梯队|优先级/,
  percent: /百分之|\d+\s*%|\d+\s*成|占比|转化率|完成度|覆盖率/,
  // 注意：刻意不含"达到"和"\d+倍"——"达到了92%"是数据不是趋势，"是它的8倍"是对比不是趋势
  trend: /增长|提升|下降|降低|回落|突破|上涨|下跌|同比|环比|翻倍|创新高|越来越|逐年|持续(?:上升|走高|增加)/,
  price: /便宜|最贵|价格|报价|多少钱|块钱|毛钱|每百万|token|成本|花费|省钱|省下|预算/,
  conclusion: /结论|总结一下|总结一?下|记住|意味着|本质是|说到底|一句话|核心就|关键是|所以(?:我|你|建议|推荐)/,
  cta: /关注|点赞|收藏|转发|订阅|下期|三连|评论区|点个赞|记得/,
  classification: /[一二三四五六]类|[一二三四五六]种人|分成|分为|适合.*的(?:人|同学|朋友|场景)|这几类|人群/,
  concept: /是什么|什么叫|指的是|叫做|定义为|本质是|概念/,
  relation: /三者|这三者|同一件事|闭环|循环|互相|彼此|组合|搭配/,
  negation: /不是|并非|误区|没必要|不用(?:去)?(?:考虑|管)|用不着|看不到|找不到|没有.*(?:必要|意义)|别再/,
  replace: /替代|取代|换掉|可以换成|换成|没必要.*用/,
  recommend: /优先|推荐|建议|最好(?:用|选)|可以考虑|我建议/,
  free: /免费|不花钱|白嫖|不要钱/,
  // 至少 3 个分隔符、且分隔出的片都不长 → 是在数东西，不是在说长句。
  // 只放 1~2 个分隔符会误判中文分句（"动画,它们都是…"），所以门槛定在 3 个。
  list: /[、，,][^、，,。？！]{1,16}[、，,][^、，,。？！]{1,16}[、，,]/,
}

/** 弱信号：口语连接词/副词。只给已命中强信号的同类卡加小分，单独命中不触发任何卡。 */
const WEAK: Partial<Record<SignalName, RegExp>> = {
  steps: /接着|然后|接下来|之后/,
  enum: /分别|包括|以下|几种|几个|还有/,
  compare: /还是|哪个|这边|另一/,
  conclusion: /所以|实际上|其实|真正|重点|关键|核心/,
  negation: /不能|不要|错的|假的|其实不/,
  classification: /适合|这类|这种/,
  trend: /达到|变成了/,
}

/** 紧跟在数字后面的单位 */
const UNIT_AFTER_NUM =
  /^\s*(百分之|%|倍|万元|万|亿|元|块钱|块|毛|个|人|次|条|款|轮|分|秒|小时|天|年|名)/

/**
 * 实体-数值对：从**同一条 cue** 里抽出来的"谁 = 多少"。
 *
 * 为什么必须同 cue 配对：跨句乱配会造出灾难性的错卡。
 * 例："混元4正确率达到了92%" + "而GLM5.2只有71%"
 *   ├ 同 cue 配对 → 混元4=92、GLM5.2=71（正确的对比条）
 *   └ 跨句乱配   → 环形图标签填"而GLM5.2只有71%"、数值填 92（完全对不上）
 */
export type DataPair = { entity: string; value: number; unit: string }

function extractPairs(cues: SrtCue[]): DataPair[] {
  const out: DataPair[] = []
  const seen = new Set<string>()
  for (const cue of cues) {
    const nums = metricNumbers(cue.text)
    if (!nums.length) continue
    const v = nums[0]
    const idx = cue.text.indexOf(String(v))
    const rawUnit =
      idx >= 0 ? (cue.text.slice(idx + String(v).length).match(UNIT_AFTER_NUM)?.[1] ?? '') : ''
    const entity = toolMentions(cue.text)[0] ?? ''
    const key = `${entity}|${v}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ entity, value: v, unit: rawUnit === '百分之' ? '%' : rawUnit })
  }
  return out
}

/** 一段口播的特征：净化后的文案 + 分级语义信号 + 实体数值对 + 信息价值 */
type ChunkFeatures = {
  phrases: string[]
  text: string
  /** 全部数字 */
  nums: number[]
  /** 可当指标的数字（已剔除型号与日期） */
  metrics: number[]
  /** 实体-数值对（同 cue 绑定，不会跨句乱配） */
  pairs: DataPair[]
  /** 段内提到的大模型名 */
  tools: string[]
  headline: string
  role: Role
  /** 段序号（第几页），章节页用它当章号 */
  index: number
  /** 段时长（秒） */
  duration: number
  /** 强信号：显式结构标记，能独立触发结构卡 */
  strong: Set<SignalName>
  /** 弱信号：口语连接词，只加分 */
  weak: Set<SignalName>
  /**
   * 段内显式"第N步"标记的个数。
   *
   * ⚠️ 必须从**原始字幕**数，不能从 f.phrases 里筛。
   * cuesToPhrases 会把逗号切开，而"第一步"这种 3 字标记会在净化时被当碎片丢掉，
   * 从 phrases 里筛永远筛不到 —— 步骤卡会误判成"这一段没有步骤"。
   */
  steps: number
  /**
   * 段内的步骤名（"第N步"之后到第一个逗号为止）。
   * 直接抽好，不要让卡片自己从句子里挑 —— 见 stepTextsOf 的说明。
   */
  stepTexts: string[]
  /** 是否有某强信号 */
  has: (n: SignalName) => boolean
  /** 信息价值分：决定这一段**值不值得**出卡 */
  salience: number
  /**
   * 平均句长。口播稿的句子普遍很长（20+ 字），
   * 而数据类卡片（对比条 / 环形 / 趋势 / 排行）的标签位只有 6~10 字，
   * 塞进去必然被截断成"我们做了一个对…"这种残句，很难看。
   */
  avgLen: number
}

export function featuresOf(cues: SrtCue[], role: Role, index = 0): ChunkFeatures {
  const phrases = cuesToPhrases(cues)
  const text = cuesToText(cues) || cues.map((c) => c.text).join(' ')
  // 原始文本：保留标点。实体识别必须用原文——
  // cuesToText 会把顿号/逗号洗成空格，"Codex,Claude Code" 变成 "Codex Claude Code"，
  // 实体边界就丢了（会连成 "Codex Claude" 一个假名字）。
  const rawText = cues.map((c) => c.text).join(' ')
  const nums = (text.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
  const metrics = metricNumbers(text)
  const pairs = extractPairs(cues)
  // 工具矩阵用"实体识别"（白名单 + 拉丁结构），数值绑定仍用白名单，两者互不污染
  const tools = entityMentions(rawText)
  const avgLen = phrases.length
    ? Math.round(phrases.reduce((s, p) => s + p.length, 0) / phrases.length)
    : 0
  const duration = cues.length ? (cues[cues.length - 1].end - cues[0].start) / 1000 : 0

  // ⚠️ 信号判定必须用**原始字幕文本**，不能用净化后的 phrases。
  // cleanPhrases 会把 4 字以下的碎片丢掉，而"第一步""第二种"恰好只有 3 个字——
  // 用净化文本判定的话，一段明明白白的三步流程会检测不到 steps 信号，
  // 最后既出不了步骤卡、又因信息价值不足被整段跳过（内容凭空消失）。
  const strong = new Set<SignalName>()
  for (const key of Object.keys(STRONG) as SignalName[]) {
    if (STRONG[key].test(rawText)) strong.add(key)
  }
  const weak = new Set<SignalName>()
  for (const key of Object.keys(WEAK) as SignalName[]) {
    const re = WEAK[key]
    if (re && re.test(rawText)) weak.add(key)
  }
  // 两个以上不同实体各带一个数值 → 天然就是对照（"混元92%，GLM只有71%"）
  if (pairs.length >= 2 && new Set(pairs.map((p) => p.entity)).size >= 2) strong.add('compare')
  // 连着报了一串名次（"优先考虑A / 再考虑B / 再到C"）→ 这就是排名，
  // 哪怕整段里根本没出现"排名"两个字（视觉任务那段排名就没说，只说"优先考虑/再到"）。
  if (cues.filter((c) => isSeq(c.text)).length >= 2) strong.add('rank')
  // 段里出现 ≥2 个不同产品名 → 就是在罗列工具（比守分隔符正则可靠得多）。
  // 这一条必须补：ASR 常把顿号写成逗号甚至漏掉，"Codex，Claude Code，TRAE Work" 可能连分隔符都不规整。
  if (tools.length >= 2) strong.add('list')

  const f: ChunkFeatures = {
    phrases,
    text,
    nums,
    metrics,
    pairs,
    tools,
    headline: pickHeadline(phrases, phrases[0] ?? '本期要点'),
    role,
    index,
    steps: (rawText.match(/第[一二三四五六]步/g) ?? []).length,
    stepTexts: stepTextsOf(rawText),
    duration,
    strong,
    weak,
    has: (n: SignalName) => strong.has(n),
    salience: 0,
    avgLen,
  }
  f.salience = salienceOf(f)
  return f
}

/**
 * 信息价值分 —— "挑重点"的核心。
 *
 * 口播稿里超过一半的句子是过渡、铺垫、口语连接（"那么我们接着看"、"好，说完这个"）。
 * 这些段做成卡只会让画面变吵，观众也记不住。
 * 只有"有数据 / 有显式结构 / 提到具体对象"的段才配拥有卡片。
 */
/**
 * 哪些强信号能单独撑起一张卡。
 * relation（"搭配着用"）/ recommend / free 只是语气修饰，
 * 光凭它们出卡会给"好，说完这个，我们接着看"这类纯过渡句也配一张卡。
 */
const SALIENT_SIGNALS: ReadonlySet<SignalName> = new Set<SignalName>([
  'steps', 'enum', 'compare', 'rank', 'percent', 'trend', 'price',
  'conclusion', 'classification', 'concept', 'negation', 'replace', 'cta', 'recommend',
  // 'list' 必须算：口播列工具时往往只有并列、没有任何"排名/对比"字样，
  // 不算的话这类段永远卡在门控线下（真实语料里一段都出不来）。
  // ❌ 别顺手把 relation / free 也加进来：那两个词太容易在过渡句里飘过
  // （"再说一个关键的事…可以搭配着用"），会让纯引子句也出卡。
  'list',
])

export function salienceOf(f: ChunkFeatures): number {
  let s = 0
  if (f.pairs.length) s += 4 // 有真实数据 —— 最值得出卡
  if (f.pairs.length >= 2) s += 2 // 还有对照，更值得
  else if (f.metrics.length >= 2) s += 1
  if (f.tools.length) s += 1
  if ([...f.strong].some((n) => SALIENT_SIGNALS.has(n))) s += 3 // 有显式结构信号
  // 什么都没有：纯过渡句 / 口水话
  if (!f.strong.size && !f.pairs.length && !f.tools.length) s -= 5
  if (f.duration < 3.5) s -= 2
  if (f.phrases.length <= 1) s -= 1
  return s
}

/** 论述段低于这个分就不出卡（开场 / 收尾不受限，那两个位置本来就必须有画面） */
const SALIENCE_GATE = 3

/**
 * 解说档的门控线：比常规档低。
 * 常规卡是"贴在画面上的小卡"，少出几张只是画面安静一点；
 * 解说页是**整页幻灯片**，跳过一段就会让上一页一直挂着，观众盯着空页十几秒。
 * 所以宁可多出一页内容偏轻的「关键词页」，也不能留空。
 */
const SALIENCE_GATE_EXPLAIN = 1

/**
 * 挑最适合当"清单项"的短语。
 *
 * 关键：优先**并列的短词**（"项目 / 领域 / 资源"），而不是开头的几个整句。
 * 否则"我一般会用三类标签，项目、领域、资源"会被填成
 * "第一类|第二件事是标签 第二类|用井号就能标记"——把真正的三类全丢了。
 */
function listItems(f: ChunkFeatures, max = 4, len = 16): string[] {
  const content = contentPhrases(f, 8, len)
  const short = content.filter((p) => p.length <= 6)
  if (short.length >= 2) return short.slice(0, max)
  return content.slice(0, max)
}

/** 去掉"引导句"和"互动句"，只留真正的内容短语（供要点类卡片填内容） */
function contentPhrases(f: ChunkFeatures, max = 4, len = 18): string[] {
  // "说完/讲完/看完…" 是最常见的过渡句开头（"好，说完它能做什么，我们来看…"），
  // 不丢掉的话它会混进对比页左栏、还会被当成左栏标题。
  const DROP =
    /^(?:最后|那么|接着|接下来|然后|好|好吧|以上|觉得|记得|关注|点赞|收藏|转发|订阅|下期|我们|总结|总结一下|结论|记住|所以|其实|说完|讲完|看完|先说|但你注意|你注意|大家注意|这|那)/
  const kept = f.phrases.filter((p) => !DROP.test(p))
  return (kept.length ? kept : f.phrases).slice(0, max).map((p) => clip(p, len))
}

/**
 * 解说页的清单项：同一页要比常规卡多装一倍同类信息。
 *
 * 常规卡一页最多 3~4 条（`listItems` 默认 4），而解说页是整页幻灯片，
 * 清单页排版能放到 6 行、标签页 8 个 —— 所以这里不砍短语，先取够再筛。
 * 仍然优先并列短词（"项目 / 领域 / 资源"），短词不够才用整句，
 * 否则"我一般会用三类标签，项目、领域、资源"这种句子会把真正的三项挤掉。
 */
function exList(f: ChunkFeatures, max: number, len: number): string[] {
  const content = contentPhrases(f, max + 2, len)
  const short = content.filter((p) => p.length <= 8)
  const pick = short.length >= Math.min(3, max) ? short : content
  return pick.slice(0, max)
}

/**
 * 从"传统搜索是把已有的网页排个序丢给你"里取出栏目标题（"是"之前的 2~8 字）。
 * 对比页左右两栏需要两个并排的对象名，段里没有英文产品名时（纯中文概念对比），
 * 这是唯一可靠的取法 —— 否则只能填"以前 / 现在"这种占位文案。
 */
function subjectOf(phrase: string | undefined): string {
  const m = String(phrase ?? '').match(/^([^，。！？、]{2,8})是/)
  return m ? m[1] : ''
}

/** 名次标记：排名页的条目必须从这里取 */
const RANK_MARK = /第[一二三四五六](?:梯队|档|批|名)|优先考虑|优先使用|排名/

/**
 * 排名 / 梯队页的条目。
 *
 * ⚠️ 不能只取英文实体：口播里的名次常常挂在中文名上
 * （"第一梯队是混元四"），而实体识别只认识拉丁词 ——
 * 直接 `f.tools` 会让第一梯队凭空消失，只留下 Kimi K3、豆包两条。
 * 所以优先取**带名次标记的短句**（名次信息就在这几条里），
 * 没有标记时才退回实体列表 / 通用短语。
 */
function rankItems(f: ChunkFeatures, max = 6, len = 22): string[] {
  const marked = withoutHeadline(
    f.phrases.filter((p) => RANK_MARK.test(p)).map((p) => clip(p, len)),
    f,
  )
  if (marked.length >= 2) return dedupeTier(marked).slice(0, max)
  if (f.tools.length >= 3) return f.tools.slice(0, max)
  return exList(f, max, len)
}

/** 页面标题不该同时出现在内容里（"我的排名是这样的"当标题又当第一条 = 重复一遍） */
function withoutHeadline(items: string[], f: ChunkFeatures): string[] {
  return items.filter((s) => s && s !== f.headline && !f.headline.includes(s))
}

/**
 * 同一档位只留一条。
 * 口播说"优先考虑第一梯队"时会被断句切成「优先考虑」+「第一梯队」，
 * 于是页面上会先出现完整档位（第一梯队是混元四）、末尾又冒出半条（第一梯队）。
 * 先出现的完整信息就是正主，后面重复档位的丢掉。
 */
function dedupeTier(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const it of items) {
    const tier = it.match(/第[一二三四五六](?:梯队|档|批|名)/)?.[0] ?? ''
    if (tier) {
      if (seen.has(tier)) continue
      seen.add(tier)
    }
    out.push(it)
  }
  return out
}

/** 疑问句 / 设问——开场点题句最常见的形态（"这么多模型该选哪一个"） */
const QUESTION = /[?？]|怎么|如何|为什么|哪[一个些]|该(?:怎么|如何)?(?:选|用)|多少|要不要|值不值/

/**
 * 抽出步骤名：取"第N步"之后、第一个逗号之前的那一小段。
 *
 * 口播讲步骤时，步骤名就写在标记后面的第一个逗号里
 * （"第一步，先跟它说清楚目标，别上来就问怎么做"），后面那半句是补充说明。
 * 不能靠 phrases 来切：逗号会把一句话拆成两条短语，
 * 于是"别上来就问怎么做"会被当成**第二步**（实测步骤页多出一个假步骤）。
 */
function stepTextsOf(rawText: string): string[] {
  const out: string[] = []
  for (const m of rawText.matchAll(/第[一二三四五六]步[，,、]?\s*([^，,。！？、\s]{2,14})/g)) {
    const t = m[1].trim()
    if (t && !out.includes(t)) out.push(t)
  }
  return out
}

const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/**
 * 取前 count 条短语（保持原文顺序）。
 * 只有卡片自己另外显示了标题时才 skipHeadline，否则列表会缺一条、顺序还会乱。
 */
function rest(
  f: ChunkFeatures,
  count: number,
  max = 18,
  skipHeadline = false,
): string[] {
  const skipped = skipHeadline ? f.phrases.filter((p) => p !== f.headline) : f.phrases
  // 只有一条短语时再剥标题就空了，退回不剥（宁可标题和正文重复，也不能让卡空白）
  const list = skipped.length ? skipped : f.phrases
  return list.slice(0, count).map((p) => clip(p, max))
}

/** 标题：超过 maxLen 就用 fallback，避免把一整句塞进标题位 */
function title(f: ChunkFeatures, maxLen: number, fallback: string): string {
  return f.headline.length > maxLen ? fallback : clip(f.headline, maxLen)
}

/** 副标题：取第一条**不是**标题的短语，否则副标题会把标题原样重复一遍 */
function subPhrase(f: ChunkFeatures, max: number, fallback = ''): string {
  const other = f.phrases.find((p) => p !== f.headline)
  return clip(other ?? fallback, max)
}

/** 打分上下文：最近用过的卡型，用来避免连续重复 */
type ScoreCtx = {
  /** 最近 3 段用过的 effectId（越靠前越近） */
  recent: string[]
  /** 整片里每种卡已用次数 */
  used: Record<string, number>
  /** 个人偏好加成：常用卡型的加分（0 = 无偏好）。幅度温和——盖得过同型惩罚、盖不过内容驱动 */
  prefBonus?: (effectId: string) => number
}

type Candidate = {
  effectId: string
  name: string
  /** 只在特定篇章位置参与竞争；不填 = 都参与 */
  roles?: Role[]
  /**
   * true = 这张卡用不到段内的实体-数值对。
   * 有真实数据却出一张不展示数据的卡 = 把口播里最值钱的信息丢了，要扣分。
   */
  discardsData?: boolean
  /**
   * 由这些强信号驱动时，说明"这段内容确实要这张卡"。
   * 计分时"避免连续同型"的惩罚要大幅减轻——
   * 连续两段都是排名（文本任务排名 / 视觉任务排名）是内容本身决定的，
   * 为了追求卡型变化把第二段改成别的卡 = 明明在报排名却不出排名卡。
   */
  drivenBy?: SignalName[]
  /**
   * 打分，最高者胜；同分时按数组顺序取先者。
   *
   * ⚠️ 约定：语义信号没命中一律返回 0。
   * 之前给数据卡加了无条件的 avgLen 奖励（短句 +3），
   * 导致没有任何对比语义时 compare-bars 得 3 分、压过兜底要点卡的 2 分，
   * 纯粹靠默认分胜出——这是"匹配出来不对"的主要根因。
   */
  score: (f: ChunkFeatures, ctx: ScoreCtx) => number
  build: (f: ChunkFeatures) => Record<string, string | number | boolean>
}

/** 把段内提到的模型拆成"被否掉的"和"推荐的"两组，供替代卡使用 */
function splitToolsByStance(f: ChunkFeatures): { old: string[]; next: string[] } {
  const neg = /没必要|不用去考虑|不用考虑|替代|换掉|用不着|看不到|没放|不如|落后/
  const pos = /优先|推荐|建议|可以考虑|最强|更强|比较好用|依然是|选这个|用这个/
  const old: string[] = []
  const next: string[] = []
  for (const p of f.phrases) {
    const mentioned = f.tools.filter((t) => p.toLowerCase().includes(t.toLowerCase()))
    if (!mentioned.length) continue
    if (neg.test(p)) old.push(...mentioned)
    else if (pos.test(p)) next.push(...mentioned)
  }
  const dedupe = (a: string[]) => [...new Set(a)]
  let o = dedupe(old)
  let n = dedupe(next).filter((t) => !o.includes(t))
  // 拆不出来就退化为"前一半是被否掉的、后一半是推荐的"，至少比空着强
  if (!o.length && f.tools.length >= 2) {
    o = f.tools.slice(0, Math.max(1, Math.floor(f.tools.length / 2)))
    n = f.tools.filter((t) => !o.includes(t))
  }
  if (!n.length && f.tools.length) n = f.tools.filter((t) => !o.includes(t))
  return { old: o.slice(0, 4), next: n.slice(0, 4) }
}

/**
 * 候选卡表。
 *
 * 打分选优（不是 if-else 链）：每个候选各凭语义信号得分，最贴切的那张胜出。
 * 数据类卡片额外要求"段内确有真实指标"，否则不参赛——宁可退成文字卡，也不造数。
 */
const CANDIDATES: Candidate[] = [
  // ===== 收尾段 =====
  {
    effectId: 'srcvid-ip-circle',
    name: 'IP 圆环总结',
    roles: ['end'],
    discardsData: true,
    // 末段如果有 3 条以上的实质结论，先把它列出来——这才是观众要带走的东西。
    // 只有纯"点赞收藏"的末段才轮到 CTA 卡（否则最有价值的三句话会被一张图标卡吃掉）。
    score: (f) => {
      const n = contentPhrases(f, 4).length
      // 有 3 条以上实质结论时必须让它赢过 CTA 卡——
      // "写代码用混元 / 读长文用Kimi / 省钱用豆包"才是观众要带走的东西，一张图标卡装不下
      return (f.has('conclusion') ? 8 : 0) + (n >= 3 ? 7 : n >= 2 ? 3 : -6)
    },
    build: (f) => ({
      // 圆心位只有 8 字宽，长句塞进去会变成"记住这三句话就…"这种断头句。
      // 短句就直接用，长句退回一个稳的标签，把字留给三个卫星。
      centerCn: f.headline.length <= 6 ? f.headline : '本期要点',
      centerEn: 'SUMMARY',
      satellites: contentPhrases(f, 3, 10).join(','),
    }),
  },
  {
    effectId: 'srcvid-end-cta',
    name: '结尾三连引导',
    roles: ['end'],
    discardsData: true,
    score: (f) => (f.has('cta') ? 12 : 0),
    // 文案固定为"下期见"：以前没有引导语时填 headline，
    // 结果"搭载豆包2.0模型"这种产品信息被做成"点赞收藏"图标卡。
    build: () => ({
      name: '下期见',
      icons: '赞,评,藏',
    }),
  },
  {
    effectId: 'cta-card',
    name: '结尾行动卡',
    roles: ['end'],
    discardsData: true,
    score: (f) => (f.has('cta') ? 9 : 0),
    build: (f) => ({
      text: clip(f.headline, 14),
      sub: clip('下期继续', 14),
      btn: '关注我',
    }),
  },

  // ===== 开场段 =====
  {
    effectId: 'srcvid-hero-title',
    name: '开场霓虹主标题',
    roles: ['open'],
    // 开场优先"点题"：抛出问题 / 给出主张的那句，比罗列一堆模型名更像开场
    score: (f) => 8 + (QUESTION.test(f.headline) || f.has('conclusion') ? 5 : 0),
    build: (f) => ({
      title: clip(f.headline, 14),
      subtitle: subPhrase(f, 20),
    }),
  },
  {
    effectId: 'logo-orbiter',
    name: 'AI 工具矩阵',
    roles: ['open'],
    discardsData: true,
    // 开场就点名了 4 个以上工具、且没有点题句时，才用矩阵开场
    score: (f) => (f.tools.length >= 4 && !QUESTION.test(f.headline) ? 10 : 0),
    build: (f) => ({
      centerLabel: '模型',
      items: (f.tools.length ? f.tools : rest(f, 8, 4)).slice(0, 12).join('\n'),
    }),
  },
  {
    effectId: 'srcvid-huge-number-hero',
    name: '巨型数字开场',
    roles: ['open'],
    score: (f) => (f.pairs.length ? 7 : 0),
    build: (f) => ({
      number: String(f.pairs[0]?.value ?? 100),
      caption: clip(f.headline, 14),
      chipLeft: '本期',
      chipRight: '数据',
    }),
  },
  {
    effectId: 'big-title',
    name: '大标题卡',
    roles: ['open'],
    score: () => 6,
    build: (f) => ({
      kicker: '本期主题',
      title: clip(f.headline, 12),
      subtitle: subPhrase(f, 18),
    }),
  },

  // ===== 论述段：按**强信号**竞争（弱信号只能加分，不能单独触发） =====
  {
    effectId: 'tool-crossout',
    name: '工具替代卡',
    roles: ['body'],
    drivenBy: ['replace'],
    discardsData: true,
    // ⚠️ 别给 tools.length>=2 加无条件分：没有"替代/换成"语义时它靠默认分赢，
    // 把"复杂一点的功能用 deepseek 或 glm"这种条件推荐也做成了替代卡。
    score: (f) => (f.has('replace') ? 14 : 0),
    build: (f) => {
      const { old, next } = splitToolsByStance(f)
      return {
        title: title(f, 12, '该换哪个'),
        subtitle: clip(f.phrases[0] ?? '', 16),
        oldTools: old.join('\n'),
        altTitle: '可以换成',
        newTools: next.join('\n'),
      }
    },
  },
  {
    effectId: 'compare-bars',
    name: '左右对比条',
    roles: ['body'],
    // 必须有两个**分别绑定了实体**的数值（混元4=92 / GLM5.2=71），
    // 只凭一段里散落两个数字就画对比条是造数，宁可退成文字卡。
    score: (f) => (f.pairs.length >= 2 && f.has('compare') ? 15 : 0),
    build: (f) => {
      const a = f.pairs[0]
      const b = f.pairs[1]
      return {
        leftLabel: clip(a.entity || f.phrases[0] || '方案 A', 8),
        rightLabel: clip(b.entity || f.phrases[1] || '方案 B', 8),
        leftValue: Math.min(1000, a.value),
        rightValue: Math.min(1000, b.value),
        unit: a.unit || b.unit,
      }
    },
  },
  {
    effectId: 'two-col',
    name: '双列清单卡',
    roles: ['body'],
    discardsData: true,
    // 只在段里能找到两个可对照的对象（通常是两个模型名）且确有对比语义时才用。
    // 否则左右两列的标题无从下手，只能填"前一半/后一半"这种占位垃圾。
    score: (f) => (f.tools.length >= 2 && f.has('compare') ? 12 : 0),
    build: (f) => {
      const [a, b] = f.tools
      const hit = (p: string, t: string) => p.toLowerCase().includes(t.toLowerCase())
      let left = f.phrases.filter((p) => hit(p, a)).map((p) => clip(p, 14))
      let right = f.phrases.filter((p) => hit(p, b)).map((p) => clip(p, 14))
      // 两个对象挤在同一句里（"混元4 比 Kimi K3 更强"）时按句切一半兜底
      if (!left.length && !right.length) {
        const half = Math.ceil(f.phrases.length / 2) || 1
        left = f.phrases.slice(0, half).map((p) => clip(p, 14))
        right = f.phrases.slice(half).map((p) => clip(p, 14))
      }
      return {
        leftTitle: clip(a, 10),
        rightTitle: clip(b, 10),
        left: (left.length ? left : [clip(f.headline, 14)]).slice(0, 3).join('\n'),
        right: (right.length ? right : [clip(f.phrases[1] ?? '', 14)]).slice(0, 3).join('\n'),
      }
    },
  },
  {
    effectId: 'steps-card',
    name: '步骤流程卡',
    roles: ['body'],
    drivenBy: ['steps'],
    discardsData: true,
    // ⚠️ phrases>=3 的无条件加分不能留：没有"第一步/第二步"时它靠默认分赢，
    // 把"千问跟腾讯是老对手 → 不可能给对手宣传"这种因果说明做成了两步流程卡。
    score: (f) => (f.has('steps') ? 13 : 0),
    build: (f) => {
      // 步骤名直接用抽取好的 stepTexts（"第N步，XXX"里的 XXX）。
      // 退回 contentPhrases 时它已经会丢掉"最后/那么/接着"这类引导句，
      // 所以"这样一套下来"不会像以前那样被当成第 2 步。
      const list = (f.stepTexts.length >= 2 ? f.stepTexts : contentPhrases(f, 4, 18)).slice(0, 4)
      // 标题如果就是某一条步骤，说明这一段的点题句没抓到，退回固定标题，
      // 免得标题写着"用Kimi K3读文档"、下面又列一遍三步
      const t = list.some((s) => s === f.headline || f.headline.includes(s) || s.includes(f.headline))
        ? '操作路径'
        : title(f, 14, '操作路径')
      return {
        title: t,
        steps: list.map((s, i) => `${i + 1}步,${s}`).join('\n'),
      }
    },
  },
  {
    effectId: 'srcvid-flow-arrow',
    name: '流程箭头串联',
    roles: ['body'],
    discardsData: true,
    score: (f) => (f.has('steps') ? 9 : 0) + (f.has('recommend') ? 2 : 0),
    build: (f) => ({ nodes: contentPhrases(f, 4, 8).join(',') }),
  },
  {
    effectId: 'srcvid-classification-table',
    name: '人群分类表',
    roles: ['body'],
    drivenBy: ['classification'],
    discardsData: true,
    score: (f) => (f.has('classification') ? 13 : 0),
    build: (f) => ({
      // 这类卡的行文本很长，标题不该从行里挑，固定用"适合这几类人"
      title: title(f, 12, '适合这几类人'),
      rows: listItems(f, 3, 15).map((s, i) => `第${'一二三四'[i] ?? i + 1}类|${s}`).join('\n'),
    }),
  },
  {
    effectId: 'rank-card',
    name: '排行榜 TOP3',
    roles: ['body'],
    // 排行榜要画条形长度 → 必须有绑了实体的数值。
    // 没有数字的"排名口播"交给下面的编号路线卡（靠 01/02/03 排序，不需要数值）。
    score: (f) => (f.has('rank') && f.pairs.length >= 1 ? 12 + Math.min(3, f.pairs.length) : 0),
    build: (f) => ({
      rows: f.pairs
        .slice(0, 4)
        .map((p) => `${clip(p.entity || f.headline, 12)},${p.value}`)
        .join('\n'),
    }),
  },
  {
    effectId: 'srcvid-numbered-roadmap',
    name: '底部编号路线',
    roles: ['body'],
    drivenBy: ['rank', 'enum'],
    discardsData: true,
    score: (f) =>
      (f.has('enum') ? 11 : 0) + (f.has('rank') ? 6 : 0) + (f.weak.has('enum') ? 1 : 0),
    build: (f) => ({
      // 带名次标记的短句优先（"第一梯队是混元四"）——名次挂在中文名上时，
      // 只取英文实体会把整档弄丢（见 rankItems）。没有标记才退回通用短语。
      items: (f.has('rank') ? rankItems(f, 6, 16) : listItems(f, 4, 16))
        .map((s, i) => `${String(i + 1).padStart(2, '0')}|${s}`)
        .join('\n'),
    }),
  },
  {
    effectId: 'ring-card',
    name: '环形百分比',
    roles: ['body'],
    // ⚠️ 必须要求那个数值**本身就是百分比**，不能只看段里出现过"百分之"。
    // 反例："豆包8毛钱，比混元4便宜了百分之六十"
    //   → percent 信号命中（来自没有数字的"百分之六十"），真实数值却是 8（毛）
    //   → 环形图会堂而皇之地显示"豆包 8%"，纯属造数。
    score: (f) => (f.has('percent') && f.pairs.some((p) => p.unit === '%') ? 12 : 0),
    build: (f) => {
      const p = f.pairs.find((x) => x.unit === '%') ?? f.pairs[0]
      return {
        label: clip(p?.entity || f.headline, 12),
        pct: clampPct(p?.value ?? 0),
        sub: clip(f.phrases[1] ?? '', 12),
      }
    },
  },
  {
    effectId: 'progress-bar',
    name: '进度条卡',
    roles: ['body'],
    score: (f) => (f.has('percent') && f.pairs.some((p) => p.unit === '%') ? 9 : 0),
    build: (f) => {
      const p = f.pairs.find((x) => x.unit === '%') ?? f.pairs[0]
      return {
        label: clip(p?.entity || f.headline, 14),
        pct: clampPct(p?.value ?? 0),
      }
    },
  },
  {
    effectId: 'trend-card',
    name: '趋势卡',
    roles: ['body'],
    score: (f) => (f.has('trend') && f.pairs.length ? 12 : 0),
    build: (f) => ({
      label: clip(f.pairs[0]?.entity || f.headline, 12),
      value: Math.min(999, f.pairs[0]?.value ?? 0),
      trend: /下降|降低|回落|下跌/.test(f.text) ? 'down' : 'up',
    }),
  },
  {
    effectId: 'core-number-roller',
    name: '核心数字滚动',
    roles: ['body'],
    // 只有一个数值时用它（价格、字数、耗时…）；
    // 有两个以上就交给对比条/排行榜——那才是"对比"该有的形态。
    score: (f) =>
      f.pairs.length === 1
        ? 9 + (f.has('price') ? 4 : 0) + (f.has('percent') ? 2 : 0)
        : f.pairs.length > 1
          ? 4
          : 0,
    build: (f) => ({
      label: clip(f.pairs[0]?.entity || f.headline, 12),
      target: Math.min(9999999, f.pairs[0]?.value ?? 0),
      suffix: f.pairs[0]?.unit ?? '',
    }),
  },
  {
    effectId: 'srcvid-concept-trio',
    name: '概念对比三卡',
    roles: ['body'],
    discardsData: true,
    score: (f) => (f.has('concept') ? 11 : 0) + (f.phrases.length === 3 ? 3 : 0),
    build: (f) => ({
      title: clip(f.headline, 12),
      cards: listItems(f, 3, 10).join(','),
      activeIndex: 1,
    }),
  },
  {
    effectId: 'srcvid-circular-relation',
    name: '环形关系图',
    roles: ['body'],
    discardsData: true,
    score: (f) => (f.has('relation') ? 12 : 0),
    build: (f) => {
      // left / right 必须避开 headline：
      // 以前直接取 phrases[1]，而 headline 常常就是 phrases[1]
      // （"再说一个关键的事"既当圆心又当左环，画面上同一句话出现两次）。
      const rest = contentPhrases(f, 4, 10).filter((p) => p !== f.headline)
      const [l, r] = rest
      return {
        center: clip(f.headline, 8),
        left: l ?? '',
        right: r ?? '',
      }
    },
  },
  {
    effectId: 'srcvid-negation-badge',
    name: '否定徽章强调',
    roles: ['body'],
    discardsData: true,
    // 「不是A，而是B」在中文口播里是转折/补充，并不是在否定一个误解，
    // 而这类句子占了否定词命中的绝大多数。不区分的话徽章会严重刷屏
    // （真实语料实测：33 段里能占 9 段，且很多相邻），这里把转折句降权。
    score: (f) => {
      if (!f.has('negation')) return 0
      const isTurn =
        /不是[^。！？]{0,24}而是|并不是|也不是|其实不是|而不是|不是说/.test(f.text)
      return (isTurn ? 3 : 10) + (f.avgLen > 13 ? 2 : 0)
    },
    build: (f) => ({ text: clip(f.headline, 12) }),
  },
  {
    effectId: 'srcvid-statement-card',
    name: '金句观点卡',
    roles: ['body'],
    discardsData: true,
    score: (f) =>
      (f.has('conclusion') ? 8 : 0) + (f.headline.length <= 16 ? 3 : 0) + (f.avgLen > 13 ? 3 : 0),
    build: (f) => ({ text: clip(f.headline, 18) }),
  },
  {
    effectId: 'golden-reveal',
    name: '金句逐行揭示',
    roles: ['body'],
    discardsData: true,
    score: (f) =>
      (f.has('conclusion') ? 7 : 0) + (contentPhrases(f, 3).length >= 2 ? 2 : 0) + (f.avgLen > 13 ? 3 : 0),
    build: (f) => ({
      tag: '核心观点',
      lines: contentPhrases(f, 3, 18).join('\n'),
    }),
  },
  {
    effectId: 'quote-card',
    name: '引用金句卡',
    roles: ['body'],
    discardsData: true,
    score: (f) => (f.has('conclusion') ? 6 : 0) + (f.headline.length <= 20 ? 2 : 0),
    build: (f) => ({
      quote: clip(f.headline, 26),
      author: '本期要点',
    }),
  },
  {
    effectId: 'srcvid-comparison-lines',
    name: '反差对比双行',
    roles: ['body'],
    discardsData: true,
    // 这张卡必须有两条内容才有"对比"可言，否则第二行会退化成占位文案
    score: (f) => (f.has('compare') && contentPhrases(f, 3).length >= 2 ? 10 : 0),
    build: (f) => {
      const [a, b] = contentPhrases(f, 3, 16)
      return { line1: a ?? '你以为的', line2: b ?? '实际上的' }
    },
  },
  {
    effectId: 'logo-orbiter',
    name: 'AI 工具矩阵',
    roles: ['body'],
    discardsData: true,
    // 这张卡以前只要有 ≥2 个模型名就给 12 分，结果把"价格段""三步流程段"全抢走了。
    // 现在它只在"这段话真的只是在罗列工具"时才参赛——
    // 一旦出现步骤/排名/百分比/价格/分类这类强结构信号，就让位给对应的卡。
    score: (f) => {
      if (f.tools.length < 2) return 0
      if (f.has('steps') || f.has('rank') || f.has('percent') || f.has('price')) return 0
      if (f.has('classification') || f.has('enum')) return 0
      // 段子在解释"为什么看不到豆包"——这是因果说明，不是罗列工具，
      // 出成矩阵会把一个解释变成一张产品墙。
      if (f.has('negation')) return 0
      if (f.pairs.length >= 2 && f.has('compare')) return 0
      return 8
    },
    build: (f) => ({
      centerLabel: '模型',
      items: f.tools.slice(0, 12).join('\n'),
    }),
  },
  {
    effectId: 'label-row',
    name: '标签行卡',
    roles: ['body'],
    discardsData: true,
    score: (f) =>
      f.phrases.length >= 2 && f.phrases.every((p) => p.length <= 10) ? 7 : 0,
    build: (f) => ({ labels: listItems(f, 4, 10).join('\n') }),
  },
  // 兜底：并列要点（唯一有正的基础分的非信号卡，保证每段都有卡）
  {
    effectId: 'bullet-list',
    name: '要点清单卡',
    discardsData: true,
    score: (f) => 2 + (f.avgLen > 13 ? 3 : 0),
    build: (f) => ({
      title: title(f, 12, '本段要点'),
      items: listItems(f, 4, 20).join('\n'),
    }),
  },
]

/**
 * 解说库候选卡表（知识解说视频专用）。
 *
 * 与常规库的三点差别：
 *  1. 全是 ex- 前缀的**整页幻灯片**卡，一页就是一张画面，不跟人像抢位置；
 *  2. 同一页装得更多 —— 清单 6 条 / 步骤 5 格 / 标签 8 个 / 对比左右各 5 条；
 *  3. 兜底卡（标签页）带正基础分，保证每个有内容的段落都有一页，
 *     不会像常规库那样出现"这段没卡 → 画面空着"。
 */
const EXPLAIN_CANDIDATES: Candidate[] = [
  // ===== 开场 =====
  {
    effectId: 'ex-title-slide',
    name: '解说·标题页',
    roles: ['open'],
    score: (f) => 10 + (QUESTION.test(f.headline) ? 3 : 0),
    build: (f) => {
      // 三行都不重复：大标题 / 小字副标 / 结论药丸各取一条不同短语
      const others = contentPhrases(f, 3, 26).filter((p) => p !== f.headline)
      return {
        eyebrow: '本期主题',
        title: clip(f.headline, 16),
        titleSub: others[0] ?? '',
        pill: others[1] ?? '',
      }
    },
  },

  // ===== 收尾 =====
  {
    effectId: 'ex-end-slide',
    name: '解说·结尾页',
    roles: ['end'],
    discardsData: true,
    score: (f) =>
      (f.has('cta') ? 12 : 0) + (contentPhrases(f, 3).length >= 2 ? 3 : 0) + (f.has('conclusion') ? 4 : 0),
    build: (f) => ({
      summary: clip(f.headline, 26),
      cta: '关注我，下期继续',
      sign: '',
    }),
  },
  {
    effectId: 'ex-key-point',
    name: '解说·要点页',
    roles: ['end', 'body'],
    discardsData: true,
    // 收成一句话：结论句 / 定义句最配这张卡
    score: (f) =>
      (f.has('conclusion') ? 9 : 0) +
      (f.has('concept') ? 5 : 0) +
      (f.headline.length <= 18 ? 2 : 0) +
      (f.avgLen > 13 ? 2 : 0),
    build: (f) => {
      const others = contentPhrases(f, 2, 26).filter((p) => p !== f.headline)
      return {
        eyebrow: f.role === 'end' ? '最后一句' : '重点',
        title: clip(f.headline, 14),
        point: others[0] ?? '',
      }
    },
  },

  // ===== 论述段 =====
  {
    effectId: 'ex-steps-flow',
    name: '解说·步骤页',
    roles: ['body'],
    drivenBy: ['steps'],
    discardsData: true,
    // 步骤必须显式说出"第一步/第二步"，否则会把手写因果说明做成流程页。
    // 真的标了 2 个以上"第N步"时再抬一手：这种段一定也带着逗号并列，
    // 清单页会靠 list 信号反超（17 分），把一套流程做成"编号列表"就丢了流程感。
    score: (f) => {
      if (!f.has('steps')) return 0
      return f.steps >= 2 ? 20 : 14
    },
    build: (f) => {
      // 步骤名同样直接取 stepTexts，一步一格，不会多出假步骤
      const list = (f.stepTexts.length >= 2 ? f.stepTexts : exList(f, 5, 12)).slice(0, 5)
      return {
        eyebrow: '流程',
        title: title(f, 14, '它是怎么跑起来的'),
        steps: list.map((s) => clip(s, 12)).join('\n'),
        footnote: '',
      }
    },
  },
  {
    effectId: 'ex-versus',
    name: '解说·对比页',
    roles: ['body'],
    // ⚠️ 有排名 / 并列 / 分类结构时一律退位。
    // 反例："第一梯队是混元四…第二梯队是Kimi K3，最强…第三梯队是豆包，最便宜"
    //   → compare 信号会被"最强/最便宜"点着，于是整段梯队排名被做成左右两栏对比，
    //     而观众要看的恰恰是**三档名次**，应该出一张编号清单页。
    score: (f) => {
      if (!f.has('compare')) return 0
      if (f.has('rank') || f.has('enum') || f.has('list') || f.has('classification')) return 0
      return 13 + (f.tools.length >= 2 ? 3 : 0) + (f.pairs.length >= 2 ? 2 : 0)
    },
    build: (f) => {
      const [a, b] = f.tools
      const hit = (p: string, t: string) => !!t && p.toLowerCase().includes(t.toLowerCase())
      let left = f.phrases.filter((p) => hit(p, a)).map((p) => clip(p, 16))
      let right = f.phrases.filter((p) => hit(p, b)).map((p) => clip(p, 16))
      let leftTitle = clip(a || '', 8)
      let rightTitle = clip(b || '', 8)
      // 段里没有英文产品名可抓（纯中文概念对比）时的兜底切分
      if (!left.length && !right.length) {
        const all = withoutHeadline(contentPhrases(f, 8, 16), f)
        // 两条"X是…"就是天然的左右锚点（"传统搜索是…" / "大语言模型是…"），
        // 按锚点切比"一刀切一半"可靠：切一半会把右栏的开场句落到左栏去。
        const anchors = all
          .map((p, i) => ({ p, i, s: subjectOf(p) }))
          .filter((x) => x.s)
        if (anchors.length >= 2) {
          const cut = anchors[1].i
          left = all.slice(0, cut)
          right = all.slice(cut)
          if (!leftTitle) leftTitle = clip(anchors[0].s, 8)
          if (!rightTitle) rightTitle = clip(anchors[1].s, 8)
        } else {
          const half = Math.ceil(all.length / 2) || 1
          left = all.slice(0, half)
          right = all.slice(half)
          if (!leftTitle) leftTitle = clip(subjectOf(left[0]), 8)
          if (!rightTitle) rightTitle = clip(subjectOf(right[0]), 8)
        }
      }
      // 左右各给 5 条（常规双列卡只给 3 条）—— 解说页有整页空间
      return {
        eyebrow: '对比',
        leftTitle: leftTitle || '以前',
        leftLines: (left.length ? left : [clip(f.headline, 16)]).slice(0, 5).join('\n'),
        rightTitle: rightTitle || '现在',
        rightLines: (right.length ? right : [clip(f.phrases[1] ?? '', 16)]).slice(0, 5).join('\n'),
      }
    },
  },
  {
    effectId: 'ex-stat-hero',
    name: '解说·数据页',
    roles: ['body'],
    // 数字必须真出现在口播里（pairs 是同 cue 配出来的实体-数值对）
    score: (f) => {
      if (!f.pairs.length) return 0
      return (
        8 +
        (f.has('percent') ? 4 : 0) +
        (f.has('trend') ? 3 : 0) +
        (f.has('price') ? 3 : 0) +
        (f.pairs.length >= 2 ? 2 : 0)
      )
    },
    build: (f) => {
      const p = f.pairs.find((x) => x.unit === '%') ?? f.pairs[0]
      return {
        eyebrow: '一个数字',
        label: clip(p?.entity || f.headline, 14),
        target: Math.min(9999999, p?.value ?? 0),
        decimals: 0,
        prefix: '',
        suffix: p?.unit ? ` ${p.unit}` : '',
        pill: clip(f.headline, 24),
      }
    },
  },
  {
    effectId: 'ex-highlight-turn',
    name: '解说·强调页',
    roles: ['body'],
    discardsData: true,
    score: (f) => (f.has('negation') ? 10 : 0) + (f.has('replace') ? 8 : 0),
    build: (f) => {
      const others = contentPhrases(f, 3, 24).filter((p) => p !== f.headline)
      return {
        lead: others[0] ?? '',
        highlight: clip(f.headline, 16),
        note: others[1] ?? '',
      }
    },
  },
  {
    effectId: 'ex-checklist',
    name: '解说·清单页',
    roles: ['body'],
    discardsData: true,
    score: (f) =>
      (f.has('enum') ? 11 : 0) +
      (f.has('rank') ? 7 : 0) +
      (f.has('classification') ? 6 : 0) +
      (f.has('list') ? 6 : 0) +
      (f.tools.length >= 2 ? 3 : 0),
    build: (f) => {
      // 排名走 rankItems（保住中文名次条目）；纯罗列工具走实体列表
      //（此时名次就是段里出现的产品名本身）；其余按短句取。
      const items = withoutHeadline(
        f.has('rank')
          ? rankItems(f, 6, 22)
          : f.has('list') && f.tools.length >= 2
            ? f.tools.slice(0, 6)
            : exList(f, 6, 22),
        f,
      )
      return {
        eyebrow: f.has('rank') ? '排序' : f.has('classification') ? '分类' : '要点',
        title: title(f, 13, '这一段说了什么'),
        items: items.slice(0, 6).join('\n'),
      }
    },
  },
  {
    effectId: 'ex-section-slide',
    name: '解说·章节页',
    roles: ['body'],
    discardsData: true,
    // 只在"换话题的第一句"出现：段首是引导词、且这一段没有任何强结构
    // （有步骤/对比/排名/百分比/价格时该出的是内容页，不是翻页封面）
    score: (f) => {
      if (f.has('steps') || f.has('compare') || f.has('rank')) return 0
      if (f.has('percent') || f.has('price') || f.has('list')) return 0
      if (f.has('enum') || f.has('classification')) return 0
      const lead = f.phrases[0] ?? ''
      if (!/^(好|好的|那么|接着|接下来|然后|另外|还有|再来看|首先|其次|最后|我们|所以)/.test(lead)) return 0
      return f.duration >= 7 ? 7 : 4
    },
    build: (f) => ({
      index: String(f.index + 1).padStart(2, '0'),
      title: clip(f.headline, 18),
      sub: subPhrase(f, 22),
    }),
  },
  // 兜底：关键词标签页（解说库唯一带正基础分的卡，保证每段都有页）
  {
    effectId: 'ex-tag-build',
    name: '解说·标签页',
    roles: ['body'],
    discardsData: true,
    score: (f) => 5 + (f.tools.length >= 2 ? 3 : 0) + (f.avgLen <= 10 ? 3 : 0),
    build: (f) => {
      // 提到多个实体时，实体本身就是这一页最该强调的关键词
      const tags = withoutHeadline(
        f.tools.length >= 2 ? f.tools.slice(0, 8) : exList(f, 8, 10),
        f,
      )
      return {
        eyebrow: '关键词',
        title: title(f, 13, '这一段说了什么'),
        tags: tags.slice(0, 8).join('\n'),
      }
    },
  },
]

/**
 * 按语义把字幕切成段（跟 store / 导入弹窗共用，保证预览和实际生成一致）。
 *
 * 不再是"每 3 句一刀切"——口播句长差异极大（"没有之一"只有 0.5s，"混元三它在
 * WorkBuddy 里面…"有 5 秒），固定句数会把语义段腰斩，还会切出 1 秒的卡。
 * 这里按三个条件收段：
 *   1. 时长达到 5s 且遇到 ≥0.75s 的停顿 → 断在这里（停顿是换话题的自然分界）
 *   2. 时长 ≥12s 或字数 ≥90 → 强制断（避免一张卡信息过载）
 *   3. 段时长不足 3.2s → 继续并下一段（避免碎片卡）
 */
/**
 * 引导词"家族"：同一家族只在**第一次**出现时断。
 * 否则"第一步/第二步/第三步"会被切成三段，步骤卡彻底废掉。
 *
 * ⚠️ 步骤标记必须**句中也要认**，不能只看句首。
 * 口播进入流程时最常见的是「接下来讲怎么用，第一步，先跟它说清楚目标」——
 * 只看句首会把它判成 trans，于是它跟后面的「第二步/第三步」分成两个不同家族，
 * 家族守卫失效 → 一段完整的四步流程被拆成「1 步一页 + 3 步一页」。
 */
function leadFamily(text: string): string | null {
  if (/第[一二三四五六]步/.test(text)) return 'step'
  if (/^第[一二三四五六]/.test(text)) return 'enum'
  if (/^总结一下|^总结|^结论|^最后/.test(text)) return 'sum'
  if (/^好|^好的|^好吧|^那么|^接着|^接下来|^然后|^另外|^还有|^再来看|^首先|^其次/.test(text)) return 'trans'
  return null
}

/**
 * 排序序列词：口播报排名时会连着说一串——
 * "优先考虑GLM5.3 / 再考虑GLM5.2 / 再到混元4 preview / 再到deepseek v4 pro / 最后是混元3"。
 *
 * 这种序列**必须整段合并**。以前只受 12s 硬断约束，一串 6 项的排名会被切成三段，
 * 每段只剩两三项，既出不了排行榜、观众也看不出名次关系——
 * 而"排名"恰恰是横评类口播最有价值的信息。
 */
const RANK_SEQ =
  /优先考虑|优先使用|再考虑|再到|最后(?:再)?(?:到|是|考虑)|其次|再次|排名是|我们的排名|第[一二三四五六](?:梯队|档|批|名)/

const isSeq = (t: string) => RANK_SEQ.test(t)

/**
 * 步骤序列标记。跟排名序列同理：一串「第一步/第二步/第三步/第四步」被硬上限腰斩后，
 * 后半截会变成一页只有一步的残页（实测第四步被切出去单独成一页）。
 * 段内已出现步骤词、这一句也是步骤词 → 不许断，让整套流程攒完整。
 */
const STEP_SEQ = /第[一二三四五六]步|步骤是|流程是/

const isStepSeq = (t: string) => STEP_SEQ.test(t)

const familyIn = (cues: SrtCue[], fam: string) =>
  cues.some((c) => leadFamily(c.text.trim()) === fam)

/**
 * 分段密度档位。
 *
 * 解说类知识视频跟常规口播的节奏完全不同：常规口播一句一个信息点、停顿多，
 * 卡要跟着换；解说视频一段就是一个知识点，一页 PPT 要停留十几秒。
 * 所以解说档把硬上限抬高一倍，并把"停顿断句"的门槛也抬高 ——
 * 同样的字幕，常规档切出 12 页，解说档只切出 6~7 页，
 * 但每一页上装的内容是原来的两倍（这就是"同一页更密集"）。
 */
type ChunkProfile = {
  /** 段时长低于它就并进上一段（避免碎片页） */
  minDur: number
  /** 硬上限：时长/字数任一达标就强制断 */
  hardMaxDur: number
  hardMaxText: number
  /** 停顿断句门槛：停顿达到它 + 已攒够 breakMinDur 才算换话题 */
  gapBreak: number
  breakMinDur: number
  /** 引导词要生效，当前段至少已经攒够这么久 */
  leadMinDur: number
  /** 排名序列的粘连上限 */
  seqMaxDur: number
}

const CHUNK_PROFILE: Record<AutoCardLib, ChunkProfile> = {
  regular: {
    minDur: 3.2,
    hardMaxDur: 12,
    hardMaxText: 90,
    gapBreak: 0.75,
    breakMinDur: 5,
    leadMinDur: 4,
    seqMaxDur: 24,
  },
  explain: {
    minDur: 4,
    // 上限比常规档高一档（20s / 150 字 vs 12s / 90 字）：
    // 一组并列信息（三档排名、四步流程、一串能力）应当落在同一页，
    // 但不能高到把两个话题吞进一页 —— 实测 20s 是"一页一件事"的边界。
    hardMaxDur: 20,
    hardMaxText: 150,
    gapBreak: 0.9,
    breakMinDur: 6,
    leadMinDur: 5,
    seqMaxDur: 38,
  },
}

export function chunkCues(cues: SrtCue[], lib: AutoCardLib = 'regular'): SrtCue[][] {
  const p = CHUNK_PROFILE[lib] ?? CHUNK_PROFILE.regular
  const MIN_DUR = p.minDur
  const HARD_MAX_DUR = p.hardMaxDur
  const HARD_MAX_TEXT = p.hardMaxText
  const GAP_BREAK = p.gapBreak
  /** 引导词要生效，当前段至少已经攒够这么久，避免切出 1 秒的碎片 */
  const LEAD_MIN_DUR = p.leadMinDur
  /** 排名序列的粘连上限：够攒下 6~7 项名次，再多就强制断 */
  const SEQ_MAX_DUR = p.seqMaxDur

  const out: SrtCue[][] = []
  let cur: SrtCue[] = []
  let lastEnd = Number.NEGATIVE_INFINITY

  const flush = () => {
    if (cur.length) out.push(cur)
    cur = []
  }

  for (const c of cues) {
    const gap = (c.start - lastEnd) / 1000
    const dur = cur.length ? (c.end - cur[0].start) / 1000 : 0
    const textLen = cur.reduce((s, x) => s + x.text.length, 0)
    const tooLong = dur >= HARD_MAX_DUR || textLen >= HARD_MAX_TEXT
    // 已经说满 breakMinDur 秒，且这里有个明显停顿 → 话题换了，断
    const atBreak = gap >= GAP_BREAK && dur >= p.breakMinDur
    // 遇到段首引导词，且这一段还没有同家族的引导词 → 断在它前面
    const fam = leadFamily(c.text.trim())
    const atLead = dur >= LEAD_MIN_DUR && fam !== null && !familyIn(cur, fam)
    // 正在报一串排名 / 走一套步骤：段内已有同类标记、这一句也带同类标记 → 不许断，
    // 让序列攒完整（排名要看出名次关系，步骤不能只剩半截）。
    // 上限 SEQ_MAX_DUR 防止一句口播无限粘连。
    const inSeq =
      cur.length > 0 &&
      dur < SEQ_MAX_DUR &&
      ((isSeq(c.text) && cur.some((x) => isSeq(x.text))) ||
        (isStepSeq(c.text) && cur.some((x) => isStepSeq(x.text))))
    if (cur.length && !inSeq && (tooLong || atBreak || atLead)) flush()
    cur.push(c)
    lastEnd = c.end
  }
  flush()

  // 尾部过短的段并进上一段（避免 1 秒的卡）
  const merged: SrtCue[][] = []
  for (const chunk of out) {
    const prev = merged[merged.length - 1]
    const dur = (chunk[chunk.length - 1].end - chunk[0].start) / 1000
    // 解说档额外一条：**另起一段话题**的短段不许并进上一页。
    // 并进去等于把两件事挤在同一页幻灯片上，而"一页只讲一件事"正是解说片的底线
    //（实测反例：「跟传统搜索的差别」那三句把「接下来讲怎么用，第一步…」吞了进去）。
    const startsTopic = leadFamily(chunk[0].text.trim()) !== null
    const blockMerge = lib === 'explain' && startsTopic
    if (prev && dur < MIN_DUR && !blockMerge) {
      const prevDur = (prev[prev.length - 1].end - prev[0].start) / 1000
      // 并进去只要不超过硬上限就合，否则宁可留着
      if (prevDur + dur <= HARD_MAX_DUR + 3) {
        merged[merged.length - 1] = [...prev, ...chunk]
        continue
      }
    }
    merged.push(chunk)
  }
  return merged
}

/**
 * 一次性给所有分段选卡。
 * 逐段调用时不知道上一段选了什么，容易出现连续两张同类型；
 * 这里把最近用过的卡型串起来，让整条片子的卡型有节奏地交替。
 */
export function suggestCardsForChunks(
  chunks: SrtCue[][],
  lib: AutoCardLib = 'regular',
): (AutoCardSuggestion | null)[] {
  const recent: string[] = []
  const used: Record<string, number> = {}
  // 个人偏好：常用卡型排行 → 加分函数（第 1 名 +3，往后每名 -0.5，8 名之外不加分）。
  // 加分必须温和：盖得住同型惩罚、盖不过内容驱动与兜底分，否则常用卡会滥用。
  const ranking = prefEffectRanking()
  const prefBonus = (effectId: string): number => {
    const idx = ranking.indexOf(effectId)
    if (idx < 0 || idx >= 8) return 0
    return Math.max(0, 3 - idx * 0.5)
  }
  return chunks.map((chunk, i) => {
    const s = suggestCardForChunk(chunk, i, chunks.length, { recent, used, prefBonus }, lib)
    if (s) {
      recent.unshift(s.effectId)
      if (recent.length > 3) recent.pop()
      used[s.effectId] = (used[s.effectId] ?? 0) + 1
    }
    return s
  })
}

/** 篇章位置：首段开场、末段收尾，中间是论述段 */
export function roleOf(index: number, total: number): Role {
  if (total <= 2) return 'body'
  if (index === 0) return 'open'
  if (index >= total - 1) return 'end'
  return 'body'
}

/**
 * 对外入口：净化文案 → 提取特征 → 打分选卡 → 附导演信息。
 * @param total 本次一共切成几段，用来判断开场/收尾
 */
export function suggestCardForChunk(
  chunk: SrtCue[],
  index: number,
  total = 1,
  ctx: ScoreCtx = { recent: [], used: {} },
  lib: AutoCardLib = 'regular',
): AutoCardSuggestion | null {
  const role = roleOf(index, total)
  const f = featuresOf(chunk, role, index)
  if (!f.phrases.length) return null

  /**
   * 最后一段 ≠ 结尾引导。
   * 真实语料里末段常常只是句补充信息（"搭载豆包 2.0 Code 模型"），
   * 以前因为结尾卡带无条件基础分，这种段会被硬套成"结尾三连引导"——
   * 一句产品信息变成"点赞收藏"，非常突兀。
   * 没有引导语（关注/点赞/下期）的末段一律按论述段处理：有价值就出卡，没价值就跳过。
   */
  const effRole: Role = role === 'end' && !f.has('cta') ? 'body' : role

  // 「挑重点」：过渡段 / 口水段不出卡。
  // 以前每段必出一张，一段 2 分钟的视频能出 9 张卡，一半是"那么我们接着看"这种废话，
  // 画面又吵又记不住。开场和收尾不受这个限制（那两个位置本来就必须有画面）。
  // 解说档门控放宽：解说页是整页幻灯片，一张要顶十几秒，
  // 中间留空 = 观众长时间盯着一张废页，所以宁可多出一页轻内容页。
  const gate = lib === 'explain' ? SALIENCE_GATE_EXPLAIN : SALIENCE_GATE
  if (effRole === 'body' && f.salience < gate) return null

  const list = lib === 'explain' ? EXPLAIN_CANDIDATES : CANDIDATES
  const pool = list.filter((c) => !c.roles || c.roles.includes(effRole))
  let best: Candidate | null = null
  let bestScore = -Infinity
  for (const c of pool) {
    let s = c.score(f, ctx)
    // 内容驱动的卡（排名/步骤/对比…）不能为了"卡型有变化"被换掉
    const repeal = c.drivenBy?.some((n) => f.has(n)) ? 0.3 : 1
    // 连续同类型会显得单调：最近 1 段重罚、2~3 段轻罚
    if (ctx.recent[0] === c.effectId) s -= 5 * repeal
    else if (ctx.recent[1] === c.effectId) s -= 4 * repeal
    else if (ctx.recent[2] === c.effectId) s -= 2 * repeal
    // 段里明明有真实数据（"豆包 8毛"），却出一张不展示数据的卡 → 扣分。
    // 这条要压过"避免连续同型"的惩罚：数据比花样重要。
    if (c.discardsData && f.pairs.length) s -= 3
    // 整片同类型用太多也要降权，保证卡型有变化。
    // 惩罚力度要盖得住「内容驱动型」卡的高基础分，否则像否定徽章这种
    // 命中即得高分的卡会一路刷到结尾（实测相邻段连续出现 9 次）。
    const n = ctx.used[c.effectId] ?? 0
    if (n >= 4) s -= 5
    else if (n >= 2) s -= 2
    // 个人偏好：用户历史上常用的卡型加温和的倾向分（历史版本面板里「记录我的偏好」积累）
    s += ctx.prefBonus?.(c.effectId) ?? 0
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }
  // 所有候选都是 0 分的极端情况（理论上被 bullet-list 兜住了）
  if (!best) return null

  const params = best.build(f)
  const intent = `${best.name}：${effRole === 'open' ? '开场点题' : effRole === 'end' ? '结尾收束' : '突出该段核心信息'}，用动效增强理解`
  return {
    effectId: best.effectId,
    name: best.name,
    params,
    role,
    lib,
    director: makeDirector(chunk, params, intent),
  }
}
