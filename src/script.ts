import type { SrtCue } from './srt'

/**
 * 口播稿文案净化。
 *
 * 自动转写出来的字幕是"口语流"：充满语气词、半截话、重复。
 * 直接搬上卡片会很丑。这里按三步处理：
 *   1. 拆句 —— 长句按标点切成短短语
 *   2. 去水 —— 去掉语气词、口头禅、太短的碎片
 *   3. 去重 —— 去掉重复/高度相似的短语
 * 产出的是可以直接排版的短句数组。
 */

/**
 * 纯语气词（嗯/啊/好/对…）—— 无论在哪儿都是噪音，可以直接剥。
 * 注意用 [\s，。！？、,!?.]* 把后面的停顿一起吃掉。
 */
const INTERJECTION =
  /^(?:嗯+|啊+|呃+|哦+|诶+|唉+|好的?|对|对的|没错|是的|ok|okay|好吧|行)[\s，。！？、,!?.]*/i

/**
 * 连接词 / 口头禅（然后、那么、就是、我们、这个…）。
 * 这些词只有在**后面跟着停顿**时才算水词，否则会把正常句子切坏：
 *   "我们的内容转化率" 里的"我们"不是语气词，剥掉会变成"的内容转化率"。
 * 所以用 (?=[\s，。！？、,!?.]) 前瞻要求后面有分隔符。
 */
const LEAD_CONNECTIVE =
  /^(?:那么|然后|就是|就是说|其实|所以|而且|但是|不过|接下来|继续|下面|最后|总之|今天|本期|大家好|朋友们|各位|我们|我|你|你们|这个|那个|真的|非常|特别|有点|可能|应该|大概|基本上|什么|怎么|为什么|来|那)(?=[\s，。！？、,!?.])/i

/**
 * 排序前缀：报排名时挂在名次前面的引导词（"**优先考虑**GLM5.3"）。
 * 不剥掉的话，排行榜/编号路线上每一行都顶着"优先考虑/再到"，
 * 真正要传达的名次反而被挤到后面。
 */
const RANK_PREFIX =
  /^(?:优先考虑|优先使用|再考虑|再到|最后再到|最后是|其次|再次)(?=[A-Za-z0-9一-龥])/i

/** 句尾语气词 */
const TAIL_FILLER = /(嗯+|啊+|呃+|哦+|呢|吧|嘛|啦|哈|呀|呗|咯|对吧|是吧|好吧|行吧|这样子|这个样子|什么的|之类的|什么的话)$/i

/** 整个短语都是水（直接丢） */
const USELESS =
  /^(嗯+|啊+|呃+|哦+|诶|好|好的|对|对的|没错|是的|是的呢|ok|okay|好吧|行|行吧|那么|然后|接下来|继续|下面|最后|总之|这个|那个|什么|怎么|为什么|哪里|谁|拜拜|再见)$/i

/** 一句里出现这些说明有"干货" */
// 注意：这里刻意不含 [0-9]。
// "含数字"不等于"有信息量"——混元4、GLM5.2 这类型号数字只会干扰标题选择
// （曾经把开场标题选成"首先我们在模板里面看这个混元4"，而不是点题的"这么多大模型该怎么选择"）。
// 数字的判定统一走 metricNumbers()，只有真实指标才加分。
const SIGNAL_WORDS =
  /百分之|百分比|%|排名|排行榜|前三|名次|第[一二三四五六七八九十]名|对比|比较|相比|高于|低于|超过|领先|落后|优势|短板|增长|提升|下降|降低|回落|突破|达到|转化|留存|步骤|流程|结论|总结|核心|重点|关键|原因|结果|建议|注意|记住|方法|方式|技巧|案例|数据|用户|收入|成本|效率|关注|点赞|收藏|转发|订阅|下期|因为|所以|意味着|本质|实际上|其实|真正|误区|不是|并非|以为|适合|人群|分类|三类|定义|概念/

/**
 * 拆分用的标点。
 * 刻意不含普通句点 —— "只要 1.5 个小时" 里的点号是小数点，
 * 拿它当分句符会把数字切成 "只要1" + "5个小时"。
 */
const SPLIT_RE = /[，。！？；、,!?;:~—\n]+/

/** 数字前面是 ASCII 字母 → 型号（GLM5.2 / Kimi K3 / deepseek v4） */
const ASCII_BEFORE = /[A-Za-z]\s*$/u
/** 数字前面是"模型家族"词 → 型号（混元4 / 千问3 / 通义2） */
const MODEL_FAMILY_BEFORE = /(?:混元|千问|通义|文心|豆包|智谱|星火|盘古|讯飞)\s*$/u
/** 数字后面紧跟的版本词（5v turbo / v4 flash） */
const UNIT_AFTER = /^\s*(?:v|V|pro|flash|preview|turbo|code|max|ultra|mini|plus|x)\b/u
/** 数字后面紧跟的日期/量词（9月 / 10号 / 9月底） */
const DATE_AFTER = /^\s*(?:月|号|日|年|周|天|点|版)/u
/** 数字后面紧跟百分号 → 一定是比例指标，直接放行 */
const PERCENT_AFTER = /^\s*%/u

