# DEVELOPMENT.md · 开发文档

给改代码的人看的。使用者教程在 [`README.md`](./README.md)。

---

## 0. 文档地图

| 文件 | 读者 | 内容 |
|---|---|---|
| `README.md` | 使用者 | 怎么启动、怎么做出第一条、导出参数怎么选、常见故障 |
| **`DEVELOPMENT.md`**（本文） | 开发者 | 目录结构、模块职责、数据流、怎么加卡加音效、导出管线、校验脚本、已知坑 |
| `动效卡库/README.md`、`音效库/README.md` | 做内容包的人 | 两个内容目录的约定、manifest 字段、cards.js 写法约束、商业化钩子 |
| `animation-arranger.SKILL.md` | AI / 编排者 | SRT → 工程 JSON 的编排工作流（`/api/registry` 是唯一卡片来源） |
| `SRCVID_REVERSE_DESIGN.md` | 卡作者 | 参考视频反向工程策略与动效清单 |
| `src/hyperframes/MERGED.md` | 开发者 | hyperframes 大屏模板合并说明 |

---

## 1. 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 19 + TypeScript（strict） |
| 构建 | Vite 8 |
| 状态 | 自研 reducer + Context（`src/store.tsx`），无第三方状态库 |
| 动效 | 手写卡片组件，导出时**逐帧 seek**（详见 §6「卡片作者约定」） |
| 导出渲染 | Playwright（Chromium）录屏 / 逐帧截图 |
| 编码 | ffmpeg + ffprobe（自动验收） |
| Lint | `npm run lint`（oxlint） |
| 端到端验证 | Playwright 脚本，`scripts/verify-*.cjs` |

环境要求：**Node 22+**、本机装 `ffmpeg` / `ffprobe`（导出与验收依赖）、`npx playwright install chromium`。

---

## 2. 目录结构

```
DIY-animation-workbench/
├─ 启动工作台.bat / .command      # 一键启动（自动开浏览器到 9379）
├─ index.html                     # 应用入口
├─ vite.config.ts                 # Vite 配置 + 三个自定义插件（见 §7）
├─ package.json                   # 依赖与脚本
├─ tsconfig*.json                 # app / node / autocards / verify 多份配置
│
├─ src/
│  ├─ main.tsx                    # React 根 + 注入 window.__OS_WORKBENCH__（拓展包 SDK 全局）
│  ├─ App.tsx                     # 外壳：三栏布局、左右面板宽度拖拽、快捷键、Modal 路由
│  ├─ App.css                     # 编辑器全部样式（约 3800 行，按区块分区）
│  ├─ types.ts                    # ★ Project / Instance / EffectDef / MediaClip 等核心类型
│  ├─ store.tsx                   # ★ reducer + Context + undo/redo（commitProject）
│  ├─ registry.ts                 # ★ 内置卡片注册表（也被 /api/registry 暴露给 AI 编排）
│  ├─ effectCategories.ts         # EffectCategory 联合类型 + 分类排序/说明（写错分类会编译报错）
│  ├─ history.ts                  # undo / redo 栈实现
│  ├─ prefs.ts                    # 本机偏好读写（localStorage）
│  │
│  ├─ sfx.ts                      # ★ 音效库：合成音效 + 运行时注册 + 预览/离线混音
│  ├─ packRuntime.ts              # ★ 拓展包运行时：扫描、装载、启停、注销
│  ├─ srt.ts / split.ts           # SRT 解析、语义分段
│  ├─ subtitleTrack.ts            # 字幕轨：一句一卡、互不重叠的强度维护
│  ├─ lint.ts                     # 工程自检（AI 编排产物的守门员）
│  ├─ autoCards.ts                # 自动选卡（按语义给段落配卡）
│  ├─ templates.ts / script.ts    # 模板存取
│  ├─ tracks.ts                   # 时间轴行号 ↔ 画布 slot 的映射与 z-index 口径
│  ├─ cardKeyframe.ts / cardOpacity.ts / cardSize.ts   # 卡级微调 helpers
│  ├─ hostLayouts.ts / hostTrack.ts / hostTween.ts     # 机位 / 出镜素材轨与补间调度
│  ├─ mediaKeyframe.ts / mediaPersistence.ts           # 素材关键帧与持久化
│  ├─ themes.ts / accent.ts / easing.ts                # 皮肤 / 强调色 / 缓动
│  ├─ useVideoSync.ts             # 垫底视频与播放头同步
│  │
│  ├─ cards/                      # ★ 内置动效卡（98 张，按分类分目录，一卡一文件）
│  │   intro/ quote/ data/ compare/ flow/ relation/
│  │   list/ people/ overlay/ outro/ subtitle/ decor/
│  ├─ hyperframes/                # 1920×1080 全屏模板（hf-* 系列）：registry / presets / merge / modes
│  └─ components/                 # 编辑台 UI
│      TopBar           设置/皮肤/主题色/版本三件套/导出入口
│      EffectLibrary    左栏：分类动效库、搜索、悬停预览
│      MediaLibrary     左栏：图片/视频素材导入
│      PackPanel        左栏：拓展包列表与启停
│      PreviewCanvas    中间：预览画布（所见即所得）
│      Timeline         中间：时间轴编排
│      ParameterPanel   右栏：选中卡的参数控件（由 schema 自动生成）
│      SfxPlayer        无渲染播放驱动：跟播放头在起音点触发音效
│      PlayerDriver     播放循环与倍速
│      HostLayer        机位/出镜素材渲染层
│      RenderStage      ?render=1 时的导出渲染页（复用 PreviewCanvas）
│      ExportModal / SrtImport / TemplateGallery / HomePanel / ResetConfirmModal
│      Modal.tsx / primitives.tsx / Switch.tsx / FocalPicker.tsx
│      CardErrorBoundary # 单卡兜底：某张卡抛错时只降级这一张，不让整棵树被卸载（见 §10-13）
│
├─ 动效卡库/                      # ★ 卡包根目录（纯内容，非代码）
│  ├─ README.md                   # 包规范（给做包的人看）
│  └─ <包目录>/manifest.json + cards.js
├─ 音效库/                        # ★ 音效包根目录（同上，两类分开管理）
│  ├─ README.md
│  └─ <包目录>/manifest.json + *.mp3
│
├─ public/
│  ├─ sfx/                        # 内置采样音效 mp3（在 sfx.ts 里登记）
│  ├─ load-project.html / load-matched.html   # 工程 / 选卡结果预览页
│  └─ _imported-project.json / srcvid-transcript.txt
│
├─ scripts/                       # 开发/校验/截图脚本（100+，全部平铺无子目录）
│  ├─ verify-*.cjs                # 自检：packs / sfx / subtitle / layout / panel / video …
│  ├─ audit-layout.cjs            # 布局审计
│  ├─ shot-*.cjs / capture.cjs / render-shot.cjs   # 截图与单帧渲染
│  ├─ debug-*.cjs / diag-*.cjs / probe-*.cjs       # 排查脚本
│  └─ sync-hyperframes.mjs        # hyperframes 资源清单同步
│
└─ .workbuddy/memory/             # 项目记忆（每日日志 MEMORY.md）
```

