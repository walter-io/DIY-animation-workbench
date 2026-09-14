/**
 * 内容包运行时 —— 让「动效卡库」与「音效库」变成仓库根目录下两个可以徒手增删的文件夹。
 *
 * 使用者的心智模型：
 *
 *    动效卡库/<包目录>/manifest.json + cards.js     ← 拷进来就有，删掉就没
 *    音效库/<包目录>/manifest.json + *.mp3           ← 同上
 *
 * 全程**不需要改任何代码、不需要跑任何同步命令**：dev server 的 `/api/content`
 * 每次请求都实时扫一遍这两个目录（见 `vite.config.ts` 的 `contentPacksPlugin`），
 * 拷完刷新页面即生效。生产构建（dist）则在打包时落一份静态 `content-index.json` 兜底。
 *
 * 三个必须坚持的性质：
 *  1. **主程序零内置**：某个包的代码一行都不在主程序里，删掉文件夹就彻底消失；
 *  2. **可开关**：用户能单独停用某个包（它带来的卡 / 音效随之消失），偏好记在本机；
 *  3. **不破坏工程**：工程里引用了没装载或被停用的卡时，实例仍留在时间轴上，
 *     重新装回来就恢复 —— 绝不因为「这台机器没买」就把用户的编排抹掉。
 *
 * 装载结果写到哪儿：
 *   EffectDef → store 的 `syncPackPlugins` / `registerPlugin` → effects = [...registry, ...plugins]
 *   SfxDef    → sfx.ts 的运行时注册表（registerSfx / unregisterSfxByPack）
 * 这里只是装载器，不碰 UI。
 */
import { useEffect } from 'react'
import type { EffectDef } from './types'
import { fileSfxDef, registerSfx, unregisterSfxByPack, type SfxDef } from './sfx'
import { useEditor } from './store'

declare global {
  interface Window {
    /**
     * 主程序给内容包用的「SDK 全局」。
     * 包是运行时 `import(url)` 加载的纯浏览器模块，解析不了裸包名（'react' 之类），
     * 所以由主程序把 React 挂在这里，包里 `window.__OS_WORKBENCH__.React` 就能用。
     * 类型声明只此一处（两处声明会触发 TS2717）。
     */
    __OS_WORKBENCH__?: {
      React: unknown
      version: string
    }
  }
}

/** 内容分两类：动效卡包 / 音效包。两者独立启停、互不牵连 —— 这也是目录要分成两个的原因。 */
export type PackKind = 'cards' | 'sounds'

/** manifest 里用纯 JSON 描述一个采样音效（不用写代码，丢一个 mp3 进来就行） */
export type PackSoundSpec = {
  id: string
  name: string
  hint: string
  /** 大致时长（秒），用来判断要不要铺满长卡 */
  duration: number
  /** 相对包目录的文件名（也可写 http(s) 绝对地址，从 CDN 拉） */
  src: string
  /** 响度微调（0~1） */
  level?: number
  /** 下拉框分组名（不填就用包名） */
  group?: string
  sustain?: 'repeat' | 'loop'
}

export type PackManifest = {
  id: string
  name?: string
  version?: string
  vendor?: string
  description?: string
  /** 纯展示用的附加信息：购买联系方式等，不参与任何校验 */
  product?: { contact?: string; homepage?: string }
  /** 卡包才有：入口文件（ESM，default 导出 EffectDef[]） */
  cards?: string
  /** 音效包才有：采样音效声明 */
  sounds?: PackSoundSpec[]
  /** 服务端扫描时补上的字段：包所在的文件夹名（可以和 manifest.id 不一样） */
  dir?: string
}

export type PackStatus = 'idle' | 'loading' | 'ready' | 'error'

export type PackState = {
  kind: PackKind
  /**
   * 内部唯一 key：`类型:目录名`。
   * 同名的一个卡包和一个音效包是两份独立内容，要能分别启停，所以 key 必须带类型前缀。
   */
  key: string
  manifest: PackManifest
  status: PackStatus
  /** 用户是否启用（关掉后它带来的卡 / 音效不参与编辑与导出） */
  enabled: boolean
  cardCount: number
  soundCount: number
  error?: string
}

const BASE = import.meta.env.BASE_URL ?? '/'
/**
 * 包内资源的地址候选：
 *  1. dev 由 `/content/cards|sounds/…` 实时读根目录（中文目录名不参与 URL）；
 *  2. 生产构建会把两个目录同时拷一份到 `dist/content/cards|sounds/`（ASCII 别名），
 *     避免某些静态服务器处理中文路径出错。
 * `loadPack` 会按顺序探测，第一个存在的就用 —— 所以两种情况共用同一份代码。
 */
const CARD_URL = `${BASE}content/cards/`
const SOUND_URL = `${BASE}content/sounds/`
const DISABLED_KEY = 'animation-editor-packs-disabled-v1'

/* ─────────────── 极简订阅式状态：给 useSyncExternalStore 用 ─────────────── */

let version = 0
const listeners = new Set<() => void>()
let cache: PackState[] = []