/**
 * 从一段文本里挑出"能当指标用"的数字。
 *
 * 型号（混元4、GLM5.2、Kimi K3、deepseek v4）和日期（9月10号、9月底）都不是指标。
 * 不区分的话会出现两种荒谬结果：
 *   - 数据卡拿型号当数值 → "核心数字滚动 target=4"
 *   - 标题打分误以为"含数字 = 有信息量" → 开场标题选成"首先我们在模板里面看这个混元4"，
 *     而不是真正点题的"这么多大模型该怎么选择"
 */
export function metricNumbers(text: string): number[] {
  const out: number[] = []
  const re = /\d+(?:\.\d+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const raw = m[0]
    const before = text.slice(Math.max(0, m.index - 6), m.index)
    const after = text.slice(m.index + raw.length, m.index + raw.length + 8)
    // 百分号优先判定：占 68% 一定是比例，不能因为前面是中文词就当成型号
    if (!PERCENT_AFTER.test(after)) {
      if (ASCII_BEFORE.test(before)) continue
      if (MODEL_FAMILY_BEFORE.test(before)) continue
      if (UNIT_AFTER.test(after)) continue
      if (DATE_AFTER.test(after)) continue
    }
    const n = Number(raw)
    if (Number.isFinite(n)) out.push(n)
  }
  return out
}

/** 净化一条字幕文本，产出 0~n 条可用短句 */
export function cleanPhrases(text: string): string[] {
  const parts = text.split(SPLIT_RE)
  // 短枚举项（"项目、领域、资源"）本来会被下面"少于 4 字就丢"的规则干掉，
  // 可它们恰恰才是清单的正文。先认出"连续 3 个以上短片段"的列举，单独放行。
  const enumIdx = shortEnumRuns(parts)
  const out: string[] = []
  for (let i = 0; i < parts.length; i++) {
    let s = parts[i].trim()
    if (!s) continue
    // 反复剥句首：先剥纯语气词，再剥后面有停顿的连接词
    let prev = ''
    while (s !== prev) {
      prev = s
      s = s.replace(INTERJECTION, '').trim()
      s = s.replace(LEAD_CONNECTIVE, '').trim()
      s = s.replace(RANK_PREFIX, '').trim()
    }
    // 剥句尾语气词
    s = s.replace(TAIL_FILLER, '').trim()
    // 太短 / 太长 / 无信息量 → 丢（但短枚举项保留）
    if (s.length < 4 && !enumIdx.has(i)) continue
    if (s.length > 34) continue
    if (USELESS.test(s)) continue
    out.push(s)
  }
  return dedupe(out)
}

/** 找出"连续 ≥3 个短片段"的下标——这种形态基本都是在列举 */
function shortEnumRuns(parts: string[]): Set<number> {
  const keep = new Set<number>()
  let run: number[] = []
  const flush = () => {
    if (run.length >= 3) run.forEach((i) => keep.add(i))
    run = []
  }
  parts.forEach((raw, i) => {
    const len = raw.trim().length
    if (len >= 2 && len <= 5) run.push(i)
    else flush()
  })
  flush()
  return keep
}

/** 去重：完全相同，或去掉标点后高度相似 */
function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of list) {
    const key = s.replace(/[^\p{L}\p{N}]/gu, '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

/** 把一批字幕净化成短句池 */
export function cuesToPhrases(cues: SrtCue[]): string[] {
  return dedupe(cues.flatMap((c) => cleanPhrases(c.text)))
}

/** 净化后的合并文本（用于特征判断） */
export function cuesToText(cues: SrtCue[]): string {
  return cuesToPhrases(cues).join(' ')
}

/** 承接上文的半句话：即使后面没有停顿，也不适合单独拎出来当标题 */
const CONTINUATION =
  /^(?:所以|其实|那么|然后|接着|而且|但是|不过|因为|如果|要是|虽然|那|这|这样|那样|结果|于是)/

/** 疑问 / 设问：点题句最常见的形态（"这么多模型该选哪一个"），比陈述句更适合当标题 */
const QUESTION = /[?？]|怎么|如何|为什么|哪[一个些]|该(?:怎么|如何)?(?:选|用)|多少|要不要|值不值/

/**
 * 从短语池里挑"最有信息量"的一条当标题。
 * 打分：含数字/信号词 +，长度 6~16 最优，纯口语扣分。
 */
export function pickHeadline(phrases: string[], fallback: string): string {
  if (!phrases.length) return fallback
  let best = phrases[0]
  let bestScore = -Infinity
  for (const p of phrases) {
    let score = 0
    // 只有"真实指标"才加分：型号里的数字（混元4）不代表信息量，
    // 否则含型号的句子会压过真正点题的句子
    if (metricNumbers(p).length) score += 3
    if (SIGNAL_WORDS.test(p)) score += 3
    // 抛问题 / 下判断的句子优先——"到底该选哪一个"比"现在大模型太多了"更像标题
    if (QUESTION.test(p)) score += 3
    const len = p.length
    // 6~16 字最适合当标题，偏离越多扣得越多；超过 20 字基本不适合当标题
    score += 6 - Math.abs(len - 11) * 0.5
    if (len > 20) score -= 6
    if (INTERJECTION.test(p)) score -= 4
    if (LEAD_CONNECTIVE.test(p)) score -= 2
    // "所以如果你主要是写代码" 这种是承接上文的半句话，不适合单独当标题
    if (CONTINUATION.test(p)) score -= 2
    if (TAIL_FILLER.test(p)) score -= 2
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}

/** 截断到指定长度（中文按字算，超出加省略号） */
export function clip(text: string, max: number): string {
  const s = text.trim()
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`
}