> ★ = 理解这个项目最先该读的五个文件。

---

## 3. 数据流

```
用户操作 ──dispatch──▶ reducer(store.tsx) ──▶ state.project + state.plugins
                            │
                            ├─ commitProject()：写进 project 并压一条 history
                            └─ 自动持久化到 localStorage（animation-editor-project-v1）
                                     │
                                     ▼
        effects = [...registry, ...state.plugins]   ← 拓展包卡在运行时追加到这里
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        ▼                            ▼                            ▼
  PreviewCanvas（预览）        Timeline（编排）          EffectLibrary（选卡）
        │
        └─?render=1─▶ RenderStage ──Playwright──▶ ffmpeg ──▶ 成片
```

要点：

- **单一 reducer**：`src/store.tsx` 里一个 switch 处理全部 action。凡改 `project` 的动作都走 `commitProject()`，它会顺手压 undo 栈 —— 绕过它就等于这次改动不可撤销。
- **预览与导出同源**：导出页 `RenderStage` 复用的就是 `PreviewCanvas` 那套渲染，所以「预览看到的」和「导出的」天然一致，不存在两套布局实现。
- **外部可变状态用订阅接入**：音效名单（`subscribeSfx` / `getSfxVersion`）和包列表（`subscribePacks` / `packsSnapshot`）都是 React 之外的模块状态，UI 侧靠 `useSyncExternalStore` 订阅；装/卸包后下拉框才会立刻跟着变。
- **`plugins` 是唯一的运行时卡来源**：`effects = [...registry, ...state.plugins]`，拓展包只是往 `plugins` 里塞 `EffectDef`。

---

## 4. 加一张内置卡

1. **写组件**：`src/cards/<分类>/MyCard.tsx`，签名必须对齐 `EffectProps`：

   ```tsx
   export function MyCard({ params, progress, meta, isPreview }: EffectProps) { … }
   ```

2. **写 `EffectDef`** 并登记到 `src/registry.ts`（也可以直接在卡文件里 export，但统一在 registry 里登记更好找）：

   ```ts
   {
     id: 'my-card',
     name: '我的卡',
     category: '数据',            // 必须是 effectCategories 里登记过的名字，写错 = 编译报错
     lib: 'explain',              // 可选：'explain' = 解说库（整页卡）；不填 = 常规库（默认）
     description: '一句话说明',
     component: MyCard,
     schema: [ { key: 'label', label: '标签', type: 'text', default: '…' } ],
     defaultParams: { label: '…' },
   }
   ```

   `schema` 的 `type` 支持：`text` / `number` / `range` / `select` / `color` / `bool`，参数面板据此自动生成控件。
   `lib: 'explain'` 的卡（解说库）一律以 `ex-` 作 id 前缀，`cardMode()` 会自动把它当独立全屏处理（默认铺满画布）。