function emit(): void {
  version += 1
  listeners.forEach((fn) => fn())
}

export function subscribePacks(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPacksVersion(): number {
  return version
}

export function packsSnapshot(): PackState[] {
  return cache
}

function readDisabled(): string[] {
  try {
    const raw = localStorage.getItem(DISABLED_KEY)
    const list = JSON.parse(raw || '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function writeDisabled(ids: string[]): void {
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify(ids))
  } catch {
    /* 隐私模式下写不进就算了，不影响本次会话 */
  }
}

export function setPackEnabled(key: string, enabled: boolean): void {
  const cur = readDisabled()
  const next = enabled ? cur.filter((x) => x !== key) : [...new Set([...cur, key])]
  writeDisabled(next)
  cache = cache.map((p) => (p.key === key ? { ...p, enabled } : p))
  emit()
  void loadPacksIntoRuntime()
}

/** 包内文件的绝对地址：manifest 里的 src 都是相对包目录写的 */
function assetUrl(kind: PackKind, dir: string, file: string): string {
  if (/^(https?:\/\/|blob:|data:|\/)/.test(file)) return file
  return `${kind === 'cards' ? CARD_URL : SOUND_URL}${dir}/${file}`
}

/**
 * 取一个真正存在的资源 URL：`/content/**` 既有 dev 实时路径，也有 dist 里的静态拷贝，
 * 但目录名（中文）可能被某些托管环境改写，所以按序探测第一个 200 的。
 */
async function firstReachable(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
      if (res.ok) return url
    } catch {
      /* 换下一个候选 */
    }
  }
  return null
}

