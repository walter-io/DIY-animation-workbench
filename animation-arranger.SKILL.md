# 动效编排工作流

把一段口播字幕（SRT）编排成动效编辑台工程 JSON。

## 工作流

1. **选库**：动效卡分两个库，先按视频类型定库：
   - **常规库**（`lib: regular`，绝大多数卡）：局部效果卡，直接叠在有人物的口播画面上。
   - **解说库**（`lib: explain`，`id` 以 `ex-` 开头）：知识解说整页卡，观感是"在播一页好看的 PPT"，
     配「自定义」出镜小窗使用。适合讲解概念、讲流程、讲原理的知识类视频。
   两个库的卡可以混编，但一条片子别来回横跳 —— 要么主体常规 + 少量解说页，要么整片走解说。
2. **取卡片清单**：启动本地工作台后，`GET http://localhost:9379/api/registry`
   返回所有可用动效卡的 `id / name / category / description / schema / defaultParams`。
   只用这里列出的 `id`，不要自己编。
2. **读 SRT**：把用户给的 .srt 解析成 `[{start, end, text}]`。
3. **分段**：按语义把字幕切成段，每段 = 一个论点。
4. **出编排 JSON**：每段配一张卡，给出 `effectId / start / duration / slot / params / seg`。
   `start` 用字幕时间（秒）；`duration = end - start`；`seg` 填段名（同段同槽会做重叠 lint）。
   段首用「段头卡」，段尾用「信息板卡」或「金句卡」收束，结尾用「结尾行动卡」。
5. **lint 自检**：导入工作台时自动跑 lint，`error>0` 必须修。

## 输出 JSON 格式（动效工程）

```json
{
  "name": "示例：增长复盘",
  "skin": "dark",
  "style": "glass",
  "font": "sans",
  "fps": 30,
  "duration": 30,
  "layout": "edit",
  "instances": [
    {
      "id": "i1",
      "effectId": "section-header",
      "name": "段头·开场",
      "start": 0,
      "duration": 3,
      "slot": "left",
      "seg": "开场",
      "params": { "num": "01", "title": "增长复盘", "subtitle": "本期讲三件事" }
    },
    {
      "id": "i2",
      "effectId": "kpi-card",
      "name": "KPI·总用户",
      "start": 3,
      "duration": 4,
      "slot": "right",
      "seg": "开场",
      "params": { "label": "总用户", "target": 35800, "suffix": "", "unit": "", "trend": "up" },
      "dimAt": 3.2
    }
  ]
}
```

## 画布背景（工程级）

`canvasBg` 决定**整块画布**的底色，写在工程根节点上（不是某张卡的 params）：

```json
{ "canvasBg": "cream" }
```

| 值 | 效果 |
|---|---|
| `auto`（默认） | 跟随主题底色（老工程行为） |
| `cream` | 米白纸感底 —— 知识解说片用这个 |
| `white` | 纯白 |
| `black` | 近黑（卡片文字色要改成浅色） |
| `custom` | 用 `canvasBgColor` 里的色值（如 `"#0f2b46"`） |

解说类编排建议：`canvasBg: "cream"`，卡片全部保持背景「透明」，不要给每张卡各贴一层底。

## 字段约束

- `skin`：`dark` / `light` / `mono`
- `style`：`glass`（毛玻璃）/ `flat`（实色板）
- `font`：`sans` / `serif` / `mono`
- `slot`：`left` / `right` / `center` / `bottom`
- `seg`：段名，同段卡片会被分组、可整段拖动
- `dimAt`：相对卡起点的渐隐秒点（可选），过了该点整卡淡出到 0.3
- `lintOff`：true 时该实例跳过 lint

## 卡片选用建议

| 场景 | 推荐卡片 |
|---|---|
| 段首点题 | `section-header` / `big-title` |
| 强调单一数字 | `core-number-roller` / `kpi-card` |
| 两个数对比 | `dual-number` / `compare-bars` |
| 占比/进度 | `ring-card` / `progress-bar` / `stack-bar` |
| 排名 | `rank-card` |
| 多指标 | `data-grid` |
| 流程/步骤 | `steps-card` / `timeline-card` |
| 观点收束 | `golden-reveal` / `quote-card` / `info-board` |
| 对比表 | `compare-table` / `two-col` |
| 结尾 | `cta-card` |

### 知识解说类（解说库）

整页卡，默认铺满画布，时长给 4~6 秒（跟着讲解走，别一句一页）。

**分段密度：一页装"一件事"，同类信息合页（12~20s 一页）。** 知识解说片跟常规叠加片的节奏完全不同 ——
整页卡一页就是一张画面，切太碎会让画面一直闪。所以：

- **一组并列信息必须落在同一页**：三档排名、四步流程、一串能力标签，都是一页一张卡，
  不要拆成"每两条一页"。拆开等于把名次关系/流程顺序弄丢。
- **但不同话题不要挤在一页**：页面上出现两个不相干的主题，比多切一页更糟。
- 每页条目上限（按卡片排版来，别硬塞）：清单页 6 条、步骤页 5 格、标签页 8 个、对比页左右各 5 条。
**解说卡默认不带背景（透明）** —— 编排时先铺一张 `ex-board-blank`（背景色：米白/白色/黑色/透明）；
用黑底时把卡片的「文字色」参数改成浅色（如 `#f5f5f5`），也可以给单张卡自选背景。

| 场景 | 推荐卡片 |
|---|---|
| 片头封面 | `ex-title-slide` |
| 进入新一章 | `ex-section-slide` |
| 一句话重点 | `ex-key-point` |
| 能力/例子列举 | `ex-tag-build` |
| 转折 / 强调短板 | `ex-highlight-turn` |
| 一二三并列要点 | `ex-checklist` |
| 流程链路 | `ex-steps-flow` |
| 前后 / 新旧对比 | `ex-versus` |
| 抛一个关键数字 | `ex-stat-hero` |
| 片尾收束 | `ex-end-slide` |

#### 解说元素卡（`exa-` 前缀，category = 元素）

组合页里用到的零件，拆出来单独用：内容自适应、透明背景，多张叠在同一时间点就拼成一页。
拼页套路：先铺一张 `ex-board-blank`（纸感/纯白/深色/透明底，可带底部进度条），
再把零件逐张叠上去（建议都用自由定位摆坐标）：

| 零件 | id |
|---|---|
| 大标题 / 副标题 / 引导行 | `exa-headline` / `exa-subhead` / `exa-eyebrow` |
| 深色药丸 / 白标签 / 强调药丸 | `exa-navy-pill` / `exa-tag` / `exa-amber-pill` |
| 编号行 / 步骤芯片 / 箭头 | `exa-number-row` / `exa-step-chip` / `exa-arrow` |
| 大数字 / 脚注 / 短线 / 正文段落 | `exa-big-number` / `exa-caption` / `exa-rule` / `exa-paragraph` |

## 铁律

- 只用 `/api/registry` 返回的卡片 id，不要杜撰。
- `params` 必须用卡片的 `defaultParams` 作底，再覆盖。
- 同段同槽不要时间重叠（lint 会报 warn）。
- 不要写代码，只出 JSON。