3. 若属于新分类，先在 `src/effectCategories.ts` 的联合类型与 `CATEGORY_ORDER` 里登记；注意 `src/sfx.ts` 的 `SFX_DEFAULT_BY_CATEGORY` 也按分类配默认音效，需要同步。

---

## 5. 音效库

`src/sfx.ts` 是唯一入口，对外 API 一览：

| 出口 | 用途 |
|---|---|
| `sfxLibrary()` / `sfxOptions()` | 当前全部音效 / 下拉选项（**不要再引用早已删除的 `SFX_OPTIONS`**） |
| `registerSfx(defs)` / `unregisterSfxByPack(packId)` | 运行时注册与整包注销 |
| `subscribeSfx` / `getSfxVersion` | 给 UI 的订阅接口 |
| `fileSfxDef({…})` | 用 mp3 造一个音效（拓展包的 manifest.sounds 走这条） |
| `playSfx(id, gain, sustain)` | 预览播放 |

两个约定别破坏：

- **`SfxId` 是开放字符串**（`BuiltinSfxId | (string & {})`），第三方包可以用任意 id。
- **`normalizeSfxId()` 必须放行任意非空字符串**：如果把未注册的 id 抹成 `'none'`，那么工程在没有装对应包的机器上打开一次，音效就被永久改掉了，装回来也回不来。宁可解算阶段查不到不响，也不要改写用户数据。

预览播放用 `AudioContext`，导出拌音用 `OfflineAudioContext` —— 两条路径共用同一份 `schedule(ctx, when)`，所以成片里的声音必然和预览一致。

---

## 6. 卡片作者约定（血泪级）

导出是「逐帧 seek + 截图」，所以：

| 不要 | 要 |
|---|---|
| `setTimeout` / `setInterval` 做动画 | 只用 `progress`（0~1）算样式 |
| CSS `animation` / `transition` 关键帧 | 同上 |
| 依赖 `Date.now()` / 真实时钟 | 同上 |

一张卡在某帧的样子必须是 **`f(params, progress)` 的纯函数**，否则每一次 seek 都会录到随机相位，成片是抖的。这条对内置卡和拓展包卡一样生效。

顺带：能用主营的画布色变量（`--stage-accent` / `--stage-data` / `--stage-special`）就用，用户的主题色才能覆盖到你这张卡；不想跟随就写自己的内联样式。

---

## 7. 导出管线

```
ExportModal（前端：选格式/透明/帧率/倍速/额外音轨）
   └─ 前端离线混音：OfflineAudioContext 把动效卡音效拌成一条 WAV（可与用户 audio 叠加）
        └─ POST /api/export  ──▶ vite.config.ts 的 exportPlugin()
              ├─ 素材中转：blob: URL 在无头页面拿不到 → 前端把像素以 base64 送过来落盘，
              │            再经 /api/export-media 回填成 http 地址
              ├─ 非透明：Playwright 录屏 → -ss 裁掉加载期 → setpts 还原倍速 → ffmpeg
              └─ 透明：逐帧 PNG 截图 → ProRes 4444 / VP9 + alpha
                   └─ ffprobe 自动验收（编码 + alpha 通道），结论回在响应头 X-Animation-Verify
```

### 运行前置：宿主必须装好 playwright + chromium + ffmpeg

导出**不是纯前端能力** —— 它靠宿主（跑 dev server 的那个环境）里的无头 Chromium 逐帧渲染 /
录屏。缺任何一样都会在「点开始导出」之后才失败，而且失败信息长得像玄学。三件事都要：

| 依赖 | 用途 | 装法 |
|---|---|---|
| `playwright`（npm 包） | 代码里 `await import('playwright')` 起浏览器 | 项目根目录 `npm i -D playwright` |
| chromium 浏览器二进制 | 真正渲染页面的那个浏览器 | `npx playwright install chromium` |
| `ffmpeg` / `ffprobe` | 封装成 mp4/mov/webm + 导出后自动验收 | Windows 装到 PATH（`ffmpeg -version` 能出东西即可） |

⚠️ **`playwright` 包装了 ≠ 浏览器装了**：`chromium.launch()` 会在缺二进制时报
`Executable doesn't exist at …`，所以 `npx playwright install chromium` 不能省。
Linux 上还要 `npx playwright install-deps`。

**未装时的实际报错（已实测，用户见过）**：

```
导出出错:{"error":"导出需要宿主安装 playwright 与 chromium（未检测到 playwright）"}
```

拆开看：`导出出错：` 是前端 `ExportModal` 的前缀（`setLog('导出出错：' + e.message)`），
后面那段 JSON 是**服务端返回的响应体**（`res.ok === false` → `res.text()`）。
**注意两种错误形状不一样，别被绕晕**：

