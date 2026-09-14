# 动效库合并说明 · hyperframes-motion-library → animation-editor

## 背景

把 https://github.com/nutllwhy/hyperframes-motion-library 仓库的 23 个动效模板合并到本工作台 animation-editor，遵循"重复的与本仓库合并优化、不重复添加"原则。

## 合并方式

模板资产**内联进本仓库**（src/hyperframes/generated.ts，~170KB 23 个模板完整 HTML），不依赖外部目录、不依赖 vite 中间件 —— 动效卡作为本仓库原生资产。

运行时通过 `HyperframesCard` 桥接组件（iframe srcDoc 渲染内联 HTML，postMessage 同步进度，注入的 `getVariables` 传参），与本仓库 React 卡共用 registry/参数面板/时间轴/导出链路。

## 注册映射（23 模板 ↔ 本仓库 33 卡）

### 本仓库缺失 → 新增（4 张）

| 模板 id | 名称 | 类别 |
|---|---|---|
| `hf-bar-chart-grow` | 柱状图增长 | 数据 |
| `hf-line-chart-draw` | 折线绘制 | 数据 |
| `hf-source-citation-card` | 数据来源引用卡 | 信息 |
| `hf-iteration-loop` | 迭代闭环 | 信息 |

### 本仓库已有 → 合并优化（19 张，hf 与 React 版并存可互替）

| 模板 id | 对应本仓库卡 | 合并说明 |
|---|---|---|
| `hf-number-counter` | `core-number-roller` | 数字滚动/计数器 |
| `hf-metric-pulse` | `core-number-roller` | 数据脉冲（全屏增强） |
| `hf-big-number-card` | `big-title` | 大数字结论（数字版） |
| `hf-compact-number-callout` | `core-number-roller` | 全屏数字强调 |
| `hf-before-after-stat` | `dual-number` | 前后对比数字 |
| `hf-stat-duel` | `dual-number` | 双数据对比（叠加） |
| `hf-horizontal-bar-compare` | `compare-bars` | 横向条形对比 |
| `hf-top-rank-list` | `rank-card` | Top 排名 |
| `hf-turning-point-line` | `trend-card` | 拐点趋势线（折线增强） |
| `hf-status-split` | `two-col` | 状态转折（章节式） |
| `hf-number-impact` | `trend-card` | 极值刻度 |
| `hf-concept-spotlight` | `info-board` | 概念解释 |
| `hf-three-step-flow` | `steps-card` | 三步流程 |
| `hf-myth-fact-swap` | `tool-crossout` | 误区纠正 |
| `hf-key-point-marker` | `golden-reveal` | 重点标注 |
| `hf-checklist-pop` | `bullet-list` | 清单核对 |
| `hf-timeline-scan` | `timeline-card` | 时间线推进 |
| `hf-cause-chain` | `steps-card` | 因果链路 |
| `hf-mode-choice-compare` | `two-col` | 并列模式选择 |

合并优化机制：
1. **参数迁移**：`store.tsx` 的 `PARAM_TRANSFER` 补充了 hf 模板字段（`headline` / `targetValue` / `valueA`/`valueB` / `eyebrow` / `caption` / `term` / `cause`/`mechanism`/`result` / `point` 等），替换特效时共享文案/数字/标签自动迁移。
2. **添加位置**：hf 卡在 `addInstance` 时默认 `slot: 'center'`（全屏 1920×1080 模板适合居中），其余 React 卡保持左右交替。
3. **description 标注**：hf 卡的描述包含"已与本仓库「xxx」合并优化"提示，明确两版关系。

## 工程改动

| 文件 | 改动 |
|---|---|
| `src/hyperframes/registry.ts` | 23 张 hf 卡注册，component 用 `makeHyperframesEffect(templateId)` |
| `src/hyperframes/generated.ts` | 自动生成，23 模板完整 HTML 内联（gsap CDN 已本地化为 `/vendor/gsap.min.js`） |
| `src/hyperframes/HyperframesCard.tsx` | iframe srcDoc 渲染内联 HTML，postMessage progress 驱动 timeline.progress() |
| `src/hyperframes/merge.ts` | 模板 ↔ 本仓库卡的合并映射表 |
| `src/registry.ts` | 末尾展开 `...hyperframesRegistry` |
| `src/store.tsx` | `PARAM_TRANSFER` 补充 hf 模板字段；`addInstance` 对 hf- 卡默认 center slot |
| `src/components/EffectLibrary.tsx` | `CATEGORY_ORDER` 加 `'叠加'` |
| `public/vendor/gsap.min.js` | gsap 3.14.2 本地化（72KB），模板内联 HTML 引用 `/vendor/gsap.min.js` |
| `scripts/sync-hyperframes.mjs` | 同步脚本：扫描源目录生成 `generated.ts`（含内联 HTML），可由 `HYPEFRAMES_LIB` 环境变量指定源路径；源目录缺失时友好退出 |
| `scripts/verify-hf-bridge.cjs` | Playwright 验证脚本：registry 计数 / iframe 渲染 / bridge 注入 / 数字滚动 seek / 折线 SVG |

## 使用方式

启动工作台后（`npm run dev`），动效库自动多出 23 张 `hf-` 卡片：
- 缺失卡（4 张）直接在数据/信息分类下作为新增可用
- 重复卡（19 张）与本仓库 React 卡并排，参数互通，可在参数面板中"替换特效"互换

## 后续更新

模板从 hyperframes-motion-library 新版本更新时：
1. 克隆/拉取源仓库到 `../hyperframes-motion-library`（或用 `HYPEFRAMES_LIB` 指定路径）
2. 跑 `node scripts/sync-hyperframes.mjs` 重新生成 `generated.ts`
3. 重新 tsc + dev 验证

无需运行时依赖源目录。

## 验证记录

- `tsc -b --noEmit` 通过
- 验证脚本：registry 56 张卡、iframe 渲染、bridge 注入、本地 gsap、number-counter @50% 显示 1,262,415（progress 驱动有效）、line-chart-draw SVG path 存在
