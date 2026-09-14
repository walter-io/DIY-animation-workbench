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
│      PreviewCanvas    中间：预览画布（所见即所得）
│      Timeline         中间：时间轴编排
│      ParameterPanel   右栏：选中卡的参数控件（由 schema 自动生成）
│      SfxPlayer        无渲染播放驱动：跟播放头在起音点触发音效
│      PlayerDriver     播放循环与倍速
│      HostLayer        机位/出镜素材渲染层
│      RenderStage      ?render=1 时的导出渲染页（复用 PreviewCanvas）
│      ExportModal / SrtImport / TemplateGallery / HomePanel / ResetConfirmModal
│      Modal.tsx / primitives.tsx / Switch.tsx / FocalPicker.tsx
│
├─ 动效卡库/                      # ★ 卡包根目录（纯内容，非代码）
│  ├─ README.md                   # 包规范（给做包的人看）
│  └─ <包目录>/manifest.json + cards.js
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
     description: '一句话说明',
     component: MyCard,
     schema: [ { key: 'label', label: '标签', type: 'text', default: '…' } ],
     defaultParams: { label: '…' },
   }
   ```

   `schema` 的 `type` 支持：`text` / `number` / `range` / `select` / `color` / `bool`，参数面板据此自动生成控件。

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

已知约束：**透明导出会整段排除图片/视频素材**（透明片本来就是拿去叠到别的画面上的），UI 里有显式警告文案，别默默删掉。

---

## 8. 内容包体系

目标：**动效卡库是一份独立的「内容」，随拷随删，主程序零内置**。

```
动效卡库/<包目录>/manifest.json + cards.js         一个子目录 = 一个包，文件名随便起（中文也行）
```

关键设计：**没有清单文件，也没有同步命令**。`vite.config.ts` 的 `contentPacksPlugin` 提供
`GET /api/content` —— **每次请求都实时扫一遍这个目录**（一级子目录里找到 `manifest.json` 就认），
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
| `npm run build` | `tsc -b` + 生产构建到 `dist/`（同时把 `动效卡库/` 拷进去；拷贝走手写 `copyDir`，见 §10-8） |
| `npm run lint` | oxlint |
| `npm run sync:hf` | 重建 hyperframes 资源清单（注意：会把精简掉的模板同步回来） |
| `npm run verify:sfx` / `verify:subtitle` / `verify:ui` / `verify:panel` / `verify:video` / `verify:subs` / `verify:margin` / `verify:hf` | 各模块自检 |
| `npm run audit:layout` | 布局审计 |

全部 verify 脚本都要求 dev server 已经挂着（读环境变量 `VERIFY_BASE`，缺省用各脚本里的默认值）。

---

## 10. 已知坑（Pitfalls）

1. **StrictMode 会吃掉一次性监听**：`PacksBootstrap` 的 effect 在 dev 下会「挂载 → 清理 → 再挂载」。如果把 `bootstrapped` 判断写在注册监听**之前**，第二次挂载直接 return，而第一次注册的监听已被清理删掉 —— 症状是「首屏有卡，但之后停用/重扫都推不进 store」。**监听每次挂载都要注册，去重只用于「要不要再装载一次」。**
2. **设置面板的下拉 CSS 优先级**：`.os-dd-form label { flex-direction: column }` 会压过行内布局，横向行必须显式写 `.os-dd-form label.os-dd-row { flex-direction: row }`，否则「标题 + 滑杆 + 数值」被挤成三行，面板虚高。
3. **`normalizeSfxId` 不要改写成「只允许已注册 id」**（理由见 §5）。
4. **图片/视频素材 + 透明导出不兼容**，ExportModal 里有警告文案，别默默删掉。
5. **停用包的偏好记在 localStorage**：换浏览器 / 清除缓存会回到「全部启用」，这是预期行为，别当成 bug 去「修复」。
6. **导出依赖本机 ffmpeg**：`EXPORT_WORKERS` 可调并行渲染页数（默认串行 —— 实测并行反而更慢，见 `vite.config.ts` 注释）。
7. **内容目录的实时扫描是 dev 专有**：`/api/content` 由 dev server 提供；`dist` 里靠 `writeBundle` 生成的静态 `content-index.json`。改了扫描逻辑要两条路一起测，别只测 dev。
8. **`fs.cpSync` 在中文路径上会把 node 进程打崩**：把 `动效卡库/` 拷进 `dist/` 时，`fs.cpSync(from, to, {recursive:true})` 会**让进程当场死亡** —— 无异常抛出、无 stderr、无任何回调，退出码 `0xC0000409`（STATUS_STACK_BUFFER_OVERRUN），`vite build` 于是静默中断：`tsc` 说通过、退出码看着像成功，产物里却只有一个**空的内容目录**、`content-index.json` 也不生成，而且**看不到任何报错**（`catch` 也拦不住，因为进程直接没了）。
   - 症状极具迷惑性：只有 dir 为空这一条线索，很容易怀疑是钩子没触发（`writeBundle` vs `closeBundle`）。**排查手法**：在钩子里每一步 `fs.appendFileSync` 打点落盘，最后一行停在哪个调用上就是它崩的。
   - **正确做法**：内容拷贝一律走 `vite.config.ts` 里的手写 `copyDir()`（`readdirSync` + `copyFileSync`），别用 `cpSync`。同理，构建脚本里凡是碰中文源/目标路径的 `cpSync` / `cp` 都要留意。
   - 附带教训：`writeBundle` 之后 dist 若异常，先怀疑进程崩溃，而不是钩子时机。
9. **静态托管的 dist 要拿 ASCII 别名**：中文目录名 `动效卡库/` 在某些静态服务器 / 工具链上会出问题，所以 `writeBundle` 会额外把内容拷一份到 `dist/content/{cards,sounds}`；前端 `fetchContentIndex()` 与卡入口都按「先 ASCII 别名、失败再回退中文路径」探测。`scripts/smoke-dist.mjs` 专门用纯静态服务器托管 `dist/` 来回归这条链路（不依赖 dev server）。