- **JSON 形状** `{"error":"…"}`：来自 **HelloMe 技能包**里的 `upstream/server.js`
  （`hasPlaywright()` 检测失败 → handler 的 catch 里 `res.end(JSON.stringify({ error }))`，`Content-Type: application/json`）。
  也就是说这条报错是**打包版（技能包）**才会出现的形状。同一位置还有
  `导出需要宿主安装 ffmpeg（未检测到 ffmpeg）`。
- **纯文本形状** `Export failed: <stack>`：来自**本仓库** `vite.config.ts` 的 `exportPlugin()`（dev 环境），
  同时在 dev server 终端打印 `ERROR: …`，可用它定位是缺 package 还是缺浏览器二进制。

> 技能包与本仓库的同步：脚手架在 `DIY-animation-workbench-pro/.workbuddy/hellome-dev/`
> （**刻意放在包目录外**，因为官方 `pack_skill.py` 的 `SKIP_DIRS` 不认自定义目录，
> 留在包目录里会被原样打进 zip）。完整流水线 5 步见该目录的 `README.md`：
> 本仓库 `npm run build` → `assemble-hellome.cjs` → `pack-hellome.py`
> （内部调本机已装的官方闸 `E:\shuisheng\AI\agent\tools\pack_skill.py`，**以它打印两行 `OK:` 为准**）
> → `verify-hellome.cjs`（31 项，含「web/assets 与 dist 逐字节一致」防漏构建、
> 「zip 条目数 == 包目录文件数」防夹带）→ `smoke-hellome.cjs`（11 项，真浏览器跑通）。
> 产物落在 `.workbuddy/hellome-release/diy-dongxiao-workbench-0.1.0.zip`。
> `upstream/server.js` 不在自动同步范围内，改导出逻辑要手动同步。

**怎么判断到底缺哪样**：dev 环境看 dev server 终端那行 `ERROR:`；
技能包环境看响应体里的文字（`未检测到 playwright` / `未检测到 ffmpeg`）。
`Cannot find package 'playwright'` = 缺 npm 包；`Executable doesn't exist` = 缺浏览器二进制。
两者都补上后**重启服务**（`await import` / `require.resolve` 的结果不会热更新）。

**没装也能用**：编辑、预览、时间轴、动效库全都不依赖 playwright，
被挡住的只有「导出」这一步。要出片就得先把上面三样装齐。

已知约束：**透明导出会整段排除图片/视频素材**（透明片本来就是拿去叠到别的画面上的），UI 里有显式警告文案，别默默删掉。

---

## 8. 内容包体系

目标：**动效卡库与音效库是完全独立的两份「内容」，随拷随删，主程序零内置**。

```
动效卡库/<包目录>/manifest.json + cards.js        ┐ 一个子目录 = 一个包
音效库/<包目录>/manifest.json + *.mp3             ┘ 文件名随便起（中文也行）
```

关键设计：**没有清单文件，也没有同步命令**。`vite.config.ts` 的 `contentPacksPlugin` 提供
`GET /api/content` —— **每次请求都实时扫一遍这两个目录**（一级子目录里找到 `manifest.json` 就认），
所以使用者拷完刷新页面即生效；主程序里也**没有任何一个具体包的名字**。

装载流程（`src/packRuntime.ts`）：

1. 启动时 `<PacksBootstrap />` 触发 `loadPacksIntoRuntime()`；
2. `GET /api/content` 拿到分组清单（`groups[].kind` = `cards` / `sounds`），逐包读 manifest；
   - 卡包：`import(encodeURI('/content/cards/<包>/cards.js'))` → 给每张卡打 `plugin: true, packId`；
   - 音效包：照 `manifest.sounds` 用 `fileSfxDef()` 造 `SfxDef`（丢 mp3 就行，不用写代码）。
3. 卡的注册/注销统一走 store action `syncPackPlugins` + `registerPlugin`；
   - **卸载只走 `syncPackPlugins` 一个入口**（过滤 `p.packId`），别每条卡单独 register/unregister，迟早漏。
   - **内部 key 是 `类型:目录名`**（`cards:示例包`）：同名的一个卡包和一个音效包是两份独立内容，要能分别启停。
4. 音效走 `registerSfx` / `unregisterSfxByPack`；哪些被停用记在 localStorage。

**停用包不破坏工程**：工程里引用了缺失卡片的实例仍然留在时间轴上，重新装回来就恢复。

三个容易踩的点：

- **dev 必须自己垫静态中间件**：包是运行时 `import()` 加载的纯浏览器 ESM，Vite dev 会先把它当源码去 transform
  然后报 “should not be imported from source code”（public 目录更严重，静态中间件会直接跳过带 import 语义头的请求）。
  所以 `contentPacksPlugin()` 要在内部中间件之前拦住 `/content/**` 直接吐文件 ——
  **生产构建没有这个问题**（`writeBundle` 把两个目录拷进 dist + 落一份 `content-index.json` 兜底），别误删。
