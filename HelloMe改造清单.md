# DIY 动效编辑台 → HelloMe 合规包「整改清单」

> 依据：《HelloMe 技能包开发规范与 AI 施工手册（FDE 版）》v1.6.3
> 范围：**只出清单，不改代码**（按你选的「先出整改清单」）。
> 性质：把现有「纯前端 Vite + React」项目，**改造**成可在用户本机 Hermes 上运行的合规技能包。

---

## 0. 先说结论（3 个必须拍板的点）

1. 🔴 **视频导出功能是硬阻塞**。当前导出走 `vite.config.ts` 里的 dev-server 中间件：`playwright`(无头 Chromium) + 系统 `ffmpeg` 逐帧录屏。但 HelloMe 包**禁止打进 `node_modules`**、也不会替你 `npm install`；Chromium(~150MB+) 与 ffmpeg(外部二进制) 都无法随包分发。
   - 选项 A（推荐）：包内 **优雅降级**——检测不到 ffmpeg/playwright 时，导出按钮提示「本机需预装 ffmpeg 与 playwright」或改用纯前端 `MediaRecorder` 方案。
   - 选项 B：文档声明「需宿主预装 ffmpeg + playwright」（脆弱，不保证能跑）。
   - 选项 C：重写成不依赖无头浏览器的导出（工作量大）。
   - **不解决这一条，上架后导出必然失败。**

2. 🔴 **中文路径会被拒收**。规范的打包闸 `HOST_ASCII_ENTRY` 拦一切非 ASCII 的 zip 内路径。项目里 `动效卡库/`、`音效库/`、`启动工作台.bat` 等都是中文/带 bat，不能直接进包。内容包必须落到 **ASCII 路径**（如 `web/content/cards`、`web/content/sounds`），前端改读 ASCII 前缀。

3. ⚠️ **体积档大概率超 20MB**。默认档 = zip ≤ 20MB / 解压 ≤ 100MB / ≤ 2000 文件。音频库（`public/sfx` 20 个 mp3 + `音效库`）很可能超 20MB，需声明 `hellome-large-package: "true"`（放宽到 250MB/1200MB/100000）。但即便 250MB 也**装不下 Chromium**，所以第 1 点必须同步处理。

---

## 1. 包结构（§3.1）

| 项 | 现状 | 整改 |
|----|------|------|
| 扁平根：`SKILL.md` 在 zip 第一层（§3.1.2 套壳即拒） | ❌ 完全没有 `SKILL.md` | 新增，且打包时 **zip 根必须直接是 `SKILL.md`**（不能多套一层父目录） |
| 静态根 `web/index.html`（§3.1.1） | ❌ 构建产物在 `dist/`，不是 `web/` | `vite build` 的 `outDir` 改为 `web/`，**或**声明 `hellome-static-dir: "dist"`（需 hermes-min≥0.2.16）。建议直接改 `outDir: "web"` |
| 业务入口 `upstream/server.js`（本项目有服务端逻辑，不能纯静态） | ❌ 业务逻辑现在写在 `vite.config.ts` 的 dev 中间件里 | 新建 `upstream/server.js`：用 Node 静态伺服 `web/` + 实现 `/api/export`、`/api/registry`、`/api/content`，**只听 `HELLOME_UPSTREAM_PORT`** |
| 禁入：`node_modules`/`.git`/`__MACOSX`/`.DS_Store`/`.pyc`/`.bat`/`.cmd` | ✅ 打包脚本会静默丢弃这些 | 用附录 G 脚本打包即可；但 `启动工作台.bat`/`.command` 不要打进包 |
| 真 zip + POSIX `/` 分隔符（禁 `Compress-Archive`） | ❌ 还没打包 | 用附录 G 的 `pack_skill.py`（放在技能目录**外面**） |
| 干净打包目录 | ❌ 现有仓库根含 `src/ scripts/ public/ vite.config.ts .workbuddy/` 等源码/工具 | 建议建一个 `pkg/` 干净目录，只放 `SKILL.md` + `web/`(构建产物) + `upstream/server.js` + 内容包(ASCII)，再对 `pkg/` 跑 G |

---

## 2. SKILL.md frontmatter + 17 键（§3.2 / §3.4）

