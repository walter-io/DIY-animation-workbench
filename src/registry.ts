import type { EffectDef } from './types'
import CoreNumberRoller from './cards/data/CoreNumberRoller'
import CompareBars from './cards/compare/CompareBars'
import GoldenReveal from './cards/quote/GoldenReveal'
import SrtSubtitle from './cards/subtitle/SrtSubtitle'
import { BigTitleCard } from './cards/intro/BigTitle'
import { QuoteCard } from './cards/quote/Quote'
import { SectionHeaderCard } from './cards/intro/SectionHeader'
import { CtaCard } from './cards/outro/Cta'
import { BulletListCard } from './cards/list/BulletList'
import { LabelRowCard } from './cards/list/LabelRow'
import { KpiCard } from './cards/data/Kpi'
import { DualNumberCard } from './cards/compare/DualNumber'
import { ProgressBarCard } from './cards/data/ProgressBar'
import { RingCard } from './cards/data/Ring'
import { TrendCard } from './cards/data/Trend'
import { DataGridCard } from './cards/data/DataGrid'
import { RankCard } from './cards/data/Rank'
import { StackBarCard } from './cards/data/StackBar'
import { TimelineCard } from './cards/flow/Timeline'
import { StepsCard } from './cards/flow/Steps'
import { InfoBoardCard } from './cards/list/InfoBoard'
import { TwoColCard } from './cards/compare/TwoCol'
import { CompareTableCard } from './cards/compare/CompareTable'
import BarChartRace from './cards/data/BarChartRace'
import ChapterRoadmap from './cards/flow/ChapterRoadmap'
import ShowBracket from './cards/overlay/ShowBracket'
import CommandCard from './cards/overlay/CommandCard'
import LogoOrbiter from './cards/relation/LogoOrbiter'
import LogoSphere from './cards/relation/LogoSphere'
import BarChart3D from './cards/data/BarChart3D'
import OrbitCore from './cards/relation/OrbitCore'
import ConceptMap from './cards/relation/ConceptMap'
import ToolCrossout from './cards/compare/ToolCrossout'
import SrcVidHeroTitle from './cards/intro/SrcVidHeroTitle'
import SrcVidKeywordPop from './cards/quote/SrcVidKeywordPop'
import SrcVidNumberedRoadmap from './cards/flow/SrcVidNumberedRoadmap'
import SrcVidComparisonLines from './cards/compare/SrcVidComparisonLines'
import SrcVidCircularRelation from './cards/relation/SrcVidCircularRelation'
import SrcVidThreePipeline from './cards/flow/SrcVidThreePipeline'
import SrcVidFlowArrow from './cards/flow/SrcVidFlowArrow'
import SrcVidNegationBadge from './cards/quote/SrcVidNegationBadge'
import SrcVidStatementCard from './cards/quote/SrcVidStatementCard'
import SrcVidHumanAiDiagram from './cards/people/SrcVidHumanAiDiagram'
import SrcVidProfileCard from './cards/people/SrcVidProfileCard'
import SrcVidPhoneMockup from './cards/overlay/SrcVidPhoneMockup'
import SrcVidConsumptionChain from './cards/flow/SrcVidConsumptionChain'
import SrcVidClassificationTable from './cards/list/SrcVidClassificationTable'
import SrcVidConceptTrio from './cards/compare/SrcVidConceptTrio'
import SrcVidIpCircle from './cards/outro/SrcVidIpCircle'
import SrcVidEndCta from './cards/outro/SrcVidEndCta'
import SrcVidHugeNumberHero from './cards/intro/SrcVidHugeNumberHero'
import SrcVidTwinAppWindows from './cards/overlay/SrcVidTwinAppWindows'
import SrcVidBubbleChecklist from './cards/list/SrcVidBubbleChecklist'
import SrcVidProductCardStatus from './cards/overlay/SrcVidProductCardStatus'
import SrcVidTimelineFix from './cards/flow/SrcVidTimelineFix'
import SrcVidSmallCardGrid from './cards/list/SrcVidSmallCardGrid'
import SrcVidSafetyLocks from './cards/list/SrcVidSafetyLocks'
import SrcVidFlowChainNodes from './cards/flow/SrcVidFlowChainNodes'
import SrcVidFollowCta from './cards/outro/SrcVidFollowCta'
// 动效（来自 2026-09 两段源视频）
import ReplicaEyebrowCard from './cards/overlay/ReplicaEyebrowCard'
import ReplicaOrbitCluster from './cards/relation/ReplicaOrbitCluster'
import ReplicaOrbitRing from './cards/relation/ReplicaOrbitRing'
import ReplicaNumberStat from './cards/data/ReplicaNumberStat'
import ReplicaCodeWindow from './cards/overlay/ReplicaCodeWindow'
import ReplicaQuestionHeadline from './cards/intro/ReplicaQuestionHeadline'
import ReplicaEyebrowBanner from './cards/overlay/ReplicaEyebrowBanner'
import ReplicaBrandCard from './cards/overlay/ReplicaBrandCard'
import ReplicaMascotFigure from './cards/people/ReplicaMascotFigure'
import ReplicaHeadlineHighlight from './cards/intro/ReplicaHeadlineHighlight'
import ReplicaStepCard from './cards/flow/ReplicaStepCard'
import ReplicaStepList from './cards/flow/ReplicaStepList'
import ReplicaMascotArrowLoop from './cards/people/ReplicaMascotArrowLoop'
import ReplicaSectionDivider from './cards/intro/ReplicaSectionDivider'
import ReplicaIconBubble from './cards/decor/ReplicaIconBubble'
import ReplicaCtaPill from './cards/outro/ReplicaCtaPill'
import ReplicaIconCluster from './cards/decor/ReplicaIconCluster'
// 动效（来自 2026-09-09 第三段源视频）
import ReplicaSectionNav from './cards/overlay/ReplicaSectionNav'
import ReplicaRightClaim from './cards/quote/ReplicaRightClaim'
import ReplicaAnswerCard from './cards/quote/ReplicaAnswerCard'
import ReplicaVsHero from './cards/compare/ReplicaVsHero'
import ReplicaAbQuestion from './cards/compare/ReplicaAbQuestion'
import ReplicaPrevCard from './cards/overlay/ReplicaPrevCard'
import ReplicaSFlow from './cards/flow/ReplicaSFlow'
import ReplicaSectionShowcase from './cards/list/ReplicaSectionShowcase'
import ReplicaNumberedList from './cards/list/ReplicaNumberedList'
import ReplicaTimeCost from './cards/data/ReplicaTimeCost'
import ReplicaStatHero from './cards/data/ReplicaStatHero'
import ReplicaSideNote from './cards/overlay/ReplicaSideNote'
// 动效（来自 2026-09-09 第四段源视频，混色主题）
import ReplicaQuadTabsTile from './cards/overlay/ReplicaQuadTabsTile'
import ReplicaCostDashboard from './cards/data/ReplicaCostDashboard'
import ReplicaCostRows from './cards/compare/ReplicaCostRows'
import ReplicaChannelStack from './cards/list/ReplicaChannelStack'
import ReplicaTimelineSteps from './cards/flow/ReplicaTimelineSteps'
import ReplicaBracketStats from './cards/data/ReplicaBracketStats'
import ReplicaConfettiTiles from './cards/decor/ReplicaConfettiTiles'
import ReplicaFunnelConversion from './cards/data/ReplicaFunnelConversion'
import Replica2cardsVsGraphic from './cards/compare/Replica2cardsVsGraphic'
import ReplicaYellowBallBadge from './cards/quote/ReplicaYellowBallBadge'
// ===== 解说类动效卡（知识解说整页卡）=====
import ExplainerTitle from './cards/explain/ExplainerTitle'
import ExplainerSection from './cards/explain/ExplainerSection'
import ExplainerKeyPoint from './cards/explain/ExplainerKeyPoint'
import ExplainerTags from './cards/explain/ExplainerTags'
import ExplainerHighlight from './cards/explain/ExplainerHighlight'
import ExplainerChecklist from './cards/explain/ExplainerChecklist'
import ExplainerSteps from './cards/explain/ExplainerSteps'
import ExplainerVersus from './cards/explain/ExplainerVersus'
import ExplainerStat from './cards/explain/ExplainerStat'
import ExplainerEnd from './cards/explain/ExplainerEnd'
import BlankBoard from './cards/explain/BlankBoard'
// ===== 解说类元素卡（可自由叠加的零件）=====
import AtomHeadline from './cards/explain/atom/AtomHeadline'
import AtomSubhead from './cards/explain/atom/AtomSubhead'
import AtomEyebrow from './cards/explain/atom/AtomEyebrow'
import AtomNavyPill from './cards/explain/atom/AtomNavyPill'
import AtomTag from './cards/explain/atom/AtomTag'
import AtomAmberPill from './cards/explain/atom/AtomAmberPill'
import AtomNumberRow from './cards/explain/atom/AtomNumberRow'
import AtomStepChip from './cards/explain/atom/AtomStepChip'
import AtomArrow from './cards/explain/atom/AtomArrow'
import AtomBigNumber from './cards/explain/atom/AtomBigNumber'
import AtomCaption from './cards/explain/atom/AtomCaption'
import AtomRule from './cards/explain/atom/AtomRule'
import AtomParagraph from './cards/explain/atom/AtomParagraph'
import { hyperframesRegistry } from './hyperframes/registry'