- **目录穿越**：两处静态服务都要 `path.resolve` 后校验仍在该内容目录内。
- **授权校验钩子**在 `loadPack()`：要加校验就在这一步读 manifest 的 `product` 字段，校验失败把状态标成 `error`。
  注意本地工具的前端校验只能做到「防君子」。

---

## 9. 常用脚本

先另开终端起服务（**这一步请你自己做**，不要用 agent 起）：

```bash
npm run dev -- --port 5199
```

| 脚本 | 作用 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | `tsc -b` + 生产构建到 `dist/`（同时把两个内容目录拷进去；拷贝走手写 `copyDir`，见 §10-8） |
| `npm run lint` | oxlint |
| `npm run sync:hf` | 重建 hyperframes 资源清单 |
| `npm run verify:packs` | 内容包端到端（自动发现→加入库→分包停用→重新启用） |
| `node scripts/smoke-dist.mjs`（`npm run smoke:dist`） | **不需要 dev server**：纯静态托管 `dist/`，回归「构建产物里的内容包是否可用」 |
| `npm run verify:sfx` / `verify:subtitle` / `verify:ui` / `verify:panel` / `verify:video` / `verify:subs` / `verify:margin` / `verify:hf` | 各模块自检 |
| `npm run verify:panel-header` | **自带 dev server**（自起自停）：左栏「动效库」头部在 220 / 180 / 300px 三种面板宽度下都不许把 `详情 / 简洁 / 全收` 挤出面板，36 条断言 + 三张截图进 `_screenshots/` |
| `npm run verify:addcard-place` | **自带 dev server**（自起自停）：新增动效卡的落位回归 —— 5 张卡不许叠在同一轨道、播放头插在已有卡中间时不许压上去、两张全屏卡要顺延、五轨占满才顺延时间，32 条断言 + 时间轴截图 |
| `npm run audit:contrast` | **自带 dev server**（自起自停）：逐元素算 WCAG 对比度，列出「看不清」的文字。`node scripts/audit-contrast.cjs [light\|dark] [auto\|cream\|white\|black] [--assert]`，报告进 `scripts/_tmp/contrast-out/`。会**逐个打开编辑台外壳与全部弹窗**（模板 / 导出 / 导入SRT / 历史版本 / 重置）分面审计；`--assert` 时有不合格项就退出码 1。当前基线：**四档配置全部 0 处不合格** |
| `npm run verify:readability` | **自带 dev server**（自起自停，串行跑 4 档）：可读性回归闸 —— 浅色 / 浅色+白画布 / 深色 / 深色+白画布，每档 ~1051 处文字全量过 WCAG 门槛，任一档不过就红 |
| `npm run verify:color-edit` | **自带 dev server**（自起自停）：改取色器（文字色 / 强调色…）的稳定性回归 —— 把改色事件摊到多个宏任务里与 React 渲染、iframe 重建交叉，59 条断言。覆盖 hf（iframe）卡 ×3 与纯 React 卡 ×2，判定「应用没被卸载 / 参数面板还在 / 单卡兜底没被触发 / 0 未捕获错误」 |
| `npm run audit:layout` | 布局审计 |
| `node scripts/verify-cardlibs.cjs` | **不需要 dev server**：自动选卡双卡库（常规 / 知识）回归，21 条断言。需先 `npx tsc -p tsconfig.autocards.json` |
| `node scripts/diag-autocards.cjs <srt>` | 打印某份字幕的分段边界与选卡结果（调密度时用） |

全部 verify 脚本都要求 dev server 已经挂着（读环境变量 `VERIFY_BASE`，缺省用各脚本里的默认值）——
**除了 `verify-cardlibs.cjs` / `diag-autocards.cjs`**，这两个是纯 Node 算法回归，直接把 `src/{autoCards,script,srt,types}.ts` 编到 `.ac-out/` 后 `require` 进去跑（见 §11）。

---

## 10. 已知坑（Pitfalls）

