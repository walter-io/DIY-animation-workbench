# 动效编排工作流

把一段口播字幕（SRT）编排成动效编辑台工程 JSON。

## 工作流

1. **取卡片清单**：启动本地工作台后，`GET http://localhost:9379/api/registry`
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

## 铁律

- 只用 `/api/registry` 返回的卡片 id，不要杜撰。
- `params` 必须用卡片的 `defaultParams` 作底，再覆盖。
- 同段同槽不要时间重叠（lint 会报 warn）。
- 不要写代码，只出 JSON。