/** 包内文件地址的候选列表（绝对地址 / 中文目录 / ASCII 别名都兜住） */
function assetUrlCandidates(kind: PackKind, dir: string, file: string): string[] {
  const urls = [assetUrl(kind, dir, file)]
  const alias = `${BASE}content/${kind}/${dir}/${file}`
  if (!urls.includes(alias)) urls.push(alias)
  return urls
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

type ContentIndex = {
  updatedAt?: number
  groups?: { kind: PackKind; packs: PackManifest[] }[]
}

/**
 * 取内容清单。
 *
 * dev：`/api/content`（dev server 每次请求实时扫根目录，所以增删文件夹刷新即生效）；
 * dist：打包时落下的静态 `content-index.json`（同样是"拷文件夹进目录即可"）。
 */
async function fetchContentIndex(): Promise<ContentIndex> {
  const fromApi = await fetchJson<ContentIndex>(`${BASE}api/content`)
  if (fromApi) return fromApi
  const fromFile = await fetchJson<ContentIndex>(`${BASE}content-index.json`)
  if (fromFile) return fromFile
  // 两个都没有：可能是纯静态托管 + 没有生成清单，退回打包时注在页面里的兜底数据
  return (window as Window & { __OS_CONTENT_INDEX__?: ContentIndex }).__OS_CONTENT_INDEX__ ?? {}
}

/** 装载一个包：卡包 import cards.js；音效包按 manifest 的描述直接注册 */
async function loadPack(state: PackState): Promise<{ cards: EffectDef[]; sounds: SfxDef[] }> {
  const { manifest } = state
  const dir = manifest.dir ?? manifest.id
  const cards: EffectDef[] = []
  const sounds: SfxDef[] = []

  if (state.kind === 'cards' && manifest.cards) {
    const url = await firstReachable(
      assetUrlCandidates('cards', dir, manifest.cards).map((u) => encodeURI(u)),
    )
    if (!url) throw new Error(`读不到卡的入口文件（${manifest.cards}）`)
    const mod = (await import(/* @vite-ignore */ url)) as { default?: EffectDef[] }
    for (const def of mod.default ?? []) {
      if (!def?.id || !def.component) continue
      // 打上归属标记：停用时能整包卸载；动效库里也能看出「这张卡来自外面的包」
      cards.push({ ...def, plugin: true, packId: state.key })
    }
  }

  if (state.kind === 'sounds') {
    const fallbackGroup = manifest.name ?? manifest.id
    for (const spec of manifest.sounds ?? []) {
      if (!spec?.id || !spec.src) continue
      const src = /^(https?:\/\/|blob:|data:|\/)/.test(spec.src)
        ? spec.src
        : await firstReachable(assetUrlCandidates('sounds', dir, spec.src).map((u) => encodeURI(u)))
      if (!src) continue
      sounds.push(
        fileSfxDef({
          id: spec.id,
          name: spec.name,
          hint: spec.hint ?? spec.name,
          duration: spec.duration ?? 1,
          src,
          level: spec.level,
          group: spec.group ?? fallbackGroup,
          sustain: spec.sustain,
          packId: state.key,
        }),
      )
    }
  }

  return { cards, sounds }
}

/**
 * 扫描 `动效卡库/` 与 `音效库/` 两个根目录，装载所有启用的包。
 *
 * 幂等；装载失败只标记这一个包为 error，不影响别的包，也不阻断主程序。
 */
export async function loadPacksIntoRuntime(): Promise<void> {
  const index = await fetchContentIndex()
  const disabled = readDisabled()

  const seeds: PackState[] = []
  for (const group of index.groups ?? []) {
    for (const manifest of group.packs ?? []) {
      const dir = manifest.dir ?? manifest.id
      const key = `${group.kind}:${dir}`
      seeds.push({
        kind: group.kind,
        key,
        manifest,
        status: 'loading',
        enabled: !disabled.includes(key),
        cardCount: 0,
        soundCount: 0,
      })
    }
  }
  cache = seeds
  emit()

  const next: PackState[] = []
  for (const seed of seeds) {
    if (!seed.enabled) {
      // 停用的包：先卸载它已经注册过的东西，只显示信息，不再装载内容
      unregisterSfxByPack(seed.key)
      next.push({ ...seed, status: 'idle', cardCount: 0, soundCount: 0 })
      continue
    }
    try {
      const { cards, sounds } = await loadPack(seed)
      // 重复装载时先卸载旧的音效（卡的去重由 registerPlugin 负责）
      unregisterSfxByPack(seed.key)
      registerSfx(sounds)
      next.push({ ...seed, status: 'ready', cardCount: cards.length, soundCount: sounds.length })
      pendingCards.set(seed.key, cards)
    } catch (e) {
      unregisterSfxByPack(seed.key)
      next.push({
        ...seed,
        status: 'error',
        cardCount: 0,
        soundCount: 0,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }
  cache = next
  emit()
  notifyPacksReady()
}

/* ─────────────── 与 store 的桥接：卡要注册进全局 effects 里 ─────────────── */

/**
 * 装载过程中攒下的卡 definition，key = `${类型}:${目录名}`。
 *
 * 之所以不在这里直接 dispatch：注册要靠 store 的 dispatch，而 hook 之外的模块拿不到它。
 * 装载完打个通知，挂在 React 树上的 `<PacksBootstrap />` 会把它写进 store。
 */
const pendingCards = new Map<string, EffectDef[]>()

const readyListeners = new Set<() => void>()

function notifyPacksReady(): void {
  readyListeners.forEach((fn) => fn())
}

/**
 * React 侧的装载驱动：启动时装载一次、并监听后续变化把卡写进 store。
 * 放在 App 里挂载一次即可（多个 <PacksBootstrap /> 时只有第一个会触发首次装载）。
 *
 * 坑：React StrictMode 下 effect 会「挂载 → 清理 → 再挂载」。
 * 早期版本把 `bootstrapped` 判断放在监听注册之前，于是第二次挂载直接 return，
 * 而第一次注册的监听已被清理删掉 —— 结果首屏正常、之后停用 / 重扫都推不进 store。
 * 所以监听必须**每次挂载都注册**，去重只用于「要不要再装载一次」。
 */
let bootstrapped = false
export function PacksBootstrap() {
  const { dispatch } = useEditor()
  useEffect(() => {
    const push = () => {
      // 先把「这次不该出现」的卡整体摘掉（被停用 / 装载失败 / 目录被删掉的包），
      // 再把还在的注册一遍 —— registerPlugin 自带 id 去重，重复注册不会翻倍。
      const activeKeys = cache.filter((p) => p.enabled && p.status === 'ready').map((p) => p.key)
      dispatch({ type: 'syncPackPlugins', activeIds: activeKeys })
      for (const key of activeKeys) {
        for (const def of pendingCards.get(key) ?? []) dispatch({ type: 'registerPlugin', def })
      }
    }
    /** 监听注册必须在 bootstrapped 判断之前 —— 理由见上面 StrictMode 那段 */
    readyListeners.add(push)
    if (bootstrapped) {
      push()
    } else {
      bootstrapped = true
      void loadPacksIntoRuntime().then(push)
    }
    return () => {
      readyListeners.delete(push)
    }
  }, [dispatch])
  return null
}

/** 面板上的「重新扫描」：手动增删目录后刷一次（其实直接刷新页面也一样） */
export function rescanPacks(): Promise<void> {
  return loadPacksIntoRuntime()
}

/** 面板汇总：把分组数与总数这类展示信息算好 */
export function packSummary(): {
  total: number
  ready: number
  cardPacks: number
  soundPacks: number
  cards: number
  sounds: number
} {
  const on = cache.filter((p) => p.enabled)
  return {
    total: cache.length,
    ready: cache.filter((p) => p.enabled && p.status === 'ready').length,
    cardPacks: on.filter((p) => p.kind === 'cards').length,
    soundPacks: on.filter((p) => p.kind === 'sounds').length,
    cards: on.reduce((n, p) => n + p.cardCount, 0),
    sounds: on.reduce((n, p) => n + p.soundCount, 0),
  }
}

/** 某个包的状态（null = 没找到） */
export function packStateOf(key: string): PackState | null {
  return cache.find((p) => p.key === key) ?? null
}

/** 内容根目录名（面板提示用） */
export function contentFolderOf(kind: PackKind): string {
  return kind === 'cards' ? '动效卡库' : '音效库'
}