1. **StrictMode 会吃掉一次性监听**：`PacksBootstrap` 的 effect 在 dev 下会「挂载 → 清理 → 再挂载」。如果把 `bootstrapped` 判断写在注册监听**之前**，第二次挂载直接 return，而第一次注册的监听已被清理删掉 —— 症状是「首屏有卡，但之后停用/重扫都推不进 store」。**监听每次挂载都要注册，去重只用于「要不要再装载一次」。**
2. **设置面板的下拉 CSS 优先级**：`.os-dd-form label { flex-direction: column }` 会压过行内布局，横向行必须显式写 `.os-dd-form label.os-dd-row { flex-direction: row }`，否则「标题 + 滑杆 + 数值」被挤成三行，面板虚高。
3. **`normalizeSfxId` 不要改写成「只允许已注册 id」**（理由见 §5）。
4. **图片/视频素材 + 透明导出不兼容**，ExportModal 里有警告文案，别默默删掉。
5. **左栏宽度只有 220px（可拖到 180px），头部是「极限宽度」**：`动效库 (123)` 本身约 66px，`详情 / 简洁 / 全收` 三个按钮约 120px，加起来贴着 218px 的可用宽度。**任何往头部塞长文字的动作都会把按钮整组挤出面板**（实测越界 100px，按钮直接点不到）——长说明一律放到 `.os-lib-hint`（页签下方独占一行）。头部同时保留 `flex-wrap` 与两侧 `flex: 0 0 auto` 作为兜底：允许换行，但不允许压缩/越界。改完跑 `npm run verify:panel-header` 验。
5. **停用包的偏好记在 localStorage**：换浏览器 / 清除缓存会回到「全部启用」，这是预期行为，别当成 bug 去「修复」。
6. **导出依赖宿主环境，不只是 ffmpeg**：还需要 `playwright` npm 包 + chromium 浏览器二进制，三者齐了才能导出。完整报错样例与排查步骤见 **§7「运行前置」**。另外 `EXPORT_WORKERS` 可调并行渲染页数（默认串行 —— 实测并行反而更慢，见 `vite.config.ts` 注释）。
7. **内容目录的实时扫描是 dev 专有**：`/api/content` 由 dev server 提供；`dist` 里靠 `writeBundle` 生成的静态 `content-index.json`。改了扫描逻辑要两条路一起测，别只测 dev。
8. **`fs.cpSync` 在中文路径上会把 node 进程打崩**：把 `动效卡库/` 拷进 `dist/` 时，`fs.cpSync(from, to, {recursive:true})` 会**让进程当场死亡** —— 无异常抛出、无 stderr、无任何回调，退出码 `0xC0000409`（STATUS_STACK_BUFFER_OVERRUN），`vite build` 于是静默中断：`tsc` 说通过、退出码看着像成功，产物里却只有一个**空的内容目录**、`content-index.json` 也不生成，而且**看不到任何报错**（`catch` 也拦不住，因为进程直接没了）。
   - 症状极具迷惑性：只有 dir 为空这一条线索，很容易怀疑是钩子没触发（`writeBundle` vs `closeBundle`）。**排查手法**：在钩子里每一步 `fs.appendFileSync` 打点落盘，最后一行停在哪个调用上就是它崩的。
   - **正确做法**：内容拷贝一律走 `vite.config.ts` 里的手写 `copyDir()`（`readdirSync` + `copyFileSync`），别用 `cpSync`。同理，构建脚本里凡是碰中文源/目标路径的 `cpSync` / `cp` 都要留意。
   - 附带教训：`writeBundle` 之后 dist 若异常，先怀疑进程崩溃，而不是钩子时机。
9. **静态托管的 dist 要拿 ASCII 别名**：中文目录名 `动效卡库/` 在某些静态服务器 / 工具链上会出问题，所以 `writeBundle` 会额外把内容拷一份到 `dist/content/{cards,sounds}`；前端 `fetchContentIndex()` 与卡入口都按「先 ASCII 别名、失败再回退中文路径」探测。`scripts/smoke-dist.mjs` 专门用纯静态服务器托管 `dist/` 来回归这条链路（不依赖 dev server）。
10. **`addInstance` 的落位必须走 `pickPlacement`（`src/tracks.ts`）**：新卡**不能**写死 `start = 播放头` + `track = SLOT_TRACK[slot]`。用户反馈过「添加动效卡有的在同一个轨道上叠加在已有动效卡上面了」：从库里连点时，第 3 张又回到「左侧 / 轨道1」（`idx % 2` 交替），和第 1 张时段完全重合 —— 时间轴上两条卡条画在同一行（后画的盖住先画的），画布上也是同一块地方硬压。现在的顺序是「默认槽位+默认轨道 → 同槽位换空闲轨道 → 换空闲槽位 → 全占满才顺延时间」，判定口径有两条：**轨道冲突**（同一轨道 + 时段重叠，任何卡都算）与**画面冲突**（同槽位的两张非铺满卡时段重叠；两张全屏卡也算，因为整屏就一块地方）。改完跑 `npm run verify:addcard-place`。注意 `track` 与 `slot` 是解耦的：`slot` 决定画布位置，`track` 只决定层级与时间轴行，所以「换轨道」不会让卡在画布上换位置 —— 想让它真的换位置就得换 `slot`（`pickPlacement` 在槽位被占时会这么做）。
11. **浅色 UI 主题必须在 `.ui-light` 上写 `color`（`src/index.css`）**：`:root` 那句 `color: var(--ui-text)` 是**在 `html` 上求值**的（拿到深色值 `#eaeaec`），而 `.ui-light` 挂在 `.os-app` 这个**后代**节点上 —— 只换令牌不会改变 `html` 已经算好的 `color`。于是所有「没显式写 color、靠继承取色」的文字（弹窗标题、模板名字、按钮里的裸文本…）在浅色主题下会继承到近白色 → **白底白字，整块看不见**。用户报「模板里面文字都被白色主题给盖掉了」就是这个：模板名 `.os-tpl-name` 实测 1.03:1。修复就是给 `.ui-light` 补一行 `color: var(--ui-text)`。**别删那一行。**
    - 教训（比 bug 本身重要）：上一轮的对比度审计只跑了**编辑台外壳**，弹窗从来没进过审计范围，所以它报了「干净」。`scripts/audit-contrast.cjs` 现在会逐个打开所有弹窗（`SURFACES` 数组），**以后新增弹窗必须往那里补一行**，否则就是漏检。改完跑 `npm run verify:readability`。