| 项 | 现状 | 整改 |
|----|------|------|
| 无 BOM 的 UTF-8、文件名逐字 `SKILL.md` | ❌ | 新建，严格无 BOM（PowerShell 写时指定 `Encoding utf8` 仍可能带 BOM，用 `New-Item`/`-Encoding byte` 或 G 脚本自检） |
| `name`：`^[a-z0-9][a-z0-9-]{0,126}[a-z0-9]$`，与上传表单、zip 名三处逐字一致 | ❌ | 建议 `diy-animation-workbench`（三处必须完全一样：frontmatter = 上传表单 = `diy-animation-workbench-0.1.0.zip`） |
| `description`：非空，写清「干什么+何时用」 | ❌ | 例：「口播视频动效叠加工作台：导入口播稿自动生成动效卡，叠加到口播视频。被 HelloMe/FDE 启动唤起时打开」 |
| `version`：顶格、`MAJOR.MINOR.PATCH`（禁 `v` 前缀、`1.0`、`1.0.0-beta`） | ❌ | 从 `0.1.0` 起；改内容必须 bump，不允许同版本换包 |
| `metadata:` 独占一行；子键缩进 ≥2 空格；值是一行扁平字符串（数字/布尔也加引号） | ❌ | 严格按附录 F.1 排版；重复键直接报错 |
| 启动键（§3.4.2）：`hellome-adapter:"static"`、`hellome-base-port:"43800"`(避开 46000–46999)、`hellome-open-browser:"true"`、`hellome-health-url:"/"`(UI 包**禁写** `/health`、`/api/health`)、`hellome-health-type:"http"`、`hellome-auto-shutdown:"presence"`(UI 包**必写**，否则点不了本机测) | ❌ | 全部补齐 |
| 布局/生命周期键：`hellome-static-dir:"web"`、`hellome-upstream-script:"upstream/server.js"`、`hellome-upstream-language:"node"`、`hellome-upstream-prefix:"/api"`(默认，静态只反代 `/api*`) | ❌ | 补齐；声明任一布局键 → `hellome-hermes-min` 必须 ≥ 0.2.16 |
| 安装/卸载键：`hellome-hermes-min:"3.2.0"`、`hellome-deps:"node>=20"`(只声明引擎下限，不执行 npm)、`hellome-data-policy:"preserve"`(默认) | ❌ | 补齐 |
| `hellome-large-package` | ❌ | 按 §0.3 判断，大概率需 `"true"` |
| `hellome-hook-before-stop-url`（长任务 flush，可选） | ❌ | 导出是长任务，建议加一个 flush 端点，正文写明「关页后生成会中断，可从数据目录恢复」 |
| 正文「注意」里补 Node 子进程那句（消黄条 `HOST_NODE_DEP`，四个固定词之一：`Node.js`/`nodejs`/`HELLOME_NODE`/`upstream/server.js`） | ❌ | 照抄 F.1 的 Node 句子，别改写 |
| 不要的一期旧键 / 禁用键（`hellome-command` 等） | ✅ 没有 | 保持 |

---

## 3. presence 关页停服（§3.11）—— UI 包强制

| 项 | 现状 | 整改 |
|----|------|------|
| 每个入口 HTML 带 `data-hellome-presence` 协议：clientId 存 **sessionStorage**、发 `hello`、每 ~20s 发 `ping`、离开发 `bye`(优先 `sendBeacon`)、**只监听 `pagehide`** | ❌ `index.html` 没有 presence | 把附录 F.2 整段抄进 `index.html`（可加注释，可放 `</head>` 前；只改 `sessionStorage` 键名里的 skill 名）。本项目只有 `index.html` 一个入口，覆盖即可 |
| 写了 `hellome-auto-shutdown:"presence"` 才能点本机测 | ❌ | 见 §2 启动键 |
| 不要自己实现 `/api/presence`（adapter 已提供）；保留路径 `/health /api/health /api/meta /api/presence*` 业务禁止占用 | ⚠️ 现有 API 是 `/api/export /api/registry /api/content`，不冲突；但不要新增占用保留路径 | 核对 `upstream/server.js` 不实现 `/api/presence` |

---

## 4. 前端构建（§3.10 Vite/SPA）

| 项 | 现状 | 整改 |
|----|------|------|
| 资源路径相对：`base: './'` | ❌ 当前未设 base（默认 `/`） | `vite.config.ts` 加 `base: './'` |
| 业务 API 用相对路径 `/api/...`，不写死 localhost 端口 | ⚠️ 前端 fetch 是否写死端口需查（导出走 initScript 注入 host） | 确保页面请求 `/api/*` 相对路径 |
| 每个入口 HTML 有 F.2 presence | ❌ | 见 §3 |
| 不用 `dist/` 当默认静态根（除非声明 `static-dir`） | ⚠️ 现产物在 `dist/` | 改 `outDir: "web"` 最干净 |
| `.py/.js` 入口安全扫描覆盖；`.mjs/.cjs` 不要把密钥/默认 openai 基址只写里面 | ✅ 无密钥 | 保持 |

---

