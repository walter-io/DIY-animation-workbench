import type { Instance, Template } from './types'
import { registry } from './registry'

function make(
  effectId: string,
  name: string,
  start: number,
  duration: number,
  slot: Instance['slot'],
  params: Record<string, string | number | boolean> = {},
  extra: Partial<Pick<Instance, 'seg' | 'dimAt'>> = {},
): Instance {
  const def = registry.find((e) => e.id === effectId)
  return {
    id: `tpl_${effectId}_${start}`,
    effectId,
    name,
    start,
    duration,
    slot,
    params: { ...(def?.defaultParams ?? {}), ...params },
    ...extra,
  }
}

export const templates: Template[] = [
  {
    id: 'tech-opener',
    name: '科技开场',
    description: '条形图竞速 + 章节路线图，暗色科技风。',
    build: () => [
      make('bar-chart-race', '数据竞速', 0, 4.5, 'left', {
        title: '区域数据竞速',
        subtitle: 'TOP 10 排名变化',
        rows: '华东,23320\n华南,17730\n华北,12400\n西南,8600\n东北,6200\n华中,5100\n西北,4300\n海外,3200',
        unit: '',
        color: 'var(--stage-data)',
        showRank: true,
      }),
      make('chapter-roadmap', '章节导航', 5, 4.5, 'right', {
        title: '章节导航',
        subtitle: 'CHAPTER ROADMAP',
        chapters: '准备,需求梳理 / 项目启动\n制作,内容与素材搭建\n动画,时间轴与动效\n数据,图表与字幕\n导出,渲染成片',
        activeIndex: 0,
      }),
    ],
  },
  {
    id: 'narrative',
    name: '口播讲解风',
    description: '持续节目角标 + 操作演示 + 底部字幕，适合教程或拆解类内容。',
    build: () => [
      make('show-bracket', '节目角标', 0, 9, 'left', {
        kicker: 'AI CONTENT WORKFLOW',
        title: '本期拆解',
        subtitle: '链接 · 内容 · 流程 · 越用越顺手',
        segNum: '01',
        segName: '开篇·建立认知',
      }),
      make('command-card', '操作演示', 1, 5, 'right', {
        kicker: 'ONE COMMAND',
        title: '交给助手处理',
        hint: '把视频链接直接交给 AI',
        command: 'https://example.com/xxx',
        sourceLabel: 'URL',
      }),
      // 字幕现在是"一句一张卡"，模板里给一句占位文案，之后用「导入口播稿」按句铺满字幕轨
      make('srt-subtitle', '口播字幕', 0, 9, 'bottom', { text: '在这里写一句口播' }),
    ],
  },
  {
    id: 'data-report',
    name: '数据播报',
    description: '数字滚动 + 对比条，适合周报/成绩单。',
    build: () => [
      make('core-number-roller', '核心数字滚动', 0, 3, 'left', { label: '本周新增用户', target: 12847, suffix: '+' }),
      make('compare-bars', '左右对比条', 3, 3, 'right', { leftLabel: '上周', rightLabel: '本周', leftValue: 42, rightValue: 88 }),
      make('golden-reveal', '金句逐行揭示', 6, 4, 'left', { tag: '结论', lines: '增长来自新渠道\n留存明显提升\n下月继续加码' }),
    ],
  },
  {
    id: 'quote-card',
    name: '金句卡',
    description: '单张金句收尾，适合短视频封面/结尾。',
    build: () => [
      make('golden-reveal', '金句逐行揭示', 0, 5, 'center', {
        tag: 'SLOGAN',
        lines: 'Less but better\n少即是多\n克制即高级',
      }),
    ],
  },
  {
    id: 'opener',
    name: '开场',
    description: '大数字开场 + 对比，建立气势。',
    build: () => [
      make('core-number-roller', '核心数字滚动', 0, 2.5, 'center', { label: '动效编辑台', target: 2026, suffix: '' }),
      make('compare-bars', '左右对比条', 2.5, 3, 'left', {}),
    ],
  },
  {
    id: 'full-demo',
    name: '完整示例工程（含段落场景）',
    description: '段头 + KPI + 信息板 + 金句 + 结尾，带 seg 分组与 dimAt 渐隐，作为内置示例。',
    build: () => [
      make('section-header', '段头·开场', 0, 3, 'left', { num: '01', title: '增长复盘', subtitle: '本期讲三件事' }, { seg: '开场' }),
      make('kpi-card', 'KPI·总用户', 0.5, 3.5, 'right', { label: '总用户', target: 35800, suffix: '', unit: '', trend: 'up' }, { seg: '开场', dimAt: 3 }),
      make('section-header', '段头·数据', 3.5, 2.5, 'left', { num: '02', title: '关键数据', subtitle: '三个指标看趋势' }, { seg: '数据' }),
      make('data-grid', '数据网格', 4, 4, 'right', { items: '新增用户,1200\n付费转化,8.4%\n次日留存,61%\n平均时长,7.5分' }, { seg: '数据', dimAt: 3.5 }),
      make('info-board', '信息板·结论', 8, 4, 'left', { title: '本段结论', rows: '结论一,数据支撑充足\n结论二,路径已经跑通\n结论三,可复制可放大' }, { seg: '结论' }),
      make('quote-card', '金句', 8.5, 3.5, 'right', { quote: '把复杂留给系统，把简单留给人。', author: '—— 动效编辑台' }, { seg: '结论', dimAt: 3 }),
      make('cta-card', '结尾·行动', 12, 3, 'center', { text: '关注我，下期继续', sub: '每周更新实战干货', btn: '立即关注' }, { seg: '收尾' }),
    ],
  },
  {
    id: 'code-driven-opener',
    name: '代码驱动开场',
    description: '开场演示序列：3D 数据竞速 → 中心卫星环 → 概念放射图 → 工具替代卡，适合做教程 / 产品介绍引子。',
    build: () => [
      make('bar-chart-3d', '3D 数据竞速', 0, 4, 'center', {
        title: '十国 GDP 竞速',
        subtitle: '10 GDP RACE / 1990-2024',
        year: '2021',
        rows: '美国,26.9,#fbbf24\n中国,17.8,#ef4444\n日本,4.2,#f8fafc\n印度,3.5,#a78bfa\n德国,4.1,#60a5fa\n英国,3.3,#3b82f6\n法国,3.0,#34d399\n俄罗斯,2.0,#f87171',
        unit: 'T',
        showRank: true,
      }),
      make('orbit-core', '中心卫星环', 4.5, 5, 'center', {
        centerIcon: '▶',
        centerLabel: 'REMOTION',
        centerSub: 'CODE DRIVEN VIDEO ENGINE',
        items: 'React\nSVG\nAudio\nTimeline\nExport\nFrames\nspring\ninterpolate',
        radius: 220,
        size: 60,
        orbitDuration: 22,
        showLines: true,
        showRays: true,
      }),
      make('concept-map', '概念放射图', 10, 5, 'center', {
        leftTitle: 'CODE DRIVER',
        codeLines: 'useCurrentFrame()\ninterpolate(frame)\n<Composition />\nspring({fps})\nreturn <Scene />\nprops -> motion',
        centerTitle: '大模型',
        centerSub: 'READS CODE',
        centerHint: '看懂代码',
        rightTitle: '完成创作',
        outputs: '字幕\n文案\n动效\n镜头\n导出',
      }),
      make('tool-crossout', '工具替代卡', 15.5, 5, 'center', {
        title: '没条件用 Codex、Claude Code',
        subtitle: '没关系，工作流不必停下。',
        oldTools: 'Codex\nClaude Code',
        altTitle: '国产替代全都能胜任',
        newTools: 'TRAE Work\nQclaw\nAutoClaw\nCoPaw',
        crossColor: '#ef4444',
      }),
    ],
  },
]