12. **`paletteVars()` 绝不能输出空字符串（`src/themes.ts`）**：它是在 `...stageSkin.canvasVars` **之后**展开的，而默认工程的 `palette` 三个槽都是 `''`。若照旧写 `'--stage-data': p.data`，空串会先覆盖掉刚铺好的「按画布色调选出来的」语义色，然后 React 用 `style.setProperty(k, '')` 落下去等于**删除该声明** → 元素自己没有这个变量 → 一路继承到 `.os-app` 上的**皮肤**值。
    - 症状：**深色皮肤 + 白色画布**时，画布语义色仍是深色那套亮色（`#5ac8fa`），卡片上的数字 / 强调色在白底上只有 1.9:1，几乎看不见。浅色皮肤下恰好同值所以看不出来，这正是它一直没被发现的原因。
    - 正确写法：只输出用户**真正设过**的槽位（空则整个 key 都不出现）。`--stage-text` / `--stage-bg` 不在 `paletteVars` 里，所以它们一直是对的 —— 这个「一部分变量生效、一部分不生效」的现象就是定位线索。改完跑 `npm run verify:readability`（`dark white` 那一档专守这个坑）。
13. **iframe 卡（hf 卡）改参数会让整个编辑台白屏（`src/hyperframes/HyperframesCard.tsx`）**：用户报「点击『因果链路』这个动效卡编辑文字颜色会闪退」。根因是那个写 `--cardOpacity` 的 `useEffect`：改任意参数都会重建 `srcDoc`，iframe 文档换页的一瞬间 `contentDocument` **已经有值、但 `documentElement` 还是 `null`**，于是 `doc.documentElement.style` 抛 `Cannot read properties of null (reading 'style')`。**React 19 下 effect 里未捕获的异常会卸载整棵树** → 整个编辑台变白屏。
    - **它和具体哪张卡无关**：所有 hf（iframe）卡共用这个组件，所以**全都会中招**；纯 React 卡没有 iframe，不受影响。（用户问「其他动效卡会不会也有这个问题」—— 答案是 hf 那批都会。）
    - 修法：两级判空 `const rootEl = doc?.documentElement; if (rootEl) …`。别把 `.documentElement?.` 删掉。
    - **复现要点**：这是竞态，必须把改色事件用 `setTimeout` **摊到多个宏任务**里（别在一个同步任务里连发，React 会自动批处理掉、打不出竞态）。`npm run verify:color-edit` 就是这么做的。
    - 兜底：`src/components/CardErrorBoundary.tsx`（在 `PreviewCanvas` 里包住每张卡，`key={inst.id}`）把「整页白屏」降级成「这一张卡出错 + 重试按钮」。**注意它的存在会掩盖回归** —— 所以 `verify:color-edit` 断言的是「`.os-card-error` 没出现」，而不是「`.os-app` 还在」。
14. **`foldDeeper` 的合成方向与主循环相反（`scripts/audit-contrast.cjs`）**：审计器里主循环从元素往外走，`acc` 是**上层**，写 `over(acc, c)`；而 `foldDeeper` 从最深的 `html` 往里走，`acc` 是**下层**，必须写 `over(c, acc)`。早期两处都写成 `over(acc, c)`，于是每往下叠一层都把 html 的深色当成赢家 —— 任何渐变元素都会凭空多出一个「近黑底色」候选，`span.os-clip-name` 的深色字被误报成 1.08:1，还被错误地归因成 `mix-blend-mode`（工程里根本没有 mix-blend-mode）。另一个同源问题是「不透明渐变挡不住更深的层」：只要某层渐变每档都不透明，就必须 `break`，否则深色主题下时间轴底色又会冒出来当候选。**审计器自己也会说谎：报出可疑项时先验证它算的候选底色是不是真的存在于 DOM 里。**

---

## 11. 自动出卡：两个卡库（`Xxx` 的必经之路）

导入口播稿时可以选生成**常规动效卡**还是**知识动效卡**，两条链路共用 `src/autoCards.ts`，但取不同的分段档位与候选卡表。

