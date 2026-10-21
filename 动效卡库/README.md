# 动效卡库

**这一个目录放的都是「内容」，不含任何代码逻辑。** 主程序启动时自动扫描，手动增删目录即可，不用改任何代码、不用跑任何命令。

```
动效卡库/
└─ <你的包目录名>/        ← 一个子目录 = 一个卡包，目录名随便起（中文也行）
   ├─ manifest.json      ← 必填：包的元信息 + 入口
   └─ cards.js           ← 卡的实现（纯浏览器 JS）
```

## 怎么增删卡包

| 想做的事 | 操作 |
|---|---|
| 装一个卡包 | 把整个包目录拷进 `动效卡库/` |
| 卸载一个卡包 | 把那个目录删掉 |
| 先在本机验一下 | 把目录拷进来 → 刷新页面（或点「拓展包 → 重新扫描」） |

主程序**不认识某个具体包的名字**，它只认「目录里有 manifest.json」这件事，所以加多少都一样处理。

## manifest.json

```jsonc
{
  "id": "示例包",                // 唯一 id，建议就用目录名
  "name": "示例包 · 洞察卡片",    // 面板上显示的名字
  "version": "1.0.0",
  "vendor": "DIY动效编辑台",
  "description": "一句话说明，显示在拓展包面板上",
  "product": { "contact": "", "homepage": "" },  // 纯展示，不校验
  "cards": "cards.js"            // 卡入口，相对本目录
}
```

## cards.js 怎么写

包是运行时 `import()` 加载的**纯浏览器 ESM**，不经过 Vite 编译，所以有四条硬约束：

| 约束 | 做法 |
|---|---|
| 不能用 JSX | 用 `React.createElement`（惯例简写成 `h`） |
| 不能 `import 'react'` | `const { React } = window.__OS_WORKBENCH__`（主程序注入） |
| 不能用 CSS animation / setTimeout 做动画 | 只用 `progress`（0~1）算样式 —— 导出是逐帧 seek + 截图，走真实时钟会被录成随机相位 |
| 不能用 TS 语法 | 纯 JS + JSDoc |

导出结构要和主程序的 `EffectDef` 对齐：

```js
export default [
  {
    id: 'pack-insight-value',   // 全局唯一，建议加前缀，和内置卡区分
    name: '洞察数值卡',
    category: '数据',            // 用主程序已有的分类，动效库里才会归到对应分组
    lib: 'explain',              // 可选：'explain' = 归入解说库；不填 = 常规库（默认）
    description: '一句话说明',
    component: InsightValueCard, // (props: { params, progress, meta }) => ReactElement
    schema: [                    // 参数面板据此自动生成控件
      { key: 'label', label: '标签', type: 'text', default: '人均产出提升' },
    ],
    defaultParams: { label: '人均产出提升' },
  },
]
```

`schema` 的 `type` 支持：`text` / `number` / `range`（带 min/max/step）/ `select`（带 options）/ `color` / `bool`。

样式：想跟随用户选的工程主题色，就用主程序的画布色变量 `--stage-accent` / `--stage-data` / `--stage-special` / `--stage-text`；想完全自控外观，就写自己的内联样式，两者互不影响。

照抄 `示例包/cards.js` 是最快的起步方式。

## 注意

- 卡 id **不要和内置卡重名**（重名会被跳过，装不进去）。
- 工程里引用了没装载的卡时，实例仍留在时间轴上并提示缺卡；重新装回来就恢复，**不会丢编排**。
- 音效不在这个目录里 —— 音效请放邻居的 `音效库/`。