export const registry: EffectDef[] = [
  // ===== 原有 3 张练手卡 =====
  {
    id: 'core-number-roller',
    name: '核心数字滚动',
    category: '数据',
    description: '大数字从 0 滚动到目标值，适合强调关键指标。',
    component: CoreNumberRoller,
    schema: [
      { key: 'label', label: '标签', type: 'text', default: '累计交付' },
      { key: 'target', label: '目标值', type: 'number', default: 12847, min: 0, max: 9999999, step: 1 },
      { key: 'suffix', label: '后缀', type: 'text', default: '+' },
      { key: 'duration', label: '时长(秒)', type: 'range', default: 2, min: 0.5, max: 5, step: 0.1 },
      { key: 'align', label: '对齐', type: 'select', default: 'center', options: ['left', 'center', 'right'] },
    ],
    defaultParams: { label: '累计交付', target: 12847, suffix: '+', duration: 2, align: 'center' },
  },
  {
    id: 'compare-bars',
    name: '左右对比条',
    category: '对比',
    description: '左右两项数值对比，用条形长度直观呈现差异。',
    component: CompareBars,
    schema: [
      { key: 'leftLabel', label: '左侧标签', type: 'text', default: '传统方案' },
      { key: 'rightLabel', label: '右侧标签', type: 'text', default: '新方案' },
      { key: 'leftValue', label: '左侧数值', type: 'number', default: 42, min: 0, max: 1000, step: 1 },
      { key: 'rightValue', label: '右侧数值', type: 'number', default: 88, min: 0, max: 1000, step: 1 },
      { key: 'unit', label: '单位', type: 'text', default: '%' },
      { key: 'duration', label: '时长(秒)', type: 'range', default: 1.5, min: 0.5, max: 5, step: 0.1 },
    ],
    defaultParams: { leftLabel: '传统方案', rightLabel: '新方案', leftValue: 42, rightValue: 88, unit: '%', duration: 1.5 },
  },
  {
    id: 'golden-reveal',
    name: '金句逐行揭示',
    category: '金句',
    description: '核心观点分多行依次淡入，制造节奏感。',
    component: GoldenReveal,
    schema: [
      { key: 'tag', label: '角标', type: 'text', default: '核心观点' },
      { key: 'lines', label: '金句(换行分隔)', type: 'text', default: '第一句金句\n第二句补充\n第三句收尾' },
      { key: 'duration', label: '时长(秒)', type: 'range', default: 2.5, min: 1, max: 6, step: 0.1 },
    ],
    defaultParams: { tag: '核心观点', lines: '第一句金句\n第二句补充\n第三句收尾', duration: 2.5 },
  },

  // ===== 文字/叙事类 =====
  {
    id: 'big-title',
    name: '大标题卡',
    category: '开场',
    description: '一句大字 + 副题，开场点题用。',
    component: BigTitleCard,
    schema: [
      { key: 'kicker', label: '眉头小字', type: 'text', default: '开场' },
      { key: 'title', label: '主标题', type: 'text', default: '一句话讲清价值' },
      { key: 'subtitle', label: '副标题', type: 'text', default: '副标题补充说明' },
    ],
    defaultParams: { kicker: '开场', title: '一句话讲清价值', subtitle: '副标题补充说明' },
  },
  {
    id: 'quote-card',
    name: '引用金句卡',
    category: '金句',
    description: '金句 + 署名，观点点睛。',
    component: QuoteCard,
    schema: [
      { key: 'quote', label: '金句', type: 'text', default: '把复杂留给系统，把简单留给人。' },
      { key: 'author', label: '署名', type: 'text', default: '—— 某某' },
    ],
    defaultParams: { quote: '把复杂留给系统，把简单留给人。', author: '—— 某某' },
  },
  {
    id: 'section-header',
    name: '段头卡',
    category: '开场',
    description: '章节编号 + 段名，一段口播的起始板（段落场景制）。',
    component: SectionHeaderCard,
    schema: [
      { key: 'num', label: '段编号', type: 'text', default: '01' },
      { key: 'title', label: '段名', type: 'text', default: '第一部分' },
      { key: 'subtitle', label: '段简介', type: 'text', default: '本段讲什么' },
    ],
    defaultParams: { num: '01', title: '第一部分', subtitle: '本段讲什么' },
  },
  {
    id: 'cta-card',
    name: '结尾行动卡',
    category: '结尾',
    description: '行动号召 + 按钮，视频收尾。',
    component: CtaCard,
    schema: [
      { key: 'text', label: '号召语', type: 'text', default: '关注我，下期继续' },
      { key: 'sub', label: '补充说明', type: 'text', default: '每周更新实战干货' },
      { key: 'btn', label: '按钮文字', type: 'text', default: '立即关注' },
    ],
    defaultParams: { text: '关注我，下期继续', sub: '每周更新实战干货', btn: '立即关注' },
  },
  {
    id: 'bullet-list',
    name: '要点清单卡',
    category: '列表',
    description: '多行圆点要点逐条入场。',
    component: BulletListCard,
    schema: [
      { key: 'title', label: '清单标题', type: 'text', default: '三个要点' },
      { key: 'items', label: '要点(换行分隔)', type: 'text', default: '第一点\n第二点\n第三点' },
    ],
    defaultParams: { title: '三个要点', items: '第一点\n第二点\n第三点' },
  },
  {
    id: 'label-row',
    name: '标签行卡',
    category: '列表',
    description: '多个胶囊标签逐个弹出，关键词罗列。',
    component: LabelRowCard,
    schema: [
      { key: 'labels', label: '标签(换行分隔)', type: 'text', default: '增长\n留存\n转化' },
    ],
    defaultParams: { labels: '增长\n留存\n转化' },
  },

  // ===== 数据类 =====
  {
    id: 'kpi-card',
    name: 'KPI 单指标',
    category: '数据',
    description: '标签 + 大数字 + 涨跌箭头。',
    component: KpiCard,
    schema: [
      { key: 'label', label: '指标名', type: 'text', default: '核心指标' },
      { key: 'target', label: '数值', type: 'number', default: 35800, min: 0, max: 9999999, step: 1 },
      { key: 'suffix', label: '后缀', type: 'text', default: '' },
      { key: 'unit', label: '单位说明', type: 'text', default: '' },
      { key: 'trend', label: '趋势', type: 'select', default: 'up', options: ['up', 'down'] },
    ],
    defaultParams: { label: '核心指标', target: 35800, suffix: '', unit: '', trend: 'up' },
  },
  {
    id: 'dual-number',
    name: '双数字对比',
    category: '对比',
    description: 'A vs B 两个大数字并排。',
    component: DualNumberCard,
    schema: [
      { key: 'leftLabel', label: '左标签', type: 'text', default: '上月' },
      { key: 'rightLabel', label: '右标签', type: 'text', default: '本月' },
      { key: 'left', label: '左数值', type: 'number', default: 1200, min: 0, max: 9999999, step: 1 },
      { key: 'right', label: '右数值', type: 'number', default: 3400, min: 0, max: 9999999, step: 1 },
    ],
    defaultParams: { leftLabel: '上月', rightLabel: '本月', left: 1200, right: 3400 },
  },
  {
    id: 'progress-bar',
    name: '进度条卡',
    category: '数据',
    description: '标题 + 百分比 + 进度轨道。',
    component: ProgressBarCard,
    schema: [
      { key: 'label', label: '标题', type: 'text', default: '目标完成度' },
      { key: 'pct', label: '百分比', type: 'range', default: 76, min: 0, max: 100, step: 1 },
      { key: 'color', label: '进度色', type: 'select', default: 'var(--stage-data)', options: ['var(--stage-data)', 'var(--stage-primary)', 'var(--stage-special)', 'var(--stage-assist)'] },
    ],
    defaultParams: { label: '目标完成度', pct: 76, color: 'var(--stage-data)' },
  },
  {
    id: 'ring-card',
    name: '环形百分比',
    category: '数据',
    description: 'SVG 圆环描边呈现占比。',
    component: RingCard,
    schema: [
      { key: 'label', label: '指标名', type: 'text', default: '转化率' },
      { key: 'pct', label: '百分比', type: 'range', default: 64, min: 0, max: 100, step: 1 },
      { key: 'sub', label: '补充说明', type: 'text', default: '较上期提升' },
    ],
    defaultParams: { label: '转化率', pct: 64, sub: '较上期提升' },
  },
  {
    id: 'trend-card',
    name: '趋势卡',
    category: '数据',
    description: '涨跌箭头 + 大数字幅度。',
    component: TrendCard,
    schema: [
      { key: 'label', label: '指标名', type: 'text', default: '周环比' },
      { key: 'value', label: '幅度(%)', type: 'number', default: 32, min: 0, max: 999, step: 1 },
      { key: 'trend', label: '方向', type: 'select', default: 'up', options: ['up', 'down'] },
    ],
    defaultParams: { label: '周环比', value: 32, trend: 'up' },
  },
  {
    id: 'data-grid',
    name: '数据网格 2x2',
    category: '数据',
    description: '四宫格指标，一行"名称,数值"。',
    component: DataGridCard,
    schema: [
      { key: 'items', label: '四项(名称,数值/行)', type: 'text', default: '新增用户,1200\n付费转化,8.4%\n次日留存,61%\n平均时长,7.5分' },
    ],
    defaultParams: { items: '新增用户,1200\n付费转化,8.4%\n次日留存,61%\n平均时长,7.5分' },
  },
  {
    id: 'rank-card',
    name: '排行榜 TOP3',
    category: '数据',
    description: '名次 + 条形长度，一行"名称,数值"。',
    component: RankCard,
    schema: [
      { key: 'rows', label: '三行(名称,数值)', type: 'text', default: '短视频,8600\n直播,5200\n图文,3100' },
    ],
    defaultParams: { rows: '短视频,8600\n直播,5200\n图文,3100' },
  },
  {
    id: 'stack-bar',
    name: '堆叠占比条',
    category: '数据',
    description: '两段颜色占比条，突出结构变化。',
    component: StackBarCard,
    schema: [
      { key: 'leftLabel', label: '左侧名', type: 'text', default: '老用户' },
      { key: 'rightLabel', label: '右侧名', type: 'text', default: '新用户' },
      { key: 'leftPct', label: '左侧占比%', type: 'range', default: 62, min: 0, max: 100, step: 1 },
    ],
    defaultParams: { leftLabel: '老用户', rightLabel: '新用户', leftPct: 62 },
  },

  // ===== 信息结构类 =====
  {
    id: 'timeline-card',
    name: '时间线卡',
    category: '流程',
    description: '多节点竖排时间点，一行"时间,事件"。',
    component: TimelineCard,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '关键节点' },
      { key: 'items', label: '节点(时间,事件/行)', type: 'text', default: '3月,项目启动\n5月,首版上线\n8月,用户破万' },
    ],
    defaultParams: { title: '关键节点', items: '3月,项目启动\n5月,首版上线\n8月,用户破万' },
  },
  {
    id: 'steps-card',
    name: '步骤流程卡',
    category: '流程',
    description: '编号圆圈 + 文案，一行"序号,步骤"。',
    component: StepsCard,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '三步上手' },
      { key: 'steps', label: '步骤(序号,文案/行)', type: 'text', default: '第一步,导入素材\n第二步,选择模板\n第三步,导出成品' },
    ],
    defaultParams: { title: '三步上手', steps: '第一步,导入素材\n第二步,选择模板\n第三步,导出成品' },
  },
  {
    id: 'info-board',
    name: '信息板卡',
    category: '列表',
    description: '标题 + 结论行，一段口播的信息板（段落场景制）。',
    component: InfoBoardCard,
    schema: [
      { key: 'title', label: '板标题', type: 'text', default: '本段要点板' },
      { key: 'rows', label: '结论(结论,依据/行)', type: 'text', default: '结论一,数据支撑充足\n结论二,路径已经跑通\n结论三,可复制可放大' },
    ],
    defaultParams: { title: '本段要点板', rows: '结论一,数据支撑充足\n结论二,路径已经跑通\n结论三,可复制可放大' },
  },
  {
    id: 'two-col',
    name: '双列清单卡',
    category: '对比',
    description: '优势 vs 短板两列对照。',
    component: TwoColCard,
    schema: [
      { key: 'leftTitle', label: '左列标题', type: 'text', default: '优势' },
      { key: 'rightTitle', label: '右列标题', type: 'text', default: '短板' },
      { key: 'left', label: '左列(换行分隔)', type: 'text', default: '上手快\n成本低' },
      { key: 'right', label: '右列(换行分隔)', type: 'text', default: '波动大\n依赖渠道' },
    ],
    defaultParams: { leftTitle: '优势', rightTitle: '短板', left: '上手快\n成本低', right: '波动大\n依赖渠道' },
  },
  {
    id: 'compare-table',
    name: '对比表卡',
    category: '对比',
    description: '两列三行简易对比表，一行"维度,A,B"。',
    component: CompareTableCard,
    schema: [
      { key: 'leftHead', label: '左表头', type: 'text', default: '旧方案' },
      { key: 'rightHead', label: '右表头', type: 'text', default: '新方案' },
      { key: 'rows', label: '行(维度,A,B/行)', type: 'text', default: '耗时,2 小时,10 分钟\n成本,高,低\n效果,一般,显著' },
    ],
    defaultParams: { leftHead: '旧方案', rightHead: '新方案', rows: '耗时,2 小时,10 分钟\n成本,高,低\n效果,一般,显著' },
  },

  // ===== 数据/章节类通用卡片 =====
  {
    id: 'bar-chart-race',
    name: '条形图竞速',
    category: '数据',
    description: '条形图竞速 + 排名侧板，适合排行榜或数据对比。',
    component: BarChartRace,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '区域数据竞速' },
      { key: 'subtitle', label: '副标题', type: 'text', default: '前十排名变化' },
      { key: 'rows', label: '数据行(名称,数值/行)', type: 'text', default: '华东,23320\n华南,17730\n华北,12400\n西南,8600\n东北,6200\n华中,5100\n西北,4300\n海外,3200' },
      { key: 'unit', label: '单位', type: 'text', default: '' },
      { key: 'color', label: '条形色', type: 'text', default: 'var(--stage-data)' },
      { key: 'showRank', label: '显示排名板', type: 'boolean', default: true },
      { key: 'size', label: '缩放', type: 'range', default: 1, min: 0.5, max: 1.5, step: 0.05 },
    ],
    defaultParams: {
      title: '区域数据竞速',
      subtitle: '前十排名变化',
      rows: '华东,23320\n华南,17730\n华北,12400\n西南,8600\n东北,6200\n华中,5100\n西北,4300\n海外,3200',
      unit: '',
      color: 'var(--stage-data)',
      showRank: true,
      size: 1,
    },
  },
  {
    id: 'chapter-roadmap',
    name: '章节路线图',
    category: '流程',
    description: '章节路线图，蜿蜒路径 + 脉冲节点 + 当前章节卡。',
    component: ChapterRoadmap,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '章节导航' },
      { key: 'subtitle', label: '副标题', type: 'text', default: '章节路线图' },
      { key: 'chapters', label: '章节(名称,描述/行)', type: 'text', default: '准备,需求梳理 / 项目启动\n制作,内容与素材搭建\n动画,时间轴与动效\n数据,图表与字幕\n导出,渲染成片' },
      { key: 'activeIndex', label: '高亮节点索引', type: 'number', default: 0, min: 0, max: 10, step: 1 },
      { key: 'size', label: '缩放', type: 'range', default: 1, min: 0.5, max: 1.5, step: 0.05 },
    ],
    defaultParams: {
      title: '章节导航',
      subtitle: '章节路线图',
      chapters: '准备,需求梳理 / 项目启动\n制作,内容与素材搭建\n动画,时间轴与动效\n数据,图表与字幕\n导出,渲染成片',
      activeIndex: 0,
      size: 1,
    },
  },

  // ===== 口播讲解类通用卡片 =====
  {
    id: 'show-bracket',
    name: '节目角标',
    category: '贴片',
    description: '左上节目角标：眉头小标签 + 主标 + 副标 + 段号 + 段名，持续显示节目/章节进度。',
    component: ShowBracket,
    schema: [
      { key: 'kicker', label: '眉头小标签', type: 'text', default: 'AI 内容工作流' },
      { key: 'title', label: '主标', type: 'text', default: '本期拆解' },
      { key: 'subtitle', label: '副标', type: 'text', default: '链接 · 内容 · 流程 · 越用越顺手' },
      { key: 'segNum', label: '段号', type: 'text', default: '01' },
      { key: 'segName', label: '段名', type: 'text', default: '开篇·建立认知' },
      { key: 'footnote', label: '底部小字（可空）', type: 'text', default: '' },
    ],
    defaultParams: {
      kicker: 'AI 内容工作流',
      title: '本期拆解',
      subtitle: '链接 · 内容 · 流程 · 越用越顺手',
      segNum: '01',
      segName: '开篇·建立认知',
      footnote: '',
    },
  },
  {
    id: 'command-card',
    name: '终端命令卡',
    category: '贴片',
    description: '命令/链接展示：眉头小标签 + 标题 + 命令内容 + 来源标签。',
    component: CommandCard,
    schema: [
      { key: 'kicker', label: '眉头小标签', type: 'text', default: '单条命令' },
      { key: 'title', label: '标题', type: 'text', default: '交给助手处理' },
      { key: 'hint', label: '提示说明（可空）', type: 'text', default: '' },
      { key: 'command', label: '命令/链接内容', type: 'text', default: 'https://example.com/xxx' },
      { key: 'sourceLabel', label: '来源标签', type: 'text', default: '链接' },
    ],
    defaultParams: {
      kicker: '单条命令',
      title: '交给助手处理',
      hint: '',
      command: 'https://example.com/xxx',
      sourceLabel: '链接',
    },
  },
  {
    id: 'logo-orbiter',
    name: 'AI 工具矩阵',
    category: '关系',
    description: '多个 logo 围绕中心公转并缓慢自转的环绕动效，适合展示工具集 / 产品矩阵 / 生态。',
    component: LogoOrbiter,
    schema: [
      { key: 'centerLabel', label: '中心标签', type: 'text', default: 'AI 工具' },
      { key: 'items', label: '图标列表(每行一个字符/emoji)', type: 'text', default: '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou' },
      { key: 'radius', label: '公转半径(px)', type: 'range', default: 220, min: 120, max: 360, step: 10 },
      { key: 'size', label: '图标直径(px)', type: 'range', default: 72, min: 40, max: 120, step: 4 },
      { key: 'orbitDuration', label: '公转周期(秒)', type: 'range', default: 20, min: 6, max: 40, step: 1 },
      { key: 'spinDuration', label: '自转周期(秒,负值反向)', type: 'range', default: 14, min: -40, max: 40, step: 1 },
    ],
    defaultParams: {
      centerLabel: 'AI 工具',
      items: '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou',
      radius: 220,
      size: 72,
      orbitDuration: 20,
      spinDuration: 14,
    },
  },

  // ===== 字幕类 =====
  {
    id: 'srt-subtitle',
    name: '口播字幕',
    category: '字幕',
    description: '一句一张卡：导入 .srt 口播稿后按断句拆成独立字幕卡，全部落在字幕轨上。',
    component: SrtSubtitle,
    schema: [
      { key: 'text', label: '本句文案', type: 'text', default: '' },
      { key: 'srt', label: '整轨 SRT（旧格式，拆分后留空）', type: 'text', default: '' },
      { key: 'fontSize', label: '字号', type: 'range', default: 44, min: 24, max: 80, step: 2 },
      { key: 'align', label: '对齐', type: 'select', default: 'center', options: ['left', 'center', 'right'] },
      { key: 'color', label: '文字色', type: 'color', default: '#ffffff' },
      { key: 'box', label: '背景条', type: 'boolean', default: true },
      { key: 'bg', label: '背景色', type: 'text', default: 'rgba(0,0,0,0.55)' },
    ],
    defaultParams: {
      text: '',
      srt: '',
      fontSize: 44,
      align: 'center',
      color: '#ffffff',
      box: true,
      bg: 'rgba(0,0,0,0.55)',
    },
  },
  {
    id: 'logo-sphere',
    name: 'AI 工具矩阵 3D',
    category: '关系',
    description: 'logo-orbiter 的 3D 球面版：图标黄金角均匀分布在 3D 球面，整体绕 Y 轴旋转，近大远小景深，适合产品/生态展示。',
    component: LogoSphere,
    schema: [
      { key: 'centerLabel', label: '中心标签', type: 'text', default: 'AI 工具' },
      { key: 'items', label: '图标列表(每行一个字符/emoji)', type: 'text', default: '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou' },
      { key: 'radius', label: '球面半径(px)', type: 'range', default: 240, min: 120, max: 380, step: 10 },
      { key: 'size', label: '图标直径(px)', type: 'range', default: 64, min: 40, max: 120, step: 4 },
      { key: 'tiltX', label: '球面倾斜(度)', type: 'range', default: 18, min: 0, max: 60, step: 2 },
      { key: 'rotateDuration', label: '绕轴周期(秒)', type: 'range', default: 24, min: 8, max: 60, step: 1 },
      { key: 'spinDuration', label: '图标自转(秒,0关)', type: 'range', default: 0, min: 0, max: 40, step: 1 },
    ],
    defaultParams: {
      centerLabel: 'AI 工具',
      items: '豆\n包\n剪\n映\n即\n梦\n通\n义\n文\n心\n智\n谱\nK\nIM\nI\nDou',
      radius: 240,
      size: 64,
      tiltX: 18,
      rotateDuration: 24,
      spinDuration: 0,
    },
  },

  // =====  1fe3d456... 视频动效 =====
  {
    id: 'bar-chart-3d',
    name: '3D 数据竞速',
    category: '数据',
    description: '3D 立体柱状竞速动画：柱子随数值排序、右侧排名侧板、年份角标，适合数据排行榜 / 增长对比。',
    component: BarChart3D,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '十国 GDP 竞速' },
      { key: 'subtitle', label: '副标题', type: 'text', default: '10 GDP RACE / 1990-2024' },
      { key: 'year', label: '年份', type: 'text', default: '2021' },
      { key: 'rows', label: '数据行(名称,数值,颜色/行)', type: 'text', default: '美国,26.9,#fbbf24\n中国,17.8,#ef4444\n日本,4.2,#f8fafc\n印度,3.5,#a78bfa\n德国,4.1,#60a5fa\n英国,3.3,#3b82f6\n法国,3.0,#34d399\n俄罗斯,2.0,#f87171' },
      { key: 'unit', label: '单位', type: 'text', default: 'T' },
      { key: 'showRank', label: '显示排名板', type: 'boolean', default: true },
      { key: 'size', label: '缩放', type: 'range', default: 1, min: 0.5, max: 1.5, step: 0.05 },
    ],
    defaultParams: {
      title: '十国 GDP 竞速',
      subtitle: '10 GDP RACE / 1990-2024',
      year: '2021',
      rows: '美国,26.9,#fbbf24\n中国,17.8,#ef4444\n日本,4.2,#f8fafc\n印度,3.5,#a78bfa\n德国,4.1,#60a5fa\n英国,3.3,#3b82f6\n法国,3.0,#34d399\n俄罗斯,2.0,#f87171',
      unit: 'T',
      showRank: true,
      size: 1,
    },
  },
  {
    id: 'orbit-core',
    name: '中心卫星环',
    category: '关系',
    description: '中心图标向外辐射公转关键词与连线，适合展示技术栈 / 能力矩阵 / 核心概念。',
    component: OrbitCore,
    schema: [
      { key: 'centerIcon', label: '中心图标', type: 'text', default: '▶' },
      { key: 'centerLabel', label: '中心主标', type: 'text', default: 'REMOTION' },
      { key: 'centerSub', label: '中心副标', type: 'text', default: 'CODE DRIVEN VIDEO ENGINE' },
      { key: 'items', label: '环绕项(换行分隔)', type: 'text', default: 'React\nSVG\nAudio\nTimeline\nExport\nFrames\nspring\ninterpolate' },
      { key: 'radius', label: '公转半径(px)', type: 'range', default: 200, min: 120, max: 340, step: 10 },
      { key: 'size', label: '项尺寸(px)', type: 'range', default: 62, min: 36, max: 110, step: 4 },
      { key: 'orbitDuration', label: '公转周期(秒)', type: 'range', default: 24, min: 8, max: 50, step: 1 },
      { key: 'spinDuration', label: '自转周期(秒,0关)', type: 'range', default: 0, min: 0, max: 40, step: 1 },
      { key: 'showLines', label: '显示辐射连线', type: 'boolean', default: true },
      { key: 'showRays', label: '显示背景射线', type: 'boolean', default: false },
    ],
    defaultParams: {
      centerIcon: '▶',
      centerLabel: 'REMOTION',
      centerSub: 'CODE DRIVEN VIDEO ENGINE',
      items: 'React\nSVG\nAudio\nTimeline\nExport\nFrames\nspring\ninterpolate',
      radius: 200,
      size: 62,
      orbitDuration: 24,
      spinDuration: 0,
      showLines: true,
      showRays: false,
    },
  },
  {
    id: 'concept-map',
    name: '概念放射图',
    category: '关系',
    description: '左侧代码面板、中心菱形节点、右侧输出节点的概念关系图，带流动连线，适合讲清「输入→处理→输出」。',
    component: ConceptMap,
    schema: [
      { key: 'leftTitle', label: '左面板标题', type: 'text', default: 'CODE DRIVER' },
      { key: 'codeLines', label: '代码行(换行分隔)', type: 'text', default: 'useCurrentFrame()\ninterpolate(frame)\n<Composition />\nspring({fps})\nreturn <Scene />\nprops -> motion' },
      { key: 'centerTitle', label: '中心标题', type: 'text', default: '大模型' },
      { key: 'centerSub', label: '中心英文', type: 'text', default: 'READS CODE' },
      { key: 'centerHint', label: '中心提示', type: 'text', default: '看懂代码' },
      { key: 'rightTitle', label: '右侧标题', type: 'text', default: '完成创作' },
      { key: 'outputs', label: '输出节点(换行分隔)', type: 'text', default: '字幕\n文案\n动效\n镜头\n导出' },
    ],
    defaultParams: {
      leftTitle: 'CODE DRIVER',
      codeLines: 'useCurrentFrame()\ninterpolate(frame)\n<Composition />\nspring({fps})\nreturn <Scene />\nprops -> motion',
      centerTitle: '大模型',
      centerSub: 'READS CODE',
      centerHint: '看懂代码',
      rightTitle: '完成创作',
      outputs: '字幕\n文案\n动效\n镜头\n导出',
    },
  },
  {
    id: 'tool-crossout',
    name: '工具替代卡',
    category: '对比',
    description: '旧方案被红色斜线划掉、新方案高亮出现的替代对比，适合「能力迁移 / 工具升级」叙事。',
    component: ToolCrossout,
    schema: [
      { key: 'title', label: '旧方案标题', type: 'text', default: '没条件用 Codex、Claude Code' },
      { key: 'subtitle', label: '旧方案副标题', type: 'text', default: '没关系，工作流不必停下。' },
      { key: 'oldTools', label: '旧工具(换行分隔)', type: 'text', default: 'Codex\nClaude Code' },
      { key: 'altTitle', label: '新方案标题', type: 'text', default: '国产的 TRAE Work、Qclaw、AutoClaw、CoPaw 全都能胜任' },
      { key: 'newTools', label: '新工具(换行分隔)', type: 'text', default: 'TRAE Work\nQclaw\nAutoClaw\nCoPaw' },
      { key: 'crossColor', label: '划线颜色', type: 'color', default: '#ef4444' },
    ],
    defaultParams: {
      title: '没条件用 Codex、Claude Code',
      subtitle: '没关系，工作流不必停下。',
      oldTools: 'Codex\nClaude Code',
      altTitle: '国产的 TRAE Work、Qclaw、AutoClaw、CoPaw 全都能胜任',
      newTools: 'TRAE Work\nQclaw\nAutoClaw\nCoPaw',
      crossColor: '#ef4444',
    },
  },

  // ===== 短视频叙事卡：从 57237cc5 逐帧逆向后重做的 17 张 =====
  // 命名与分类按"在成片里承担的作用"走，不再统一顶着"源视频·"前缀。
  {
    id: 'srcvid-hero-title',
    name: '开场霓虹主标题',
    category: '开场',
    description: '顶部居中霓虹大字 + 下划线擦入，开场第一眼把主题钉住。',
    component: SrcVidHeroTitle,
    schema: [
      { key: 'title', label: '主标题', type: 'text', default: '正式搬到台前' },
      { key: 'subtitle', label: '副标题', type: 'text', default: '一套个人IP内容工程的公开拆解' },
    ],
    defaultParams: { title: '正式搬到台前', subtitle: '一套个人IP内容工程的公开拆解' },
  },
  {
    id: 'srcvid-keyword-pop',
    name: '关键词弹跳高亮',
    category: '金句',
    description: '描边发光徽章弹跳入场，把一句话里的关键词单独拎出来强调。',
    component: SrcVidKeywordPop,
    schema: [
      { key: 'text', label: '关键词', type: 'text', default: '包括这一条' },
    ],
    defaultParams: { text: '包括这一条' },
  },
  {
    id: 'srcvid-numbered-roadmap',
    name: '底部编号路线',
    category: '流程',
    description: '底部编号条依次滑入，用 01 / 02 罗列并列要点。',
    component: SrcVidNumberedRoadmap,
    schema: [
      { key: 'items', label: '编号项(编号|文案/行)', type: 'text', default: '01|要点一\n02|要点二' },
    ],
    defaultParams: { items: '01|要点一\n02|要点二' },
  },
  {
    id: 'srcvid-comparison-lines',
    name: '反差对比双行',
    category: '对比',
    description: '两行文字对比，第二行换强调色，一句话制造反差。',
    component: SrcVidComparisonLines,
    schema: [
      { key: 'line1', label: '第一行', type: 'text', default: '工具越来越多' },
      { key: 'line2', label: '第二行(强调色)', type: 'text', default: '真正做出来的内容却没有变多' },
    ],
    defaultParams: { line1: '工具越来越多', line2: '真正做出来的内容却没有变多' },
  },
  {
    id: 'srcvid-circular-relation',
    name: '环形关系图',
    category: '关系',
    description: '中央圆 + 左右卫星 + 弧线连接，表达"这三者是同一件事"。',
    component: SrcVidCircularRelation,
    schema: [
      { key: 'center', label: '中心文案', type: 'text', default: '同一张图' },
      { key: 'left', label: '左侧卫星', type: 'text', default: '工具' },
      { key: 'right', label: '右侧卫星', type: 'text', default: '工作流' },
    ],
    defaultParams: { center: '同一张图', left: '工具', right: '工作流' },
  },
  {
    id: 'srcvid-three-pipeline',
    name: '三段生产链',
    category: '流程',
    description: '标题 + 三张卡横向排列，每张顶部高光条，讲清楚一条生产链。',
    component: SrcVidThreePipeline,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '这套工程的生产链' },
      { key: 'labels', label: '三卡片(逗号分隔)', type: 'text', default: '定位选题,文案表达,制作发布复盘' },
    ],
    defaultParams: { title: '这套工程的生产链', labels: '定位选题,文案表达,制作发布复盘' },
  },
  {
    id: 'srcvid-flow-arrow',
    name: '流程箭头串联',
    category: '流程',
    description: '横向节点 + 箭头依次点亮，表达前后承接关系。',
    component: SrcVidFlowArrow,
    schema: [
      { key: 'nodes', label: '节点(逗号分隔)', type: 'text', default: '这条视频,下一条视频' },
    ],
    defaultParams: { nodes: '这条视频,下一条视频' },
  },
  {
    id: 'srcvid-negation-badge',
    name: '否定徽章强调',
    category: '金句',
    description: '描边徽章缩放 + 抖动强调，用来否定一个常见误解。',
    component: SrcVidNegationBadge,
    schema: [
      { key: 'text', label: '徽章文案', type: 'text', default: '非一键生成' },
    ],
    defaultParams: { text: '非一键生成' },
  },
  {
    id: 'srcvid-statement-card',
    name: '金句观点卡',
    category: '金句',
    description: '居中大字观点卡 + 左右竖线，摆金句用。',
    component: SrcVidStatementCard,
    schema: [
      { key: 'text', label: '观点文字(换行)', type: 'text', default: 'AI 是放大创作者\n不是替代' },
    ],
    defaultParams: { text: 'AI 是放大创作者\n不是替代' },
  },
  {
    id: 'srcvid-human-ai-diagram',
    name: '人机分工对照图',
    category: '人物',
    description: '左右两面板对照 + 中间箭头穿梭，讲明白"谁负责做什么"。',
    component: SrcVidHumanAiDiagram,
    schema: [
      { key: 'leftTitle', label: '左面板标题', type: 'text', default: 'AI 协作者' },
      { key: 'rightTitle', label: '右面板标题', type: 'text', default: '人主导' },
      { key: 'leftItems', label: '左面板项(换行)', type: 'text', default: '资料研究\n结构整理\n制作执行' },
      { key: 'rightItems', label: '右面板项(换行)', type: 'text', default: '决定说什么\n判断与表达\n创意核心' },
    ],
    defaultParams: { leftTitle: 'AI 协作者', rightTitle: '人主导', leftItems: '资料研究\n结构整理\n制作执行', rightItems: '决定说什么\n判断与表达\n创意核心' },
  },
  {
    id: 'srcvid-profile-card',
    name: '人物画像卡',
    category: '人物',
    description: '标题 + 子弹点列表逐条滑入，介绍一个人或一个定位。',
    component: SrcVidProfileCard,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '别人记住你的是' },
      { key: 'items', label: '要点(换行)', type: 'text', default: '你的经历\n你的判断和表达方式\n画面和动效只是辅助理解' },
    ],
    defaultParams: { title: '别人记住你的是', items: '你的经历\n你的判断和表达方式\n画面和动效只是辅助理解' },
  },
  {
    id: 'srcvid-phone-mockup',
    name: '手机竖屏预览',
    category: '贴片',
    description: '竖向手机 / 社媒帖子从左侧滑入，展示成品画面。',
    component: SrcVidPhoneMockup,
    schema: [],
    defaultParams: {},
  },
  {
    id: 'srcvid-consumption-chain',
    name: '想法消耗链路',
    category: '流程',
    description: '标题 + 三节点横向流程，连线自左向右生长，讲成本消耗在哪。',
    component: SrcVidConsumptionChain,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '想法到发布的消耗链' },
      { key: 'nodes', label: '节点(逗号分隔)', type: 'text', default: '资料整理,文案成型,画面制作' },
    ],
    defaultParams: { title: '想法到发布的消耗链', nodes: '资料整理,文案成型,画面制作' },
  },
  {
    id: 'srcvid-classification-table',
    name: '人群分类表',
    category: '列表',
    description: '逐行展开的表格：一列标签 + 一段描述，讲受众分类。',
    component: SrcVidClassificationTable,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '适合三类人' },
      { key: 'rows', label: '行(标签|描述/行)', type: 'text', default: '第一类|有专业能力和观点，但无法稳定输出的人\n第二类|已在做个人IP，但每条内容都要从头开始的人\n第三类|有产品、有业务，希望通过内容建立信任的人' },
    ],
    defaultParams: { title: '适合三类人', rows: '第一类|有专业能力和观点，但无法稳定输出的人\n第二类|已在做个人IP，但每条内容都要从头开始的人\n第三类|有产品、有业务，希望通过内容建立信任的人' },
  },
  {
    id: 'srcvid-concept-trio',
    name: '概念对比三卡',
    category: '对比',
    description: '标题 + 三张卡并排，中间那张高亮，做概念对比。',
    component: SrcVidConceptTrio,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '不是说明书，是进化中的记录' },
      { key: 'cards', label: '三卡片(逗号分隔)', type: 'text', default: '说明书,进化记录,持续迭代' },
      { key: 'activeIndex', label: '高亮索引', type: 'number', default: 1, min: 0, max: 2, step: 1 },
    ],
    defaultParams: { title: '不是说明书，是进化中的记录', cards: '说明书,进化记录,持续迭代', activeIndex: 1 },
  },
  {
    id: 'srcvid-ip-circle',
    name: 'IP 圆环总结',
    category: '结尾',
    description: '中心圆 + 三个卫星标签，结尾做总结收束。',
    component: SrcVidIpCircle,
    schema: [
      { key: 'centerCn', label: '中心中文', type: 'text', default: 'IP内容工程' },
      { key: 'centerEn', label: '中心英文', type: 'text', default: 'CONTENT ENGINE' },
      { key: 'satellites', label: '卫星标签(逗号分隔)', type: 'text', default: '复盘迭代,输出作品,沉淀系统' },
    ],
    defaultParams: { centerCn: 'IP内容工程', centerEn: 'CONTENT ENGINE', satellites: '复盘迭代,输出作品,沉淀系统' },
  },
  {
    id: 'srcvid-end-cta',
    name: '结尾三连引导',
    category: '结尾',
    description: '点赞 / 评论 / 收藏图标 + 频道名，结尾引导互动。',
    component: SrcVidEndCta,
    schema: [
      { key: 'name', label: '频道名', type: 'text', default: 'C哥OPC' },
      { key: 'icons', label: '图标(逗号分隔)', type: 'text', default: '赞,评,藏' },
    ],
    defaultParams: { name: 'C哥OPC', icons: '赞,评,藏' },
  },

  // =====  3372ed94... Claude Code 提效口播（46.87s）的 9 张 =====
  // 命名按"功能作用"走，与上一批 17 张同规约。
  {
    id: 'srcvid-huge-number-hero',
    name: '巨型数字开场',
    category: '开场',
    description: '巨型黄绿数字 + 柔光晕 + 四角 L 形取景框 + 顶部眉头 chip，开场第一眼钉主题。',
    component: SrcVidHugeNumberHero,
    schema: [
      { key: 'number', label: '主数字', type: 'text', default: '90%' },
      { key: 'caption', label: '数字下方小字', type: 'text', default: '的人只拿它聊天' },
      { key: 'chipLeft', label: '左上 chip', type: 'text', default: '01 · 开场' },
      { key: 'chipRight', label: '右上 chip', type: 'text', default: 'Codex 插件 ×5' },
    ],
    defaultParams: { number: '90%', caption: '的人只拿它聊天', chipLeft: '01 · 开场', chipRight: 'Codex 插件 ×5' },
  },
  {
    id: 'srcvid-twin-app-windows',
    name: '双应用窗口并列',
    category: '贴片',
    description: '两张深色应用窗口卡左右并排，macOS 红黄绿点 + 内容区 + 黄绿按钮 + 状态 pill + 鼠标点击动画。',
    component: SrcVidTwinAppWindows,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: 'Computer Use · 看屏幕找按钮' },
      { key: 'leftTitle', label: '左卡标题', type: 'text', default: '销售数据.xlsx' },
      { key: 'leftRows', label: '左卡行(换行)', type: 'text', default: '件\n件\n件' },
      { key: 'leftBtn', label: '左卡按钮', type: 'text', default: '导出报表' },
      { key: 'leftTag', label: '左卡 pill', type: 'text', default: '√ 1' },
      { key: 'rightTitle', label: '右卡标题', type: 'text', default: '网页后台 · 商品管理' },
      { key: 'rightRows', label: '右卡行(换行)', type: 'text', default: 'SKU-01 库存 420\nSKU-02 库存 138\nSKU-03 库存 976' },
      { key: 'rightBtn', label: '右卡按钮', type: 'text', default: '同步库存' },
      { key: 'rightTags', label: '右卡 pills(逗号)', type: 'text', default: '√ 2,√ 3' },
    ],
    defaultParams: {
      title: 'Computer Use · 看屏幕找按钮',
      leftTitle: '销售数据.xlsx',
      leftRows: '件\n件\n件',
      leftBtn: '导出报表',
      leftTag: '√ 1',
      rightTitle: '网页后台 · 商品管理',
      rightRows: 'SKU-01 库存 420\nSKU-02 库存 138\nSKU-03 库存 976',
      rightBtn: '同步库存',
      rightTags: '√ 2,√ 3',
    },
  },
  {
    id: 'srcvid-bubble-checklist',
    name: '气泡加方案清单',
    category: '列表',
    description: '左侧 1-2 条白底圆角对话气泡 + 右侧深色"方案清单"卡(带 ✅ 圆点逐条出现) + 底部旧/新文案对比。',
    component: SrcVidBubbleChecklist,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: 'Superpowers · 先问清再写' },
      { key: 'bubbles', label: '左侧气泡(换行)', type: 'text', default: '做成什么样？\n数据源用哪个？' },
      { key: 'listTitle', label: '清单卡标题', type: 'text', default: '方案清单 · 写完再动手' },
      { key: 'items', label: '清单项(换行)', type: 'text', default: '① 明确需求\n② 整理方案\n③ 再写代码' },
      { key: 'oldLine', label: '底部旧文案(划掉)', type: 'text', default: '做一半才发现方向错了' },
      { key: 'newLine', label: '底部新文案(绿色)', type: 'text', default: '方向对了再动手' },
    ],
    defaultParams: {
      title: 'Superpowers · 先问清再写',
      bubbles: '做成什么样？\n数据源用哪个？',
      listTitle: '方案清单 · 写完再动手',
      items: '① 明确需求\n② 整理方案\n③ 再写代码',
      oldLine: '做一半才发现方向错了',
      newLine: '方向对了再动手',
    },
  },
  {
    id: 'srcvid-product-card-status',
    name: '产品卡加状态药丸',
    category: '贴片',
    description: '左侧大深色产品预览(白色物体 + 阴影) + 右侧说明 + 绿色状态 pill，物体上下浮动轻旋转。',
    component: SrcVidProductCardStatus,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: 'HyperFrames · 自然语言做视频' },
      { key: 'chipTop', label: '顶部 chip', type: 'text', default: 'HyperFrames 预览 · 动态产品卡' },
      { key: 'itemTitle', label: '右侧主标', type: 'text', default: '杯子旋转展示' },
      { key: 'itemSub', label: '右侧副文', type: 'text', default: '渲染中 · 元素持续运动' },
      { key: 'pill', label: '状态 pill', type: 'text', default: '第 5 秒 · 阴影已补 √' },
    ],
    defaultParams: {
      title: 'HyperFrames · 自然语言做视频',
      chipTop: 'HyperFrames 预览 · 动态产品卡',
      itemTitle: '杯子旋转展示',
      itemSub: '渲染中 · 元素持续运动',
      pill: '第 5 秒 · 阴影已补 √',
    },
  },
  {
    id: 'srcvid-timeline-fix',
    name: '时间轴加自动修正',
    category: '流程',
    description: '产品预览 + 底部水平时间轴 0-Ns 刻度 + active 处高亮 + 绿色"已自动修正 √" pill + 顶部提示气泡。',
    component: SrcVidTimelineFix,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: 'HyperFrames · 自然语言做视频' },
      { key: 'chipTop', label: '顶部 chip', type: 'text', default: 'HyperFrames 预览 · 动态产品卡' },
      { key: 'itemTitle', label: '产品名', type: 'text', default: '杯子旋转展示' },
      { key: 'itemSub', label: '产品副文', type: 'text', default: '渲染中 · 元素持续运动' },
      { key: 'totalSec', label: '时间轴总秒数', type: 'number', default: 8, min: 2, max: 30, step: 1 },
      { key: 'activeSec', label: '高亮秒', type: 'number', default: 5, min: 0, max: 30, step: 1 },
      { key: 'fixedText', label: '修正 pill 文案', type: 'text', default: '已自动修正 √' },
      { key: 'bubbleText', label: '顶部提示气泡', type: 'text', default: '做一个杯子旋转展示' },
    ],
    defaultParams: {
      title: 'HyperFrames · 自然语言做视频',
      chipTop: 'HyperFrames 预览 · 动态产品卡',
      itemTitle: '杯子旋转展示',
      itemSub: '渲染中 · 元素持续运动',
      totalSec: 8,
      activeSec: 5,
      fixedText: '已自动修正 √',
      bubbleText: '做一个杯子旋转展示',
    },
  },
  {
    id: 'srcvid-small-card-grid',
    name: '小卡网格',
    category: '列表',
    description: '标题 + 多张等宽小卡网格(2-3 列)，每张：图标 + 标题 + 副文，依次滑入。',
    component: SrcVidSmallCardGrid,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: 'Cheree · 搜索端到项目' },
      { key: 'cols', label: '列数', type: 'number', default: 3, min: 2, max: 4, step: 1 },
      { key: 'cards', label: '小卡(标题,副文/行)', type: 'text', default: '洞察主题,AI 行业全景\n市场分析,2026 趋势\n消费者,3 类人群\n产品定位,差异化卖点\n增长策略,渠道与节奏\n内容矩阵,选题库\n投放方案,预算与回报\n团队搭建,3 人即可\nOKR,季度目标\n复盘节奏,周报月报\n风险清单,5 个高发\n下一步,立刻开工' },
    ],
    defaultParams: {
      title: 'Cheree · 搜索端到项目',
      cols: 3,
      cards: '洞察主题,AI 行业全景\n市场分析,2026 趋势\n消费者,3 类人群\n产品定位,差异化卖点\n增长策略,渠道与节奏\n内容矩阵,选题库\n投放方案,预算与回报\n团队搭建,3 人即可\nOKR,季度目标\n复盘节奏,周报月报\n风险清单,5 个高发\n下一步,立刻开工',
    },
  },
  {
    id: 'srcvid-safety-locks',
    name: '安全边界四档',
    category: '列表',
    description: '红色边框卡"AI 不能自己做的事" + 4 个风险等级色块(红/黄/绿/紫)，先灰锁缩放进入 → 一项项变色亮起。',
    component: SrcVidSafetyLocks,
    schema: [
      { key: 'chipTop', label: '顶部 chip', type: 'text', default: '07 · 安全边界' },
      { key: 'title', label: '主标题', type: 'text', default: '安全边界 · 这四步由你确认' },
      { key: 'cardTitle', label: '红框卡标题', type: 'text', default: 'AI 不能自己做的事' },
      { key: 'items', label: '四项(标题,等级,颜色/行)', type: 'text', default: '登录,高风险,#ef4444\n付款,高风险,#f97316\n删除,中风险,#eab308\n正式发布,中风险,#a855f7' },
    ],
    defaultParams: {
      chipTop: '07 · 安全边界',
      title: '安全边界 · 这四步由你确认',
      cardTitle: 'AI 不能自己做的事',
      items: '登录,高风险,#ef4444\n付款,高风险,#f97316\n删除,中风险,#eab308\n正式发布,中风险,#a855f7',
    },
  },
  {
    id: 'srcvid-flow-chain-nodes',
    name: '流程节点串联',
    category: '流程',
    description: '3 个深色圆角节点横向排列 + 黄绿连接线(自左向右生长) + 节点上方状态 pill + 末尾虚线"更多流程 +"。',
    component: SrcVidFlowChainNodes,
    schema: [
      { key: 'chipTop', label: '顶部 chip', type: 'text', default: '08 · 上手路径' },
      { key: 'title', label: '主标题', type: 'text', default: '上手路径 · 先跑通再扩展' },
      { key: 'nodes', label: '节点(文案,状态,上方pill/行)', type: 'text', default: '重复流程,pending,\n跑起来,done,\n检查结果,done,结果容易检查 √' },
      { key: 'moreText', label: '末尾更多', type: 'text', default: '更多流程 +' },
    ],
    defaultParams: {
      chipTop: '08 · 上手路径',
      title: '上手路径 · 先跑通再扩展',
      nodes: '重复流程,pending,\n跑起来,done,\n检查结果,done,结果容易检查 √',
      moreText: '更多流程 +',
    },
  },
  {
    id: 'srcvid-follow-cta',
    name: '关注我结尾卡',
    category: '结尾',
    description: '深色圆角大卡 + 顶部黄绿高亮横条 + 巨字标题 + 副文 + 圆点分页指示器(1 高亮)。',
    component: SrcVidFollowCta,
    schema: [
      { key: 'chipTop', label: '顶部 chip', type: 'text', default: '09 · 关注' },
      { key: 'title', label: '巨字标题', type: 'text', default: '关注我' },
      { key: 'subtitle', label: '副文', type: 'text', default: '带你学习更多 AI 技巧' },
      { key: 'total', label: '分页指示器数', type: 'number', default: 5, min: 2, max: 10, step: 1 },
    ],
    defaultParams: {
      chipTop: '09 · 关注',
      title: '关注我',
      subtitle: '带你学习更多 AI 技巧',
      total: 5,
    },
  },

  // ===== hyperframes-motion-library 动效库（23 个模板，自动同步）=====
  ...hyperframesRegistry,

  // ===== 动效（来自 2026-09 两段源视频）=====
  {
    id: 'replica-eyebrow-card',
    name: '左上小标签',
    category: '贴片',
    description: '左上方小标签 + 灰色副标，单行排版，模拟"小提示/小备注"卡片。',
    component: ReplicaEyebrowCard,
    schema: [
      { key: 'main', label: '主标签', type: 'text', default: '万能 Skill' },
      { key: 'sub', label: '副标签', type: 'text', default: '正在变成黑盒' },
    ],
    defaultParams: { main: '万能 Skill', sub: '正在变成黑盒' },
  },
  {
    id: 'replica-orbit-cluster',
    name: '编排关系簇',
    category: '关系',
    description: '中央椭圆概念 + 左右两组卫星项（4+4），虚线连接，模拟"输入→编排→产出"链路。',
    component: ReplicaOrbitCluster,
    schema: [
      { key: 'center', label: '中央文字（\\n 换行）', type: 'text', default: '编排\n关系' },
      { key: 'leftItems', label: '左侧项（逗号分隔）', type: 'text', default: '文章,口播,封面,数据' },
      { key: 'rightItems', label: '右侧项（逗号分隔）', type: 'text', default: '输入,产物,交接,回流' },
      { key: 'leftColor', label: '左侧色', type: 'color', default: 'var(--stage-special)' },
      { key: 'rightColor', label: '右侧色', type: 'color', default: 'var(--stage-data)' },
    ],
    defaultParams: {
      center: '编排\n关系',
      leftItems: '文章,口播,封面,数据',
      rightItems: '输入,产物,交接,回流',
      leftColor: 'var(--stage-special)',
      rightColor: 'var(--stage-data)',
    },
  },
  {
    id: 'replica-orbit-ring',
    name: '系统环卫星',
    category: '关系',
    description: '中央 2 行概念 + 椭圆环 8 颗胶囊围绕，模拟"导演/系统"全景展示。',
    component: ReplicaOrbitRing,
    schema: [
      { key: 'center', label: '中央文字（\\n 换行）', type: 'text', default: '导演\n系统' },
      {
        key: 'items',
        label: '环绕项（最多 12 个）',
        type: 'text',
        default: '选题判断,文章沉淀,口播转换,封面VFX,数据复盘,发布填稿,策略回写,下次脚本',
      },
    ],
    defaultParams: {
      center: '导演\n系统',
      items: '选题判断,文章沉淀,口播转换,封面VFX,数据复盘,发布填稿,策略回写,下次脚本',
    },
  },
  {
    id: 'replica-number-stat',
    name: '数字 + 指标行',
    category: '数据',
    description: '左侧巨型数字 + 黄色下划线，右侧圆形瞄准镜图标，下方斜杠分隔的小指标。',
    component: ReplicaNumberStat,
    schema: [
      { key: 'value', label: '主数字', type: 'text', default: '5s' },
      { key: 'metrics', label: '指标（/ 分隔）', type: 'text', default: '完播/点赞/分享/转粉' },
      {
        key: 'icon',
        label: '右侧图标',
        type: 'select',
        default: 'crosshair',
        options: ['crosshair', 'none'],
      },
    ],
    defaultParams: { value: '5s', metrics: '完播/点赞/分享/转粉', icon: 'crosshair' },
  },
  {
    id: 'replica-code-window',
    name: '代码窗口',
    category: '贴片',
    description: '左上方浮动小 UI 截图窗口，描边发光，模拟"网页截图/官方文档"引用。',
    component: ReplicaCodeWindow,
    schema: [
      { key: 'header', label: '窗口顶部', type: 'text', default: 'OPENAI ACADEMY / Skills' },
      { key: 'title', label: '窗口标题', type: 'text', default: 'Introducing skills in ChatGPT' },
      { key: 'lines', label: '正文行（逗号分隔）', type: 'text', default: 'Skills are lists of instructions.,可以保存并重复执行,作为 ChatGPT 的常用模块' },
    ],
    defaultParams: {
      header: 'OPENAI ACADEMY / Skills',
      title: 'Introducing skills in ChatGPT',
      lines: 'Skills are lists of instructions.,可以保存并重复执行,作为 ChatGPT 的常用模块',
    },
  },
  {
    id: 'replica-question-headline',
    name: '大问句标题',
    category: '开场',
    description: '居中超大白字问句 + 彩色径向光晕 + 下方双语小字副标题。',
    component: ReplicaQuestionHeadline,
    schema: [
      { key: 'question', label: '问句', type: 'text', default: '管一步，还是管编排?' },
      { key: 'subtitle', label: '副标（\\n 换行）', type: 'text', default: 'skill 解决的是这一步怎么稳定做好' },
    ],
    defaultParams: {
      question: '管一步，还是管编排?',
      subtitle: 'skill 解决的是这一步怎么稳定做好',
    },
  },
  {
    id: 'replica-eyebrow-banner',
    name: '眉条横幅',
    category: '贴片',
    description: '左上圆角胶囊眉条，左侧色条 + 英文 eyebrow + 中文副标，6 种强调色可换。',
    component: ReplicaEyebrowBanner,
    schema: [
      { key: 'eyebrow', label: '英文 eyebrow', type: 'text', default: 'WHY PEOPLE STOP' },
      { key: 'subtitle', label: '中文副标', type: 'text', default: '不是不想拍，是先被工具劝退' },
      {
        key: 'tone',
        label: '强调色',
        type: 'select',
        default: 'cyan',
        options: ['cyan', 'purple', 'red', 'green', 'yellow', 'primary'],
      },
    ],
    defaultParams: {
      eyebrow: 'WHY PEOPLE STOP',
      subtitle: '不是不想拍，是先被工具劝退',
      tone: 'cyan',
    },
  },
  {
    id: 'replica-brand-card',
    name: '顶部品牌卡',
    category: '贴片',
    description: '顶部品牌卡（logo + 角标 + 品牌名）+ 下方强调色 pill 标签。',
    component: ReplicaBrandCard,
    schema: [
      { key: 'brandLabel', label: '角标', type: 'text', default: 'OPENAI CODING AGENT' },
      { key: 'brandName', label: '品牌名', type: 'text', default: 'Codex' },
      { key: 'pillText', label: '下方 pill', type: 'text', default: '零熬夜' },
      { key: 'logoBg', label: 'logo 底色', type: 'color', default: 'var(--stage-primary)' },
      { key: 'logoColor', label: 'logo 字色', type: 'color', default: 'var(--stage-text)' },
    ],
    defaultParams: {
      brandLabel: 'OPENAI CODING AGENT',
      brandName: 'Codex',
      pillText: '零熬夜',
      logoBg: 'var(--stage-primary)',
      logoColor: 'var(--stage-text)',
    },
  },
  {
    id: 'replica-mascot-figure',
    name: '卡通人物卡',
    category: '人物',
    description: '紫色卡通人物（可带 X 标）+ 紫色视频播放器卡组合，模拟"角色对话"画面。',
    component: ReplicaMascotFigure,
    schema: [
      {
        key: 'crosshair',
        label: '头顶 X 标',
        type: 'select',
        default: 'true',
        options: ['true', 'false'],
      },
    ],
    defaultParams: { crosshair: 'true' },
  },
  {
    id: 'replica-headline-highlight',
    name: '双行高亮标题',
    category: '开场',
    description: '左上两行大标题，第 2 行带强调色背景条（6 色可选）。',
    component: ReplicaHeadlineHighlight,
    schema: [
      { key: 'line1', label: '第 1 行', type: 'text', default: '打开软件那一刻' },
      { key: 'line2', label: '第 2 行（高亮）', type: 'text', default: '像一张空白考卷' },
      {
        key: 'tone',
        label: '高亮色',
        type: 'select',
        default: 'cyan',
        options: ['cyan', 'purple', 'red', 'green', 'yellow', 'primary'],
      },
    ],
    defaultParams: {
      line1: '打开软件那一刻',
      line2: '像一张空白考卷',
      tone: 'cyan',
    },
  },
  {
    id: 'replica-step-card',
    name: '单条步骤卡',
    category: '流程',
    description: '单条步骤卡（编号 + 图标 + 标题 + 副标），圆角矩形深色背景。',
    component: ReplicaStepCard,
    schema: [
      { key: 'index', label: '编号', type: 'text', default: '01' },
      {
        key: 'icon',
        label: '图标',
        type: 'select',
        default: 'play',
        options: ['play', 'folder', 'bookmark', 'gear', 'time', 'doc'],
      },
      { key: 'title', label: '标题', type: 'text', default: '说需求' },
      { key: 'subtitle', label: '副标', type: 'text', default: '素材在哪·讲什么·突出哪句' },
    ],
    defaultParams: {
      index: '01',
      icon: 'play',
      title: '说需求',
      subtitle: '素材在哪·讲什么·突出哪句',
    },
  },
  {
    id: 'replica-step-list',
    name: '步骤堆叠列表',
    category: '流程',
    description: '垂直堆叠 3 条步骤卡，模拟"并列 3 点要点"。',
    component: ReplicaStepList,
    schema: [
      {
        key: 'items',
        label: '条目（标题|副标|图标，逗号分隔）',
        type: 'text',
        default:
          '满屏轨道|先搞懂时间线|play,工具和关键帧|还没动手·先被术语淹没|gear,收藏的教程|一个都没看完|bookmark',
      },
    ],
    defaultParams: {
      items:
        '满屏轨道|先搞懂时间线|play,工具和关键帧|还没动手·先被术语淹没|gear,收藏的教程|一个都没看完|bookmark',
    },
  },
  {
    id: 'replica-mascot-arrow-loop',
    name: '人物环绕箭头',
    category: '人物',
    description: '中央卡通人物（人形/挂锁）+ 4 段弧形箭头从四面环绕指向中心。',
    component: ReplicaMascotArrowLoop,
    schema: [
      { key: 'color', label: '主色', type: 'color', default: 'var(--stage-primary)' },
      {
        key: 'mascot',
        label: '中央图形',
        type: 'select',
        default: 'figure',
        options: ['figure', 'lock'],
      },
    ],
    defaultParams: { color: 'var(--stage-primary)', mascot: 'figure' },
  },
  {
    id: 'replica-section-divider',
    name: '分段小标题',
    category: '开场',
    description: '居中两行小标题（弱化上一行 + 强化下一行）+ 黄色分隔线 + 副标。',
    component: ReplicaSectionDivider,
    schema: [
      { key: 'line1', label: '上行小字', type: 'text', default: '第一步，拆新手' },
      { key: 'line2', label: '下行主标', type: 'text', default: '甲方的活' },
      { key: 'hint', label: '副标（可空）', type: 'text', default: '先让 Codex 听懂你的话' },
    ],
    defaultParams: {
      line1: '第一步，拆新手',
      line2: '甲方的活',
      hint: '先让 Codex 听懂你的话',
    },
  },
  {
    id: 'replica-icon-bubble',
    name: '图标对话气泡',
    category: '装饰',
    description: '右上方圆角对话气泡（带小尾巴）+ 内含 3 个图标（视频/文档/音频）。',
    component: ReplicaIconBubble,
    schema: [
      { key: 'color', label: '气泡色', type: 'color', default: 'var(--stage-data)' },
      { key: 'icons', label: '图标（逗号分隔）', type: 'text', default: 'video,doc,audio' },
    ],
    defaultParams: { color: 'var(--stage-data)', icons: 'video,doc,audio' },
  },
  {
    id: 'replica-cta-pill',
    name: 'CTA 胶囊按钮',
    category: '结尾',
    description: '强调色长条胶囊按钮 + 左侧小圆点 + 主文本 + 右侧副标，CTA 风格。',
    component: ReplicaCtaPill,
    schema: [
      { key: 'text', label: '主文本', type: 'text', default: '剪辑自由，没想象中那么难' },
      { key: 'hint', label: '副标', type: 'text', default: '现在就试' },
      {
        key: 'tone',
        label: '强调色',
        type: 'select',
        default: 'primary',
        options: ['cyan', 'purple', 'red', 'green', 'yellow', 'primary'],
      },
    ],
    defaultParams: {
      text: '剪辑自由，没想象中那么难',
      hint: '现在就试',
      tone: 'primary',
    },
  },
  {
    id: 'replica-icon-cluster',
    name: '大图标组',
    category: '装饰',
    description: '右上角彩色卡通图标组合 — 圆环 + 挂锁 + 播放按钮 + 散布短线装饰。',
    component: ReplicaIconCluster,
    schema: [
      { key: 'color', label: '主色', type: 'color', default: 'var(--stage-data)' },
    ],
    defaultParams: { color: 'var(--stage-data)' },
  },

  // ===== 动效 · 第二批（2026-09-09 第三段源视频，橙金主题）=====
  {
    id: 'replica-section-nav',
    name: '章节导航条',
    category: '贴片',
    description: '顶部横排章节标签 + 贯穿下划线，橙色圆点滑到当前章节下方（全片结构感）。',
    component: ReplicaSectionNav,
    schema: [
      { key: 'items', label: '章节（逗号分隔）', type: 'text', default: '剪辑,工作流,成本账单,二次测试' },
      { key: 'activeIndex', label: '当前章节序号', type: 'number', default: 0, min: 0, max: 7, step: 1 },
    ],
    defaultParams: { items: '剪辑,工作流,成本账单,二次测试', activeIndex: 0 },
  },
  {
    id: 'replica-right-claim',
    name: '右侧观点标题',
    category: '金句',
    description: '右对齐观点块：英文 eyebrow + 白色大字 + 橙金大字 + 下划线（一屏一句核心观点）。',
    component: ReplicaRightClaim,
    schema: [
      { key: 'eyebrow', label: '英文 eyebrow', type: 'text', default: 'EDITING IS NOT ONE NUMBER' },
      { key: 'line1', label: '第 1 行（白）', type: 'text', default: '速度，不是' },
      { key: 'line2', label: '第 2 行（橙）', type: 'text', default: '唯一标准' },
    ],
    defaultParams: { eyebrow: 'EDITING IS NOT ONE NUMBER', line1: '速度，不是', line2: '唯一标准' },
  },
  {
    id: 'replica-answer-card',
    name: '答案卡',
    category: '金句',
    description: '描边面板给出一锤定音的答案：eyebrow + 大字结论 + ⊗/✓ 圆圈图标。',
    component: ReplicaAnswerCard,
    schema: [
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: 'FIRST TEST / ANSWER' },
      { key: 'answer', label: '答案', type: 'text', default: '没有' },
      { key: 'icon', label: '图标', type: 'select', default: 'x', options: ['x', 'check'] },
    ],
    defaultParams: { eyebrow: 'FIRST TEST / ANSWER', answer: '没有', icon: 'x' },
  },
  {
    id: 'replica-vs-hero',
    name: '巨字 VS 对比',
    category: '对比',
    description: '巨号数字对比：A 橙金 / vs 灰 / B 白 + 橙下划线 + 底部小 eyebrow。',
    component: ReplicaVsHero,
    schema: [
      { key: 'eyebrow', label: '顶部 eyebrow', type: 'text', default: 'VIDEO TIME / PRODUCTION TIME' },
      { key: 'valueA', label: '数值 A（橙）', type: 'text', default: '4小时' },
      { key: 'valueB', label: '数值 B（白）', type: 'text', default: '≤2小时' },
      { key: 'subEyebrow', label: '底部 eyebrow（可空）', type: 'text', default: 'CODEX VISUAL VIDEO / PURE TALKING HEAD' },
    ],
    defaultParams: {
      eyebrow: 'VIDEO TIME / PRODUCTION TIME',
      valueA: '4小时',
      valueB: '≤2小时',
      subEyebrow: 'CODEX VISUAL VIDEO / PURE TALKING HEAD',
    },
  },
  {
    id: 'replica-ab-question',
    name: 'A→B 问句对比',
    category: '对比',
    description: '左灰右橙两块面板 + 橙色箭头：A 问题 → B 问题（或 FIRST RUN → SECOND RUN）。',
    component: ReplicaAbQuestion,
    schema: [
      { key: 'labelA', label: 'A 标签', type: 'text', default: 'QUESTION A' },
      { key: 'textA', label: 'A 内容', type: 'text', default: '变慢了?' },
      { key: 'labelB', label: 'B 标签', type: 'text', default: 'QUESTION B' },
      { key: 'textB', label: 'B 内容（橙）', type: 'text', default: '可接受成本?' },
    ],
    defaultParams: { labelA: 'QUESTION A', textA: '变慢了?', labelB: 'QUESTION B', textB: '可接受成本?' },
  },
  {
    id: 'replica-prev-card',
    name: '上期回顾卡',
    category: '贴片',
    description: '左下角回顾小卡：eyebrow + 期数 + 两行标题（第 2 行橙）+ 缩略图占位块。',
    component: ReplicaPrevCard,
    schema: [
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: '上一期 / PREVIOUS TEST' },
      { key: 'tag', label: '期数', type: 'text', default: 'AI周播实验 01' },
      { key: 'line1', label: '标题行 1', type: 'text', default: '花3天做AI视频' },
      { key: 'line2', label: '标题行 2（橙）', type: 'text', default: '我反而没提效' },
    ],
    defaultParams: { eyebrow: '上一期 / PREVIOUS TEST', tag: 'AI周播实验 01', line1: '花3天做AI视频', line2: '我反而没提效' },
  },
  {
    id: 'replica-s-flow',
    name: 'S 型七步流程图',
    category: '流程',
    description: '8 卡蛇形流程：上排 01→04，下排 OUTPUT←07←06←05，active 橙卡，右侧拐弯连接线 + footer 线。',
    component: ReplicaSFlow,
    schema: [
      { key: 'eyebrow', label: '左上 eyebrow', type: 'text', default: 'AI VIDEO PRODUCTION / WORKFLOW MAP' },
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: '从一段口播，' },
      { key: 'titleOrange', label: '标题（橙）', type: 'text', default: '到一条成片' },
      { key: 'rightEyebrow', label: '右上 eyebrow', type: 'text', default: '07 STEPS / ONE REUSABLE SYSTEM' },
      {
        key: 'steps',
        label: '步骤（标题|副标|角标，7 个逗号分隔）',
        type: 'text',
        default: '文案|锁定口播内容|SCRIPT LOCKED,拍摄|锁定 A-roll / SRT|VIDEO TIMECODE,视觉规划|拆成 15 个 MG 任务|15 TASKS,静帧设计|先选代表性画面|1ST FRAME,MG 动画|测试透明 MOV 再批量|ALPHA MOV,声音|人声优先 少量点缀|VOICE FIRST,总检|剪映合成 完整检查|FINAL REVIEW',
      },
      { key: 'activeIdx', label: '橙卡序号（0 起，逗号分隔）', type: 'text', default: '2,3,4' },
      { key: 'outputTitle', label: 'OUTPUT 标题', type: 'text', default: '完成成片' },
      { key: 'outputSub', label: 'OUTPUT 副标', type: 'text', default: '可复用工作流' },
      { key: 'footer', label: '底部 footer', type: 'text', default: 'BREAK DOWN · LOCK · TEST ONE · BATCH · REVIEW' },
    ],
    defaultParams: {
      eyebrow: 'AI VIDEO PRODUCTION / WORKFLOW MAP',
      titleWhite: '从一段口播，',
      titleOrange: '到一条成片',
      rightEyebrow: '07 STEPS / ONE REUSABLE SYSTEM',
      steps: '文案|锁定口播内容|SCRIPT LOCKED,拍摄|锁定 A-roll / SRT|VIDEO TIMECODE,视觉规划|拆成 15 个 MG 任务|15 TASKS,静帧设计|先选代表性画面|1ST FRAME,MG 动画|测试透明 MOV 再批量|ALPHA MOV,声音|人声优先 少量点缀|VOICE FIRST,总检|剪映合成 完整检查|FINAL REVIEW',
      activeIdx: '2,3,4',
      outputTitle: '完成成片',
      outputSub: '可复用工作流',
      footer: 'BREAK DOWN · LOCK · TEST ONE · BATCH · REVIEW',
    },
  },
  {
    id: 'replica-section-showcase',
    name: '编号章节展示',
    category: '列表',
    description: '左圆形头像 + 编号大标题 + 橙框内容面板（文字/剪映时间线/社交截图三种变体）+ 步骤 chips + footer。',
    component: ReplicaSectionShowcase,
    schema: [
      { key: 'number', label: '编号', type: 'text', default: '01' },
      { key: 'title', label: '章节标题', type: 'text', default: '先锁定内容' },
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: 'LOCK CONTENT BEFORE VISUAL PRODUCTION' },
      { key: 'panelHeader', label: '面板头', type: 'text', default: '● CODEX / SCRIPT LOCK / SCREEN RECORDING' },
      { key: 'panelVariant', label: '面板内容', type: 'select', default: 'text', options: ['text', 'editor', 'posts'] },
      { key: 'panelText', label: '面板文字（text 变体）', type: 'text', default: '按照"矛盾—原因—认知转折—观众代入—判断方法—本期验证—下期结果"推进，删除预计约2分钟。' },
      { key: 'chips', label: '步骤 chips（逗号分隔，末位橙）', type: 'text', default: '文案锁定,试读删减,拍摄留白,A-roll / SRT' },
      { key: 'footer', label: 'footer 小字', type: 'text', default: 'CHANGE ONE LINE → EVERY DOWNSTREAM TIMECODE MOVES' },
      { key: 'caption', label: '底部字幕（可空）', type: 'text', default: '我先在Codex里完成文案' },
    ],
    defaultParams: {
      number: '01',
      title: '先锁定内容',
      eyebrow: 'LOCK CONTENT BEFORE VISUAL PRODUCTION',
      panelHeader: '● CODEX / SCRIPT LOCK / SCREEN RECORDING',
      panelVariant: 'text',
      panelText: '按照"矛盾—原因—认知转折—观众代入—判断方法—本期验证—下期结果"推进，删除预计约2分钟。',
      chips: '文案锁定,试读删减,拍摄留白,A-roll / SRT',
      footer: 'CHANGE ONE LINE → EVERY DOWNSTREAM TIMECODE MOVES',
      caption: '我先在Codex里完成文案',
    },
  },
  {
    id: 'replica-numbered-list',
    name: '编号清单',
    category: '列表',
    description: '大标题 + eyebrow + 编号行逐条出现：橙圆编号 + 白字 + 行下划线。',
    component: ReplicaNumberedList,
    schema: [
      { key: 'title', label: '标题', type: 'text', default: '只看三件事' },
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: 'AI LEARNING VALUE' },
      { key: 'items', label: '条目（逗号分隔）', type: 'text', default: '它能帮我解决什么?,以后会用多少次?,哪一步最省时间?' },
    ],
    defaultParams: { title: '只看三件事', eyebrow: 'AI LEARNING VALUE', items: '它能帮我解决什么?,以后会用多少次?,哪一步最省时间?' },
  },
  {
    id: 'replica-time-cost',
    name: '时间成本账单',
    category: '数据',
    description: '双面板账单：左 TIME（巨字时长 + 堆叠比例条 + 4 mini chips + 括号注记）+ 右 COST（¥0 + 百分比圆环 + 重置行）。',
    component: ReplicaTimeCost,
    schema: [
      { key: 'eyebrow', label: '顶部 eyebrow', type: 'text', default: 'FIRST PRODUCTION / TIME & COST LEDGER' },
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: '上一期，真实的' },
      { key: 'titleOrange', label: '标题（橙）', type: 'text', default: '时间与成本' },
      { key: 'rightEyebrow', label: '右上 eyebrow', type: 'text', default: 'REAL INPUT / NO ESTIMATE' },
      { key: 'bigTime', label: '总时长巨字', type: 'text', default: '05:00' },
      { key: 'bigTimeLabel', label: '总时长标签', type: 'text', default: 'TOTAL TIME / 含文案总计' },
      { key: 'prodLabel', label: '制作时长标签', type: 'text', default: 'VIDEO PRODUCTION / 除开文案 04:00' },
      { key: 'segments', label: '比例条（标签|宽度，末位橙）', type: 'text', default: '1小时|20,30分|10,30分|10,3小时|60' },
      { key: 'chips', label: '时长 chips（标签|值，末位橙）', type: 'text', default: '文案|01:00,拍摄|00:30,剪辑停顿口误|00:30,Codex 动画|03:00' },
      { key: 'bracketNote', label: '括号注记', type: 'text', default: '视频制作 04:00（不含文案）' },
      { key: 'costValue', label: '花销巨字', type: 'text', default: '¥0' },
      { key: 'costLabel', label: '花销标签', type: 'text', default: '新增付费' },
      { key: 'ringPct', label: '圆环百分比', type: 'number', default: 21, min: 0, max: 100, step: 1 },
      { key: 'ringLabel', label: '圆环标签', type: 'text', default: '周额度 已消耗' },
    ],
    defaultParams: {
      eyebrow: 'FIRST PRODUCTION / TIME & COST LEDGER',
      titleWhite: '上一期，真实的',
      titleOrange: '时间与成本',
      rightEyebrow: 'REAL INPUT / NO ESTIMATE',
      bigTime: '05:00',
      bigTimeLabel: 'TOTAL TIME / 含文案总计',
      prodLabel: 'VIDEO PRODUCTION / 除开文案 04:00',
      segments: '1小时|20,30分|10,30分|10,3小时|60',
      chips: '文案|01:00,拍摄|00:30,剪辑停顿口误|00:30,Codex 动画|03:00',
      bracketNote: '视频制作 04:00（不含文案）',
      costValue: '¥0',
      costLabel: '新增付费',
      ringPct: 21,
      ringLabel: '周额度 已消耗',
    },
  },
  {
    id: 'replica-stat-hero',
    name: '大数字收益',
    category: '数据',
    description: 'eyebrow + 巨号橙数字 + 白标签 + 下划线 + 下方描边输出 chip（编号+数值→箭头）。',
    component: ReplicaStatHero,
    schema: [
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: 'EXTRA TIME → REUSABLE VALUE' },
      { key: 'value', label: '巨字数值', type: 'text', default: '+2h' },
      { key: 'label', label: '标签', type: 'text', default: '多出来的' },
      { key: 'chipLabel', label: 'chip 标签', type: 'text', default: 'OUTPUT B)' },
      { key: 'chipValue', label: 'chip 数值', type: 'text', default: '15 段MG' },
      { key: 'showChip', label: '显示 chip', type: 'select', default: 'true', options: ['true', 'false'] },
    ],
    defaultParams: { eyebrow: 'EXTRA TIME → REUSABLE VALUE', value: '+2h', label: '多出来的', chipLabel: 'OUTPUT B)', chipValue: '15 段MG', showChip: 'true' },
  },
  {
    id: 'replica-side-note',
    name: '左下便签箭头',
    category: '贴片',
    description: '灰描边小卡：两行标题（第 2 行橙）+ 橙色弧形箭头 + tiny caps 小字。',
    component: ReplicaSideNote,
    schema: [
      { key: 'line1', label: '行 1（白）', type: 'text', default: '但我还会' },
      { key: 'line2', label: '行 2（橙）', type: 'text', default: '继续用' },
      { key: 'tiny', label: 'tiny 小字', type: 'text', default: 'THE NEXT TEST CONTINUES' },
      { key: 'arrow', label: '显示箭头', type: 'select', default: 'true', options: ['true', 'false'] },
    ],
    defaultParams: { line1: '但我还会', line2: '继续用', tiny: 'THE NEXT TEST CONTINUES', arrow: 'true' },
  },

  // ===== 动效 · 第三批（2026-09-09 第四段源视频，混色主题，10 张全部新增）=====
  {
    id: 'replica-quad-tabs-tile',
    name: '3 标签卡 + 图阵',
    category: '贴片',
    description: '3 个相同色块"剧"标签（带顶部 tab 角标）+ 1 个深色 4×4 霓虹图阵卡。',
    component: ReplicaQuadTabsTile,
    schema: [
      { key: 'title', label: '标题（白）', type: 'text', default: '怎么老是这些剧情?' },
      { key: 'titleOrange', label: '标题（橙，可空）', type: 'text', default: '' },
      { key: 'labels', label: '3 个标签（逗号分隔）', type: 'text', default: '剧,剧,剧' },
      { key: 'imageCol', label: '图阵脚注', type: 'text', default: '3 320×180' },
    ],
    defaultParams: { title: '怎么老是这些剧情?', titleOrange: '', labels: '剧,剧,剧', imageCol: '3 320×180' },
  },
  {
    id: 'replica-cost-dashboard',
    name: '成本仪表板',
    category: '数据',
    description: 'eyebrow + 巨字 "30 到 50 万" + 中段红/绿对比 chip + 下段 2 个 mini stat + 底部 capsule。',
    component: ReplicaCostDashboard,
    schema: [
      { key: 'eyebrow', label: 'eyebrow', type: 'text', default: '批量大几十部' },
      { key: 'titleMid', label: '中间小标题', type: 'text', default: '批量做大' },
      { key: 'valueWhite', label: '巨字 1（白）', type: 'text', default: '30' },
      { key: 'valueCyan', label: '连接字（青）', type: 'text', default: '到' },
      { key: 'valueRight', label: '巨字 2（白）', type: 'text', default: '50 万' },
      { key: 'chipLeftLabel', label: '红 chip 标签', type: 'text', default: '爆款率哪怕' },
      { key: 'chipLeftValue', label: '红 chip 值', type: 'text', default: '5‰' },
      { key: 'chipRightLabel', label: '绿 chip 标签', type: 'text', default: '期望收益' },
      { key: 'chipRightTitle', label: '绿 chip 标题', type: 'text', default: '跑出一部' },
      { key: 'chipRightValue', label: '绿 chip 值', type: 'text', default: '全覆盖' },
      { key: 'stat1Title', label: '下左 stat 标题', type: 'text', default: 'AI 出片 1~3 天' },
      { key: 'stat1Value', label: '下左 stat 值', type: 'text', default: '3 天出片' },
      { key: 'stat2Title', label: '下右 stat 标题', type: 'text', default: '投流数据 48 小时' },
      { key: 'stat2Value', label: '下右 stat 值', type: 'text', default: '48h 回流' },
      { key: 'caption', label: '底部 capsule', type: 'text', default: '整个循环，以「天」为单位转动' },
    ],
    defaultParams: {
      eyebrow: '批量大几十部',
      titleMid: '批量做大',
      valueWhite: '30',
      valueCyan: '到',
      valueRight: '50 万',
      chipLeftLabel: '爆款率哪怕',
      chipLeftValue: '5‰',
      chipRightLabel: '期望收益',
      chipRightTitle: '跑出一部',
      chipRightValue: '全覆盖',
      stat1Title: 'AI 出片 1~3 天',
      stat1Value: '3 天出片',
      stat2Title: '投流数据 48 小时',
      stat2Value: '48h 回流',
      caption: '整个循环，以「天」为单位转动',
    },
  },
  {
    id: 'replica-cost-rows',
    name: '多行 VS 成本对比',
    category: '对比',
    description: '多行（紫 pill 模型名 + 红官方 / 绿渠道）成本对比 + 右侧天平图 + 底部说明。',
    component: ReplicaCostRows,
    schema: [
      { key: 'eyebrow', label: '标题（白）', type: 'text', default: '$ 我们拿到的模型，' },
      { key: 'eyebrowOrange', label: '标题（橙）', type: 'text', default: '便宜得多' },
      {
        key: 'rows',
        label: '行（紫pill|红label|红sub|红val|红unit|绿label|绿sub|绿val|绿unit）',
        type: 'text',
        default:
          '字节的 Seedance 2.5 · 30 秒一条|官方 API|每条 30 秒|40-50|块|第三方渠道|同款同质|7|块,MiniMax H3 · 768P 每秒|官方|768P 一秒|0.5|元|渠道最低|我一手见过 0.051|0.09|元',
      },
      { key: 'caption', label: '底部说明（可空）', type: 'text', default: '同一个模型' },
    ],
    defaultParams: {
      eyebrow: '$ 我们拿到的模型，',
      eyebrowOrange: '便宜得多',
      rows:
        '字节的 Seedance 2.5 · 30 秒一条|官方 API|每条 30 秒|40-50|块|第三方渠道|同款同质|7|块,MiniMax H3 · 768P 每秒|官方|768P 一秒|0.5|元|渠道最低|我一手见过 0.051|0.09|元',
      caption: '同一个模型',
    },
  },
  {
    id: 'replica-channel-stack',
    name: '渠道答案堆',
    category: '列表',
    description: '3 行渠道卡 + 答案行橙高亮（揭示"中转站"等内幕），底部一句"还有一个你拿不到的渠道"。',
    component: ReplicaChannelStack,
    schema: [
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: '这差价是' },
      { key: 'titleOrange', label: '标题（橙）', type: 'text', default: '怎么来的?' },
      {
        key: 'rows',
        label: '行（图标|标题|副标|badge|tone:cyan|orange|red|purple）',
        type: 'text',
        default: '🖥|自部署开源模型|各家公司自己部署（H3 这类）|正路|cyan,🛒|批量采购|大公司包量，成本远低于你|正路|cyan,🗂|中转站账号池|脚本注册薅新人额度 → 聚合池|官方 2-5 折|orange',
      },
      { key: 'caption', label: '底部 chip（可空）', type: 'text', default: '还有一个你拿不到的渠道' },
    ],
    defaultParams: {
      titleWhite: '这差价是',
      titleOrange: '怎么来的?',
      rows: '🖥|自部署开源模型|各家公司自己部署（H3 这类）|正路|cyan,🛒|批量采购|大公司包量，成本远低于你|正路|cyan,🗂|中转站账号池|脚本注册薅新人额度 → 聚合池|官方 2-5 折|orange',
      caption: '还有一个你拿不到的渠道',
    },
  },
  {
    id: 'replica-timeline-steps',
    name: '横版时间线步骤',
    category: '流程',
    description: '标题 + 4 步骤卡（图标+标题+副标+→） + 下方彩色横线 + 4 颗瓦片标记 + 2 个绿色数据 pill。',
    component: ReplicaTimelineSteps,
    schema: [
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: 'AI 短剧' },
      { key: 'titleOrange', label: '标题（橙）', type: 'text', default: '做剧流程' },
      {
        key: 'steps',
        label: '步骤（icon:bulk|send|filter|scale|dot|标题|副标|主色CSS）',
        type: 'text',
        default:
          'bulk|批量生成|几十部不同爽点|var(--stage-primary),send|全量投流|全部推上去|var(--stage-special),filter|数据筛选|付费率 / 完播率|var(--stage-assist),scale|复制放大|放量爆款|rgba(255,255,255,0.5)',
      },
      { key: 'pills', label: '数据 pills（逗号分隔）', type: 'text', default: '付费率 9.8%,完播率 62.4%' },
      { key: 'caption', label: '底部字幕', type: 'text', default: '立刻让 AI 大规模复制' },
    ],
    defaultParams: {
      titleWhite: 'AI 短剧',
      titleOrange: '做剧流程',
      steps: 'bulk|批量生成|几十部不同爽点|var(--stage-primary),send|全量投流|全部推上去|var(--stage-special),filter|数据筛选|付费率 / 完播率|var(--stage-assist),scale|复制放大|放量爆款|rgba(255,255,255,0.5)',
      pills: '付费率 9.8%,完播率 62.4%',
      caption: '立刻让 AI 大规模复制',
    },
  },
  {
    id: 'replica-bracket-stats',
    name: '角括号 stat 三卡',
    category: '数据',
    description: '3 张 stat 卡（2+1 排布）只用 4 个角的 L 形虚线边框 + 图标 + 标题 + 副标 + 巨号 + 单位。',
    component: ReplicaBracketStats,
    schema: [
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: '谁家后院真有油田?' },
      { key: 'titleOrange', label: '标题（橙）', type: 'text', default: '还是这些机构' },
      {
        key: 'items',
        label: '条目（icon|标题|line1|line2|value|unit|主色CSS）',
        type: 'text',
        default:
          '👥|某某文化|员工一年扩充到千人规模|月营收超 5000万|5,000|万/月|var(--stage-special),🏢|某某动漫|从 30 人扩到 800 人|—|800|人|var(--stage-primary),📈|某文在线|目标年化产能|—|1,038|部/年|var(--stage-data)',
      },
      { key: 'caption', label: '底部 chip', type: 'text', default: '机构已匿名处理 · 数据为公开报道口径' },
    ],
    defaultParams: {
      titleWhite: '谁家后院真有油田?',
      titleOrange: '还是这些机构',
      items: '👥|某某文化|员工一年扩充到千人规模|月营收超 5000万|5,000|万/月|var(--stage-special),🏢|某某动漫|从 30 人扩到 800 人|—|800|人|var(--stage-primary),📈|某文在线|目标年化产能|—|1,038|部/年|var(--stage-data)',
      caption: '机构已匿名处理 · 数据为公开报道口径',
    },
  },
  {
    id: 'replica-confetti-tiles',
    name: '散落 剧 字瓦片',
    category: '装饰',
    description: '满屏随机散落多色"剧"瓦片（红/蓝/紫/青/金 + 随机大小/位置/旋转 + 阴影），底部居中标题。',
    component: ReplicaConfettiTiles,
    schema: [
      { key: 'title', label: '底部标题', type: 'text', default: '2025 年全年上线的漫剧有 6 万多部' },
      { key: 'count', label: '瓦片数量', type: 'number', default: 18, min: 6, max: 28, step: 1 },
      { key: 'seed', label: '随机种子', type: 'number', default: 7, min: 1, max: 99, step: 1 },
    ],
    defaultParams: { title: '2025 年全年上线的漫剧有 6 万多部', count: 18, seed: 7 },
  },
  {
    id: 'replica-funnel-conversion',
    name: '漏斗转化',
    category: '数据',
    description: 'eyebrow + 3 个 chips（晒收益/开班收徒/被媒体采访）+ 3 层漏斗（梯形 + 渐变）。',
    component: ReplicaFunnelConversion,
    schema: [
      { key: 'eyebrow', label: 'eyebrow（白）', type: 'text', default: '这是我最想跟你说清楚的一件事：你看到的，全是' },
      { key: 'eyebrowOrange', label: 'eyebrow（橙）', type: 'text', default: '活下来的' },
      { key: 'chips', label: '3 chips（逗号分隔）', type: 'text', default: '晒收益的,开班收徒的,被媒体采访的' },
      { key: 'layers', label: '3 层标签（逗号分隔）', type: 'text', default: '顶部,中段,沉底' },
    ],
    defaultParams: {
      eyebrow: '这是我最想跟你说清楚的一件事：你看到的，全是',
      eyebrowOrange: '活下来的',
      chips: '晒收益的,开班收徒的,被媒体采访的',
      layers: '顶部,中段,沉底',
    },
  },
  {
    id: 'replica-2cards-vs-graphic',
    name: '二选一对比 + 插画',
    category: '对比',
    description: '4 能力 chip + 左红卡（杠杆配重小图）+ 右绿卡（上涨折线图）+ 中间 VS 圆徽。',
    component: Replica2cardsVsGraphic,
    schema: [
      { key: 'titleWhite', label: '标题（白）', type: 'text', default: '如果你' },
      { key: 'titleGreen', label: '标题（绿）', type: 'text', default: '真的能力强' },
      { key: 'titleMid', label: '标题尾', type: 'text', default: '——那你听我的' },
      { key: 'chips', label: '能力 chip（逗号分隔）', type: 'text', default: '✏ 真懂内容,📈 跑得动数据,🔧 东西能打,🪄 还懂 AIGC' },
      { key: 'leftTitle', label: '左卡标题', type: 'text', default: '自己扛风险创业' },
      { key: 'leftSub', label: '左卡底部 chip', type: 'text', default: '全部风险自己扛' },
      { key: 'rightTitle', label: '右卡标题', type: 'text', default: '去任何一家公司' },
      { key: 'rightSub', label: '右卡底部 chip', type: 'text', default: '轻松拿到相当高薪的工作' },
    ],
    defaultParams: {
      titleWhite: '如果你',
      titleGreen: '真的能力强',
      titleMid: '——那你听我的',
      chips: '✏ 真懂内容,📈 跑得动数据,🔧 东西能打,🪄 还懂 AIGC',
      leftTitle: '自己扛风险创业',
      leftSub: '全部风险自己扛',
      rightTitle: '去任何一家公司',
      rightSub: '轻松拿到相当高薪的工作',
    },
  },
  {
    id: 'replica-yellow-ball-badge',
    name: '大金球徽章',
    category: '金句',
    description: '居中大金黄渐变圆球（菱形图标 + 标题 + 副标）+ 左红 / 右蓝双侧 chip + 底部字幕。',
    component: ReplicaYellowBallBadge,
    schema: [
      { key: 'ballIcon', label: '球内图标', type: 'text', default: '💎' },
      { key: 'ballTitle', label: '球标题', type: 'text', default: '你的主业' },
      { key: 'ballSub', label: '球副标', type: 'text', default: '确定性 · 稳稳发光' },
      { key: 'leftChip', label: '左 chip（红）', type: 'text', default: '它赌不起你的主业' },
      { key: 'rightChip', label: '右 chip（蓝）', type: 'text', default: 'AI 短剧 · 业余补充' },
      { key: 'caption', label: '底部字幕', type: 'text', default: '你的能力本身，能拿到更确定、更高的回报' },
    ],
    defaultParams: {
      ballIcon: '💎',
      ballTitle: '你的主业',
      ballSub: '确定性 · 稳稳发光',
      leftChip: '它赌不起你的主业',
      rightChip: 'AI 短剧 · 业余补充',
      caption: '你的能力本身，能拿到更确定、更高的回报',
    },
  },

  // ===== 解说类动效卡（知识解说整页卡 · 参考"知识解说口播"幻灯片）=====
  {
    id: 'ex-title-slide',
    name: '解说·标题页',
    category: '开场',
    lib: 'explain',
    description: '整页纸感底 + 顶部引导行 + 特大标题 + 深色药丸结论。解说片的封面页。',
    component: ExplainerTitle,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '01 · 基础概念' },
      { key: 'titleSub', label: '主标（小）', type: 'text', default: '大语言模型' },
      { key: 'title', label: '主标（大）', type: 'text', default: 'Large Language Model' },
      { key: 'pill', label: '结论药丸', type: 'text', default: '接下来三分钟讲清楚' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '01 · 基础概念',
      titleSub: '大语言模型',
      title: 'Large Language Model',
      pill: '接下来三分钟讲清楚',
      duration: 5,
    },
  },
  {
    id: 'ex-section-slide',
    name: '解说·章节页',
    category: '开场',
    lib: 'explain',
    description: '超大章号 + 章节标题 + 橙色短横线，进入新一章的翻页过渡。',
    component: ExplainerSection,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'index', label: '章号', type: 'text', default: '02' },
      { key: 'title', label: '章节标题', type: 'text', default: '搭建在 LLM 之上的执行框架' },
      { key: 'sub', label: '副标', type: 'text', default: 'Agent 到底多了什么' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      index: '02',
      title: '搭建在 LLM 之上的执行框架',
      sub: 'Agent 到底多了什么',
      duration: 4,
    },
  },
  {
    id: 'ex-key-point',
    name: '解说·要点页',
    category: '金句',
    lib: 'explain',
    description: '小标题 + 特大号深色药丸，把一段讲解收成一句话重点。',
    component: ExplainerKeyPoint,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '重点' },
      { key: 'title', label: '小标题', type: 'text', default: 'LLM 到底在做什么' },
      { key: 'point', label: '要点（药丸）', type: 'text', default: '把语言变成概率，再变成下一个词' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '重点',
      title: 'LLM 到底在做什么',
      point: '把语言变成概率，再变成下一个词',
      duration: 5,
    },
  },
  {
    id: 'ex-tag-build',
    name: '解说·标签页',
    category: '列表',
    lib: 'explain',
    description: '标题下方一排白色药丸标签，跟着口播逐个弹出（"可以聊天 / 可以写文案…"）。',
    component: ExplainerTags,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '它能做什么' },
      { key: 'title', label: '标题', type: 'text', default: '大语言模型能干什么' },
      { key: 'tags', label: '标签（换行或逗号分隔）', type: 'text', default: '可以聊天\n可以写文案\n可以写文章\n可以写视频脚本' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '它能做什么',
      title: '大语言模型能干什么',
      tags: '可以聊天\n可以写文案\n可以写文章\n可以写视频脚本',
      duration: 5,
    },
  },
  {
    id: 'ex-highlight-turn',
    name: '解说·强调页',
    category: '金句',
    lib: 'explain',
    description: '铺垫行 + 特大号琥珀药丸，用于转折或强调短板（"但它没有行动能力"）。',
    component: ExplainerHighlight,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'lead', label: '铺垫（白药丸）', type: 'text', default: '会聊天、会写文案、会写代码…' },
      { key: 'highlight', label: '强调（琥珀药丸）', type: 'text', default: '但它没有行动能力' },
      { key: 'note', label: '补充说明', type: 'text', default: '它只会说，不会做' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      lead: '会聊天、会写文案、会写代码…',
      highlight: '但它没有行动能力',
      note: '它只会说，不会做',
      duration: 4,
    },
  },
  {
    id: 'ex-checklist',
    name: '解说·清单页',
    category: '列表',
    lib: 'explain',
    description: '标题 + 编号清单行逐条滑入，讲"一二三"这类并列要点。',
    component: ExplainerChecklist,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '怎么做' },
      { key: 'title', label: '标题', type: 'text', default: '三步搭出一个 Agent' },
      { key: 'items', label: '清单（换行或逗号分隔）', type: 'text', default: '给它一个目标\n配上工具和资料\n让它自己跑循环' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '怎么做',
      title: '三步搭出一个 Agent',
      items: '给它一个目标\n配上工具和资料\n让它自己跑循环',
      duration: 6,
    },
  },
  {
    id: 'ex-steps-flow',
    name: '解说·步骤页',
    category: '流程',
    lib: 'explain',
    description: '横向步骤卡 + 箭头，跟着口播一格格搭出流程链路。',
    component: ExplainerSteps,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '流程' },
      { key: 'title', label: '标题', type: 'text', default: '一次对话是怎么跑起来的' },
      { key: 'steps', label: '步骤（换行或逗号分隔）', type: 'text', default: '提问\n理解意图\n检索知识\n生成回答' },
      { key: 'footnote', label: '脚注', type: 'text', default: '' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '流程',
      title: '一次对话是怎么跑起来的',
      steps: '提问\n理解意图\n检索知识\n生成回答',
      footnote: '',
      duration: 6,
    },
  },
  {
    id: 'ex-versus',
    name: '解说·对比页',
    category: '对比',
    lib: 'explain',
    description: '左右两块面板（白底 vs 深底）+ 中间 VS 圆徽，讲前后/新旧差异。',
    component: ExplainerVersus,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '对比' },
      { key: 'leftTitle', label: '左标题', type: 'text', default: '以前的做法' },
      { key: 'leftLines', label: '左要点（换行或逗号分隔）', type: 'text', default: '人肉查资料\n一条条试错\n产出看运气' },
      { key: 'rightTitle', label: '右标题', type: 'text', default: '现在的做法' },
      { key: 'rightLines', label: '右要点（换行或逗号分隔）', type: 'text', default: '一句话说清目标\nLLM 给出初稿\n人来定稿' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '对比',
      leftTitle: '以前的做法',
      leftLines: '人肉查资料\n一条条试错\n产出看运气',
      rightTitle: '现在的做法',
      rightLines: '一句话说清目标\nLLM 给出初稿\n人来定稿',
      duration: 6,
    },
  },
  {
    id: 'ex-stat-hero',
    name: '解说·数据页',
    category: '数据',
    lib: 'explain',
    description: '纸感底上的特大号滚动数字 + 指标名 + 可选深色结论药丸。',
    component: ExplainerStat,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'eyebrow', label: '引导行', type: 'text', default: '一个数字' },
      { key: 'label', label: '指标名', type: 'text', default: '信息处理效率提升' },
      { key: 'target', label: '目标值', type: 'number', default: 100, min: -9999999, max: 9999999, step: 1 },
      { key: 'decimals', label: '小数位', type: 'range', default: 0, min: 0, max: 4, step: 1 },
      { key: 'prefix', label: '前缀', type: 'text', default: '' },
      { key: 'suffix', label: '后缀', type: 'text', default: ' 倍' },
      { key: 'pill', label: '结论药丸', type: 'text', default: '量级变化，才是真的变化' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      eyebrow: '一个数字',
      label: '信息处理效率提升',
      target: 100,
      decimals: 0,
      prefix: '',
      suffix: ' 倍',
      pill: '量级变化，才是真的变化',
      duration: 5,
    },
  },
  {
    id: 'ex-end-slide',
    name: '解说·结尾页',
    category: '结尾',
    lib: 'explain',
    description: '总结一句 + 琥珀 CTA 药丸 + 可选落款，解说片的收尾整页。',
    component: ExplainerEnd,
    schema: [
      { key: 'bg', label: '背景', type: 'select', default: '透明', options: ['透明', '米白', '白色', '黑色'] },
      { key: 'ink', label: '文字色', type: 'color', default: '#1d1e22' },

      { key: 'summary', label: '总结', type: 'text', default: '语言能力 + 执行框架 = 这一代应用的新底座' },
      { key: 'cta', label: 'CTA 药丸', type: 'text', default: '关注我，下期讲 Agent 的执行框架' },
      { key: 'sign', label: '落款', type: 'text', default: '' },
    ],
    defaultParams: {
      bg: '透明',
      ink: '#1d1e22',

      summary: '语言能力 + 执行框架 = 这一代应用的新底座',
      cta: '关注我，下期讲 Agent 的执行框架',
      sign: '',
      duration: 5,
    },
  },
  {
    id: 'ex-board-blank',
    name: '解说·空白底板',
    category: '元素',
    lib: 'explain',
    description: '一整页背景（米白/白色/黑色/透明），没有内容 —— 配合元素零件自由拼一页。',
    component: BlankBoard,
    schema: [
      { key: 'variant', label: '背景色', type: 'select', default: '米白', options: ['米白', '白色', '黑色', '透明'] },
      { key: 'showBar', label: '底部进度条', type: 'boolean', default: false },
      { key: 'barColor', label: '进度条颜色', type: 'color', default: '#f2a63a' },
      { key: 'barHeight', label: '进度条厚度', type: 'range', default: 8, min: 2, max: 24, step: 1 },
    ],
    defaultParams: {
      variant: '米白',
      ink: '#1d1e22',
      showBar: false,
      barColor: '#f2a63a',
      barHeight: 8,
      duration: 6,
    },
  },

  // ===== 解说元素卡：组合页里用到的零件，拆出来单独用 / 自由叠加 =====
  {
    id: 'exa-headline',
    name: '元素·大标题',
    category: '元素',
    lib: 'explain',
    description: '一页里最大的那句话。可叠在空白底板上，字号/字重/颜色/对齐都能改。',
    component: AtomHeadline,
    schema: [
      { key: 'text', label: '标题', type: 'text', default: '这一页要说的重点' },
      { key: 'size', label: '字号', type: 'range', default: 88, min: 32, max: 160, step: 2 },
      { key: 'weight', label: '字重', type: 'select', default: '800', options: ['600', '700', '800', '900'] },
      { key: 'color', label: '颜色', type: 'color', default: '#1d1e22' },
      { key: 'align', label: '对齐', type: 'select', default: 'left', options: ['left', 'center', 'right'] },
      { key: 'maxWidth', label: '最大宽度', type: 'number', default: 1500, min: 200, max: 1920, step: 10 },
    ],
    defaultParams: {
      text: '这一页要说的重点',
      size: 88,
      weight: '800',
      color: '#1d1e22',
      align: 'left',
      maxWidth: 1500,
      duration: 3,
    },
  },
  {
    id: 'exa-subhead',
    name: '元素·副标题',
    category: '元素',
    lib: 'explain',
    description: '比大标题小一号的补充句 / 提问句，压在标题下面。',
    component: AtomSubhead,
    schema: [
      { key: 'text', label: '副标题', type: 'text', default: '它到底多出来的那一步是什么' },
      { key: 'size', label: '字号', type: 'range', default: 46, min: 20, max: 96, step: 2 },
      { key: 'weight', label: '字重', type: 'select', default: '600', options: ['500', '600', '700'] },
      { key: 'color', label: '颜色', type: 'color', default: '#5a5b60' },
      { key: 'align', label: '对齐', type: 'select', default: 'left', options: ['left', 'center', 'right'] },
    ],
    defaultParams: {
      text: '它到底多出来的那一步是什么',
      size: 46,
      weight: '600',
      color: '#5a5b60',
      align: 'left',
      maxWidth: 1400,
      duration: 3,
    },
  },
  {
    id: 'exa-eyebrow',
    name: '元素·引导行',
    category: '元素',
    lib: 'explain',
    description: '小方块 + 小字（章节号 / 栏目名），放在页眉。',
    component: AtomEyebrow,
    schema: [
      { key: 'text', label: '文字', type: 'text', default: '01 · 基础概念' },
      { key: 'size', label: '字号', type: 'range', default: 26, min: 14, max: 48, step: 1 },
      { key: 'color', label: '字色', type: 'color', default: '#8b8c92' },
      { key: 'dotColor', label: '方块色', type: 'color', default: '#f2a63a' },
    ],
    defaultParams: { text: '01 · 基础概念', size: 26, color: '#8b8c92', dotColor: '#f2a63a', duration: 3 },
  },
  {
    id: 'exa-navy-pill',
    name: '元素·深色药丸',
    category: '元素',
    lib: 'explain',
    description: '一句话关键结论（深底白字），解说页里的"重锤"。',
    component: AtomNavyPill,
    schema: [
      { key: 'text', label: '文字', type: 'text', default: '核心能力就一件事：思考和语言' },
      { key: 'size', label: '字号', type: 'range', default: 36, min: 18, max: 80, step: 1 },
      { key: 'bg', label: '底色', type: 'color', default: '#22252d' },
      { key: 'color', label: '字色', type: 'color', default: '#ffffff' },
      { key: 'shadow', label: '投影', type: 'boolean', default: true },
    ],
    defaultParams: {
      text: '核心能力就一件事：思考和语言',
      size: 36,
      bg: '#22252d',
      color: '#ffffff',
      shadow: true,
      duration: 3,
    },
  },
  {
    id: 'exa-tag',
    name: '元素·标签',
    category: '元素',
    lib: 'explain',
    description: '一颗圆角药丸标签（默认白底深字）。要一排就多叠几张，分别调位置。',
    component: AtomTag,
    schema: [
      { key: 'text', label: '文字', type: 'text', default: '可以聊天' },
      { key: 'size', label: '字号', type: 'range', default: 30, min: 14, max: 64, step: 1 },
      { key: 'bg', label: '底色', type: 'color', default: '#ffffff' },
      { key: 'color', label: '字色', type: 'color', default: '#1d1e22' },
      { key: 'border', label: '描边', type: 'boolean', default: true },
      { key: 'shadow', label: '投影', type: 'boolean', default: true },
    ],
    defaultParams: {
      text: '可以聊天',
      size: 30,
      bg: '#ffffff',
      color: '#1d1e22',
      border: true,
      shadow: true,
      duration: 3,
    },
  },
  {
    id: 'exa-amber-pill',
    name: '元素·强调药丸',
    category: '元素',
    lib: 'explain',
    description: '琥珀色强调药丸，用于转折 / 强调短板（"但它没有行动能力"）。',
    component: AtomAmberPill,
    schema: [
      { key: 'text', label: '文字', type: 'text', default: '但它没有行动能力' },
      { key: 'size', label: '字号', type: 'range', default: 38, min: 18, max: 80, step: 1 },
      { key: 'bg', label: '底色', type: 'color', default: '#f2a63a' },
      { key: 'color', label: '字色', type: 'color', default: '#ffffff' },
      { key: 'shadow', label: '投影', type: 'boolean', default: true },
    ],
    defaultParams: {
      text: '但它没有行动能力',
      size: 38,
      bg: '#f2a63a',
      color: '#ffffff',
      shadow: true,
      duration: 3,
    },
  },
  {
    id: 'exa-number-row',
    name: '元素·编号行',
    category: '元素',
    lib: 'explain',
    description: '序号圆片 + 一句话，清单里的一条。要几条就叠几张。',
    component: AtomNumberRow,
    schema: [
      { key: 'index', label: '序号', type: 'text', default: '1' },
      { key: 'text', label: '文字', type: 'text', default: '给它一个目标' },
      { key: 'size', label: '字号', type: 'range', default: 34, min: 16, max: 64, step: 1 },
      { key: 'bg', label: '底色', type: 'color', default: '#ffffff' },
      { key: 'color', label: '字色', type: 'color', default: '#1d1e22' },
      { key: 'indexBg', label: '序号底色', type: 'color', default: '#22252d' },
    ],
    defaultParams: {
      index: '1',
      text: '给它一个目标',
      size: 34,
      bg: '#ffffff',
      color: '#1d1e22',
      indexBg: '#22252d',
      indexColor: '#ffffff',
      duration: 3,
    },
  },
  {
    id: 'exa-step-chip',
    name: '元素·步骤芯片',
    category: '元素',
    lib: 'explain',
    description: 'STEP 01 + 步骤名的小卡片，横向排一排（中间插箭头）就是流程。',
    component: AtomStepChip,
    schema: [
      { key: 'step', label: '小标签', type: 'text', default: 'STEP 01' },
      { key: 'text', label: '步骤名', type: 'text', default: '提问' },
      { key: 'size', label: '字号', type: 'range', default: 30, min: 16, max: 64, step: 1 },
      { key: 'bg', label: '底色', type: 'color', default: '#ffffff' },
      { key: 'color', label: '字色', type: 'color', default: '#1d1e22' },
      { key: 'stepColor', label: '小标签色', type: 'color', default: '#f2a63a' },
    ],
    defaultParams: {
      step: 'STEP 01',
      text: '提问',
      size: 30,
      bg: '#ffffff',
      color: '#1d1e22',
      stepColor: '#f2a63a',
      duration: 3,
    },
  },
  {
    id: 'exa-arrow',
    name: '元素·箭头',
    category: '元素',
    lib: 'explain',
    description: '串在两个元素之间的连接箭头（→ ↓ ← ↑）。',
    component: AtomArrow,
    schema: [
      { key: 'dir', label: '方向', type: 'select', default: 'right', options: ['right', 'down', 'left', 'up'] },
      { key: 'size', label: '大小', type: 'range', default: 46, min: 16, max: 120, step: 2 },
      { key: 'color', label: '颜色', type: 'color', default: '#9a9ba1' },
    ],
    defaultParams: { dir: 'right', size: 46, color: '#9a9ba1', duration: 3 },
  },
  {
    id: 'exa-big-number',
    name: '元素·大数字',
    category: '元素',
    lib: 'explain',
    description: '从 0 滚到目标值的大数字，可配指标名、前缀后缀（"100 倍"）。',
    component: AtomBigNumber,
    schema: [
      { key: 'label', label: '指标名', type: 'text', default: '' },
      { key: 'target', label: '目标值', type: 'number', default: 100, min: -9999999, max: 9999999, step: 1 },
      { key: 'decimals', label: '小数位', type: 'range', default: 0, min: 0, max: 4, step: 1 },
      { key: 'prefix', label: '前缀', type: 'text', default: '' },
      { key: 'suffix', label: '后缀', type: 'text', default: ' 倍' },
      { key: 'size', label: '字号', type: 'range', default: 150, min: 48, max: 260, step: 2 },
      { key: 'color', label: '颜色', type: 'color', default: '#1d1e22' },
    ],
    defaultParams: {
      label: '',
      target: 100,
      decimals: 0,
      prefix: '',
      suffix: ' 倍',
      size: 150,
      color: '#1d1e22',
      duration: 4,
    },
  },
  {
    id: 'exa-caption',
    name: '元素·脚注小字',
    category: '元素',
    lib: 'explain',
    description: '页脚补充说明、数据来源、口径备注。',
    component: AtomCaption,
    schema: [
      { key: 'text', label: '文字', type: 'text', default: '数据来自公开资料整理' },
      { key: 'size', label: '字号', type: 'range', default: 26, min: 14, max: 48, step: 1 },
      { key: 'color', label: '颜色', type: 'color', default: '#8b8c92' },
      { key: 'align', label: '对齐', type: 'select', default: 'left', options: ['left', 'center', 'right'] },
    ],
    defaultParams: { text: '数据来自公开资料整理', size: 26, color: '#8b8c92', align: 'left', duration: 3 },
  },
  {
    id: 'exa-rule',
    name: '元素·分隔短线',
    category: '元素',
    lib: 'explain',
    description: '标题下的一小截横线，做视觉锚点（可选从左往右长出）。',
    component: AtomRule,
    schema: [
      { key: 'width', label: '长度', type: 'range', default: 160, min: 20, max: 1600, step: 10 },
      { key: 'thickness', label: '粗细', type: 'range', default: 8, min: 2, max: 32, step: 1 },
      { key: 'color', label: '颜色', type: 'color', default: '#f2a63a' },
      { key: 'grow', label: '生长动画', type: 'boolean', default: true },
    ],
    defaultParams: { width: 160, thickness: 8, color: '#f2a63a', grow: true, radius: 4, duration: 3 },
  },
  {
    id: 'exa-paragraph',
    name: '元素·正文段落',
    category: '元素',
    lib: 'explain',
    description: '多行说明文字，换行即分段，逐行淡入。',
    component: AtomParagraph,
    schema: [
      { key: 'text', label: '正文（换行或逗号分段）', type: 'text', default: '第一句说明。\n第二句说明。' },
      { key: 'size', label: '字号', type: 'range', default: 30, min: 16, max: 56, step: 1 },
      { key: 'lineHeight', label: '行距', type: 'range', default: 1.6, min: 1.2, max: 2.4, step: 0.1 },
      { key: 'color', label: '颜色', type: 'color', default: '#4a4b50' },
      { key: 'align', label: '对齐', type: 'select', default: 'left', options: ['left', 'center', 'right'] },
    ],
    defaultParams: {
      text: '第一句说明。\n第二句说明。',
      size: 30,
      lineHeight: 1.6,
      color: '#4a4b50',
      align: 'left',
      maxWidth: 1300,
      duration: 4,
    },
  },
]

// ===== 统一为 React 卡注入"强调色"参数（参照 hf 模板的 accent 能力）=====
// accent 为空字符串 = 跟随工程主题色；设置后由 PreviewCanvas 在卡容器上注入
// --stage-accent 变量，使数据/进度/环形等强调内容整体换色，无需改各卡组件。
for (const def of registry) {
  if (!def.schema.some((s) => s.key === 'accent')) {
    def.schema.push({ key: 'accent', label: '强调色', type: 'color', default: '' })
  }
  // 旧版写死的默认蓝一律改为"跟随主题"
  if (def.defaultParams.accent === '#5ac8fa') def.defaultParams.accent = ''
  if (!('accent' in def.defaultParams)) def.defaultParams.accent = ''
}

export function findEffect(id: string): EffectDef | undefined {
  return registry.find((e) => e.id === id)
}