```
parseSrt → chunkCues(cues, lib) → suggestCardsForChunks(chunks, lib) → addSrtInstance 落卡
                    ▲                          ▲
              CHUNK_PROFILE[lib]        CANDIDATES / EXPLAIN_CANDIDATES
```

| | 常规库 `lib: 'regular'` | 知识库 `lib: 'explain'` |
|---|---|---|
| 候选卡表 | `CANDIDATES`（`srcvid-*` / 覆盖型小卡） | `EXPLAIN_CANDIDATES`（`ex-*` 整页幻灯片） |
| 硬上限 | 12s / 90 字 | 20s / 150 字 |
| 落到画布 | 开场收尾 `fit:'full'`，论述段 `auto` 左右交替 | 一律 `fit:'full'` + `slot:'center'` |
| 门控（`SALIENCE_GATE`） | 3 —— 过渡段不出卡 | 1 —— 整页留空很难看，宁可出一页轻内容 |
| 每页条目上限 | 3~4 条 | 清单 6 / 步骤 5 / 标签 8 / 对比左右各 5 |

### 改这块之前必须知道的四件事

1. **`leadFamily` 里的步骤标记必须"句中才算"**：口播进入流程时说的是「接下来讲怎么用，第一步，…」，
   只看句首会判成 `trans` 家族，于是它和后面的「第二步/第三步」分属不同家族、家族守卫失效，
   一套四步流程被拆成「1 步一页 + 3 步一页」。所以用 `/第[一二三四五六]步/` 不带 `^`。
2. **序列不许腰斩**：`RANK_SEQ`（名次）和 `STEP_SEQ`（步骤）命中时 `inSeq` 为真，会**跳过全部断句条件**
   （包括硬上限），额度是 `SEQ_MAX_DUR`。否则一串 6 项排名会被切成三段，观众看不出名次关系。
   代价是常规库会出现超过 12s 的页 —— 这是有意的，`verify-cardlibs.cjs` 里专门断言"超 12s 的页必须发生在序列里"。
3. **`f.phrases` 里没有步骤名**：`cuesToPhrases` 会把「第一步，」这种 3 字标记当碎片丢掉，
   所以步骤名必须走 `f.stepTexts`（`stepTextsOf()` 从**原始字幕**抽：取"第N步"后到第一个逗号为止）。
   早期版本的 `phrases.filter(STEP_MARK)` 恒为空，步骤卡会误判成"这一段没有步骤"。
   同理，`f.steps`（标记个数）也必须从原文数。
4. **排名页的条目不能只取英文实体**：名次常常挂在中文名上（"第一梯队是混元四"），
   实体识别只认识拉丁词，直接 `f.tools` 会让第一梯队凭空消失。走 `rankItems()`，
   它优先取**带名次标记的短句**，再用 `dedupeTier()` 去掉重复档位（"第一梯队" vs "第一梯队是混元四"）。

### 回归验证

```bash
npx tsc -p tsconfig.autocards.json
node -e "require('fs').writeFileSync('.ac-out/package.json', JSON.stringify({type:'commonjs'}))"
node scripts/verify-cardlibs.cjs      # 语料 scripts/test-corpus-kb.srt
```

> 语料放在 `scripts/` 而不是 `scripts/_tmp/`：`_tmp` 会被定期清理，语料一丢这个回归就静默废掉了
>（`verify-autocards3.cjs` 现在就是这么坏的 —— 它依赖的 `_tmp/test-corpus*.srt` 已经被清掉）。
>
> ⚠️ 编译这一步要用 PowerShell / cmd 跑。在 Bash 沙箱里跑 `npx tsc -p tsconfig.autocards.json`
> 会出现「退出码 0、报错文件也写了，但 `.ac-out/` 的 mtime 没变」的情况，容易误以为改了没生效。
> 另一个坑：`tsconfig.autocards.json` 只 `include` 了 4 个文件，但 `autoCards → prefs → sfx` 会
> 把 `src/sfx.ts` 带进来，它在 `module: commonjs` 下报 `import.meta` 的错（TS1343）。
> **这两个错不影响产物**（tsc 默认 `noEmitOnError: false`），别去改 sfx。

### 已知缺口

- **口播稿里的中文数字解析不出来**：`script.ts` 的 `metricNumbers()` 只认 `\d+`，
  而 ASR / 手写稿常把数字写成「百分之九十二」「一百倍」「三成」。
  后果是这类段落拿不到 `pairs`（实体-数值对），数据页 / 对比条 / 环形图全部不触发，
  只能退成文字清单页（实测：一段"效率提升一百倍 / 正确率 92%→61%"被做成了三行残句清单）。
  想补的话要注意：中文数字同时也是**序号**（第一/第四步）和**型号**（混元四、千问三），
  这两类必须排掉，否则会往数据卡里灌假数字 —— 正好踩中这个仓库最在意的"不造数"红线。