## 5. 运行时纪律（§3.6.1 / §4.3）—— 写 `upstream/server.js` 时遵守

| 项 | 现状 | 整改 |
|----|------|------|
| upstream **只听** `HELLOME_UPSTREAM_PORT`（别名 `PORT`），**env 为空必须退出非 0**；只绑 `127.0.0.1` | ❌（原逻辑在 vite 中间件里） | 新 server.js 严格按此实现；`GET /health`→200、`GET /`→200 |
| 业务禁止打印 `*_READY url=` | ✅ vite 没打 | 保持；G 会扫 `upstream/` 里的 READY |
| 数据只写 `HELLOME_SKILL_DATA_DIR`，**禁止写安装树**；不把 `C:\`/`/Users/` 当默认路径 | ⚠️ `vite.config` 用 `os.tmpdir()` 存导出素材/帧（属临时，非安装树，可接受；但更规范应走 `HELLOME_SKILL_DATA_DIR`） | server.js 里把导出中间产物目录改为读 `HELLOME_SKILL_DATA_DIR`，空则回退 tmp |
| 不调 LLM、无真实 `sk-` 密钥、默认基址不是 `openai.com` | ✅ 当前无 | 保持 |
| 不自开浏览器（`window.open` 打开技能主页） | ✅ 无 | 保持；靠 `hellome-open-browser:"true"` |
| 不做 `.bat`/GNU `timeout` 起服 | ⚠️ 有 `启动工作台.bat`（本地用，不打进包） | 不打进包即可 |

---

## 6. 内容包与中文路径（§3.1.3 / §3.4.5）

| 项 | 现状 | 整改 |
|----|------|------|
| 中文目录名 `动效卡库/`、`音效库/` 不能进 zip | ❌ | 打包时内容只落到 **ASCII** 路径：`web/content/cards/<pack>/`、`web/content/sounds/<pack>/`；前端 `CONTENT_ROOTS` 的 url 改读 `/content/cards`、`/content/sounds`（项目已在 build 里生成 ASCII 别名 `content/`，**只需删掉中文名副本**即可避坑） |
| 每个内容包有 `manifest.json` + 运行时 `import(url)` 的 ESM（`cards.js`） | ✅ 已有（`示例包`） | 保持；包内路径全 ASCII |
| 页面文案可用中文，但**文件名**用拼音/英文 | ⚠️ mp3/manifest 文件名目前是英文，OK | 保持；检查 `动效卡库/示例包/cards.js` 内部 import 的资源路径也是 ASCII |

---

## 7. 打包与上传（§0.3 / 附录 G）

| 项 | 现状 | 整改 |
|----|------|------|
| 用 `pack_skill.py`（放技能目录**外面**），`python pack_skill.py <dir> <name>-<ver>.zip --expect-name <name> --expect-version <ver>` | ❌ | 拷贝附录 G 原样保存；判据 = 末尾两行 `OK:` 且退出码 0；`WARN` 逐条看 |
| zip 名必须正好 `<name>-<version>.zip`，且不能落在技能目录里 | ❌ | 注意两条约定 |
| `WARN` 不挡打包但要看：如 `HOST_NODE_DEP`（正文补 Node 句消）、`HOST_REUSED_PLACEHOLDER`（REUSED 真名只 WARN） | ❌ | 逐条清零/确认 |
| 终验：G 打印 OK → 上传 Inspector 过 → 120s 内 READY → 关页停服 | ❌ | 按 §4.4 真机清单验收 |

---

## 8. 不建议现在做（§4.2 铁律）

- **禁止顺手重构业务代码**。改造顺序固定：**结构 → frontmatter → 启动键 → 运行时纪律 → 词元**。本次无 LLM/词元，最后一步可省。
- 不要去「优化」导出管线本身（除非先拍板 §0 的第 1 点）。
- 不要为了合规改产品形态；合规是「外套」，业务是「内核」。

---

## 9. 落地步骤建议（确认后执行）

1. 拍板 §0 三个点（尤其导出降级方案）。
2. 建 `pkg/` 干净目录；`vite build` 产物进 `web/`（`base:'./'`、内容只留 ASCII 别名）。
3. 写 `SKILL.md`（F.1 模板 + Node 句 + 17 键）。
4. 写 `upstream/server.js`（静态伺服 `web/` + `/api/export|registry|content`，听 `HELLOME_UPSTREAM_PORT`，`/health`、`/` 返回 200）。
5. `index.html` 注入 F.2 presence。
6. `server.js` 数据目录改读 `HELLOME_SKILL_DATA_DIR`。
7. 跑附录 G 打包 → 上传 FDE → 本机测 → 关页停服验收。
