import { useEffect, useSyncExternalStore } from 'react'
import { useEditor, usePlayhead } from '../store'
import type {
  CardFit,
  EnterKind,
  EntranceMode,
  ImageClip,
  ParamSchema,
  SlotId,
} from '../types'
import { hfPresets } from '../hyperframes/presets'
import { defaultFitFor } from '../hyperframes/modes'
import { QUICK_COLORS } from '../themes'
import { CARD_SIZE_OPTIONS, cardSizeFromScale, cardSizeScale } from '../cardSize'
import { sampleClipVisual, visualToKf } from '../mediaKeyframe'
import { sampleCardVisual, visualToCardKf, measureCardBox, measureCardFrame, measureCardLayout, type CardVisual } from '../cardKeyframe'
import { HOST_LAYOUTS } from '../hostLayouts'
import type { HostLayoutId } from '../hostLayouts'
import {
  DEFAULT_SFX_ID,
  DEFAULT_SFX_VOLUME,
  SFX_DEFAULT_BY_CATEGORY,
  SFX_MUTED,
  autoSfxOffset,
  getSfxVersion,
  playSfx,
  resolveSfx,
  sfxDef,
  sfxOptions,
  subscribeSfx,
  type SfxId,
} from '../sfx'
import {
  alphaOfCssColor,
  alphaToTransparency,
  hexOfCssColor,
  rgbaFromHex,
  transparencyPercent,
  transparencyToAlpha,
} from '../cardOpacity'
import {
  isSubtitle,
  subtitleTextOf,
  subtitleTrack,
  DEFAULT_SUBTITLE_DURATION,
  MIN_SUBTITLE_DURATION,
} from '../subtitleTrack'
import FocalPicker from './FocalPicker'
import Switch from './Switch'
import EffectSelect from './EffectSelect'

const slotOptions: { id: SlotId; name: string }[] = [
  { id: 'left', name: '左侧' },
  { id: 'right', name: '右侧' },
  { id: 'center', name: '居中' },
  { id: 'bottom', name: '底部' },
  { id: 'top', name: '顶部' },
]

const FIT_OPTIONS: { id: CardFit; name: string; hint: string }[] = [
  { id: 'auto', name: '内容自适应', hint: '宽高由卡内容决定，只受最大宽度约束' },
  { id: 'box', name: '自定义', hint: '固定宽高，内容按比例缩放填满，不再与文字比例冲突' },
  { id: 'full', name: '铺满画布', hint: '占满整个安全区' },
  {
    id: 'leftHalf',
    name: '左侧半屏',
    hint: '卡片占内容区左半边（整屏高度），右边留给画面或另一张卡；位置由这一档决定，卡槽与自由定位不再生效',
  },
  {
    id: 'rightHalf',
    name: '右侧半屏',
    hint: '卡片占内容区右半边（整屏高度），左边留给画面或另一张卡；位置由这一档决定，卡槽与自由定位不再生效',
  },
]

/** 固定占位模式：外框由尺寸模式说了算，卡槽与自由定位均不生效 */
const FIT_LOCKS_POSITION: CardFit[] = ['full', 'leftHalf', 'rightHalf']
function fitLocksPosition(fit: CardFit): boolean {
  return FIT_LOCKS_POSITION.includes(fit)
}
function isHalfFit(fit: CardFit): boolean {
  return fit === 'leftHalf' || fit === 'rightHalf'
}

const OPTION_LABELS: Record<string, Record<string, string>> = {
  align: { left: '左对齐', center: '居中', right: '右对齐' },
  trend: { up: '上升', down: '下降' },
  color: {
    'var(--stage-data)': '数据色',
    'var(--stage-primary)': '主色',
    'var(--stage-special)': '点缀色',
    'var(--stage-assist)': '辅助色',
  },
}

const DEFAULT_BOX = { w: 640, h: 360 }

/**
 * 内容区控件的分组顺序：文案 → 滑杆 / 数值 → 下拉 → 开关 → 取色。
 * 只用来排显示顺序，让同类控件挨在一起；参数本身与读写逻辑都不受影响。
 */
const CONTROL_GROUP: Record<string, number> = {
  text: 0,
  range: 1,
  number: 1,
  select: 2,
  boolean: 3,
  color: 4,
}

/** number 带了 min / max 时 renderControl 会渲染成滑杆，与 range 同属「拖动条」 */
function isSliderSchema(s: ParamSchema): boolean {
  return s.type === 'range' || (s.type === 'number' && s.min != null && s.max != null)
}

const ENTER_OPTIONS: { id: EnterKind; name: string; hint: string }[] = [
  { id: 'none', name: '无', hint: '不做额外入场，直接出现在画面上' },
  { id: 'fade', name: '淡入', hint: '原地淡入（默认）' },
  { id: 'left', name: '左进入', hint: '从画面左侧滑入' },
  { id: 'right', name: '右进入', hint: '从画面右侧滑入' },
]

/** 已收归全局字幕样式统一控制的字段：单卡面板里不再出现 */
const SUBTITLE_STYLE_KEYS = new Set(['fontSize', 'align', 'color', 'box', 'bg'])

/**
 * 把滑竿当前值换算成百分比写进 --fill。
 * 轨道渐变（左侧已选段着强调色）靠这个变量定位分界点；
 * 纯 CSS 无法读到 input 的当前值，只能由 JS 同步。
 */
function syncRangeFill(el: HTMLInputElement) {
  const min = Number(el.min || '0')
  const max = Number(el.max || '100')
  const val = Number(el.value)
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0
  el.style.setProperty('--fill', `${pct}%`)
}

export default function ParameterPanel() {
  const { dispatch, selected, effectFor, state, effects } = useEditor()
  // 订阅音效名单：拓展包装/卸后下拉框立刻出现（或消失）那几个音效
  useSyncExternalStore(subscribeSfx, getSfxVersion)
  const currentTime = usePlayhead()

  const canvasW = state.canvasOrientation === 'portrait' ? 1080 : 1920
  const canvasH = state.canvasOrientation === 'portrait' ? 1920 : 1080
  const palette = state.project.palette
  const projectCardOpacity = state.project.cardOpacity
  /** 工程默认尺寸档（小 / 中 / 大）的缩放系数，单卡没调过时跟随它 */
  const projectCardScale = cardSizeScale(state.project.cardSize)

  const def = selected ? effectFor(selected.effectId) : undefined
  const fit: CardFit = selected?.fit ?? (selected ? defaultFitFor(selected.effectId) : 'auto')

  /**
   * 滑竿「已选段」填充。
   * 轨道左侧的进度条要靠渐变实现，而 CSS 拿不到 input 的当前值，
   * 所以把进度百分比写进 --fill（轨道样式读它）。每次渲染同步一次，
   * 拖动时用捕获阶段的 input 委托实时更新，不必给每个滑竿单独接事件。
   */
  useEffect(() => {
    const onInput = (e: Event) => {
      const el = e.target as HTMLInputElement | null
      if (!el || el.type !== 'range' || !el.closest('.os-panel-right')) return
      syncRangeFill(el)
    }
    document.addEventListener('input', onInput, true)
    return () => document.removeEventListener('input', onInput, true)
  }, [])

  useEffect(() => {
    document
      .querySelectorAll<HTMLInputElement>('.os-panel-right input[type="range"]')
      .forEach(syncRangeFill)
  })

  // hooks 必须无条件调用，放在早返回之前

  /** 选中的素材片段（图片 / 视频）：选中它时参数面板只编辑这一份，不再显示动效卡设置 */
  const selectedClip =
    state.project.imageClips.find((c) => c.id === state.selectedImageClipId) ?? null

  /**
   * 素材片段编辑器（图片 / 视频共用）。
   *
   * 「出境画面」= 形状（圆角 / 描边 / 镜像 / 投影），「镜头焦点」= 焦点 + 放大。
   * 关键帧：在播放头处把"此刻解算出来的画面"固化成一个关键帧，相邻帧之间自动补间，
   * 于是位置 / 大小 / 形状 / 焦点都能随时间平滑变化 —— 这就是剪映那套自由组合关键帧做过渡。
   */
  const renderMediaClipEditor = (clip: ImageClip) => {
    const asset = state.project.mediaAssets.find((a) => a.id === clip.assetId)
    const keys = clip.keyframes ?? []
    const localTime = Math.max(0, Math.min(clip.duration, currentTime - clip.start))
    // 静态属性（描边 / 镜像 / 投影不参与补间，始终走这里）
    const patch = (p: Partial<ImageClip>) =>
      dispatch({ type: 'updateImageClip', id: clip.id, patch: p })
    // 关键帧可插值的字段：有关键帧时把改动写进"当前播放头处"的那个关键帧，而不是静态兜底值 ——
    // 否则改了 X/Y/缩放等会被插值覆盖回去，看起来就像"没反应 / 直接切换"。
    const patchVisual = (p: Partial<ImageClip>) => {
      if (keys.length === 0) {
        patch(p)
        return
      }
      const base = sampleClipVisual(clip, localTime)
      dispatch({
        type: 'addMediaKeyframe',
        id: clip.id,
        kf: visualToKf(localTime, {
          x: p.x ?? base.x,
          y: p.y ?? base.y,
          w: p.w ?? base.w,
          h: p.h ?? base.h,
          opacity: p.opacity ?? base.opacity,
          radius: p.radius ?? base.radius,
          focalX: p.focalX ?? base.focalX,
          focalY: p.focalY ?? base.focalY,
          zoom: p.zoom ?? base.zoom,
        }),
      })
    }

    // 出镜布局预设：把画中画位置固化成几档（右下圆 / 左下圆 / 圆角卡 / 半屏 / 底部横条 / 全屏），
    // 点一下就把片段摆到对应位置、拉成对应大小和形状。
    const layoutPresets = HOST_LAYOUTS.filter((l) => l.id !== 'off' && l.id !== 'custom')
    const applyHostLayout = (id: HostLayoutId) => {
      const p = HOST_LAYOUTS.find((l) => l.id === id)
      if (!p) return
      const portrait = state.canvasOrientation === 'portrait'
      const src = portrait && p.portrait ? p.portrait : p
      const x = Math.round(src.frame.x * canvasW)
      const y = Math.round(src.frame.y * canvasH)
      const w = Math.round(src.frame.w * canvasW)
      const h = Math.round(src.frame.h * canvasH)
      const radius =
        p.shape === 'circle' ? Math.round(Math.min(w, h) / 2) : p.shape === 'rounded' ? p.radius : 0
      patchVisual({ x, y, w, h, radius })
    }
    // 当前片段正好落在哪个预设上（用于按钮高亮；对比的是静态属性，和「位置与大小」输入框口径一致）
    const activeLayout =
      layoutPresets.find((p) => {
        const portrait = state.canvasOrientation === 'portrait'
        const src = portrait && p.portrait ? p.portrait : p
        const rx = Math.round(src.frame.x * canvasW)
        const ry = Math.round(src.frame.y * canvasH)
        const rw = Math.round(src.frame.w * canvasW)
        const rh = Math.round(src.frame.h * canvasH)
        return (
          Math.abs(clip.x - rx) < 2 &&
          Math.abs(clip.y - ry) < 2 &&
          Math.abs(clip.w - rw) < 2 &&
          Math.abs(clip.h - rh) < 2
        )
      })?.id ?? null

    return (
      <>
        <div className="os-param-divider">
          素材片段
          <span className="os-divider-count">{asset?.kind === 'video' ? '视频' : '图片'}</span>
        </div>
        {asset && (
          <div className="os-param-note os-param-note-block">
            {asset.name || (asset.kind === 'video' ? '视频素材' : '图片素材')} · 出现在{' '}
            {clip.start.toFixed(1)}~{(clip.start + clip.duration).toFixed(1)}s
            {asset.kind === 'video' && clip.sourceDuration != null && (
              <>
                {' '}
                · 取源视频 {(clip.trimIn ?? 0).toFixed(1)}~
                {((clip.trimIn ?? 0) + clip.duration).toFixed(1)}s
              </>
            )}
          </div>
        )}

        {/* 关键帧按钮已移到时间轴播放条（播放按钮那一排，🔑）：点一下在当前播放头打 / 删关键帧 */}
        <div className="os-param-note os-param-note-block">
          打关键帧：选中片段后，到<b>时间轴播放条</b>点「🔑 关键帧」，再挪动播放头、改变画面（拖动或改下方数值），
          再点一次「🔑 关键帧」—— 两帧之间会自动平滑过渡。
          {keys.length > 0 && ` 本片段已有 ${keys.length} 个关键帧。`}
        </div>

        {/* 关键帧列表：点一下选中（时间轴菱形同步高亮），点 × 或按 Delete 删除 */}
        {keys.length > 0 && (
          <>
            <div className="os-param-divider">
              关键帧
              <span className="os-divider-count">{keys.length} 个</span>
            </div>
            <div className="os-kf-list">
              {keys.map((k) => {
                const kfSel = state.selectedMediaKeyframe
                const isSel =
                  kfSel != null && kfSel.clipId === clip.id && Math.abs(kfSel.t - k.t) < 0.001
                return (
                  <span
                    key={k.t}
                    className={`os-kf-item ${isSel ? 'os-kf-item-selected' : ''}`}
                    title={`片段内 ${k.t.toFixed(2)}s · ${isSel ? '已选中，按 Delete 或点 × 删除' : '点一下选中'}`}
                    onClick={() => dispatch({ type: 'selectMediaKeyframe', clipId: clip.id, t: k.t })}
                  >
                    <span className="os-kf-time">{k.t.toFixed(2)}s</span>
                    <button
                      type="button"
                      className="os-paint-item-x"
                      title="删除这个关键帧"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'removeMediaKeyframe', id: clip.id, t: k.t })
                      }}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          </>
        )}

        {/* 布局：视频片段的画中画位置预设（"出镜设置"回归） */}
        {asset?.kind === 'video' && (
          <>
            <div className="os-param-divider">布局</div>
            <div className="os-layout-presets">
              {layoutPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`os-btn ${activeLayout === p.id ? '' : 'os-btn-ghost'} os-layout-preset-btn`}
                  title={p.hint}
                  onClick={() => applyHostLayout(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 焦点 + 放大 + 形状，连续展示不再细分 */}
        <div className="os-param-row">
          <label className="os-field">
            焦点（人站哪边点哪边）
            <FocalPicker
              x={clip.focalX}
              y={clip.focalY}
              onPick={(focalX, focalY) => patchVisual({ focalX, focalY })}
            />
          </label>
        </div>
        <div className="os-param-row">
          <div className="os-inline-range">
            <span className="os-inline-range-label">画面放大 {clip.zoom.toFixed(2)}×</span>
            <div className="os-range-row">
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={clip.zoom}
                onChange={(e) => patchVisual({ zoom: e.target.valueAsNumber })}
              />
            </div>
          </div>
        </div>

        <div className="os-param-row">
          <div className="os-inline-range">
            <span className="os-inline-range-label">圆角 {clip.radius}px</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={80}
                step={2}
                value={clip.radius}
                onChange={(e) => patchVisual({ radius: e.target.valueAsNumber })}
              />
            </div>
          </div>
        </div>
        <div className="os-param-row">
          <div className="os-inline-range">
            <span className="os-inline-range-label">描边 {clip.borderWidth}px</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={12}
                step={1}
                value={clip.borderWidth}
                onChange={(e) => patch({ borderWidth: e.target.valueAsNumber })}
              />
            </div>
            {/* 取色器：Chromium 的 <input type=color> 只在 picker 关闭时才发 change，期间选色若
                赶上 React 重渲染把 value 写回就会"吞掉"变更，所以同时挂 onChange + onInput，
                保证 store 实时同步到所见即所得。
                value 兜底为合法的 #rrggbb，避免空值导致浏览器报 controlled 警告。 */}
            <input
              type="color"
              className="os-color-swatch"
              value={/^#[0-9a-f]{6}$/i.test(clip.borderColor || '') ? clip.borderColor : '#ffffff'}
              title="描边颜色"
              onChange={(e) => patch({ borderColor: e.target.value })}
              onInput={(e) => patch({ borderColor: (e.target as HTMLInputElement).value })}
            />
          </div>
        </div>
        <div className="os-param-row os-param-row-switches">
          <Switch
            checked={clip.mirror}
            label="左右镜像"
            hint="前置摄像头拍摄才需要"
            onChange={(next) => patch({ mirror: next })}
          />
          <Switch
            checked={clip.shadow}
            label="投影"
            hint="让小窗从背景里浮起来"
            onChange={(next) => patch({ shadow: next })}
          />
        </div>

        {/* 不透明度：放在描边 / 形状下面，和上面的外观设置挨在一起 */}
        <div className="os-param-row">
          <div className="os-inline-range">
            <span className="os-inline-range-label">不透明度 {Math.round(clip.opacity * 100)}%</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={clip.opacity}
                onChange={(e) => patchVisual({ opacity: e.target.valueAsNumber })}
              />
            </div>
          </div>
        </div>

        {/* ===== 入场动画 ===== */}
        <div className="os-param-divider">入场动画</div>
        <div className="os-param-row">
          <label className="os-field">
            入场模式
            <select
              value={clip.entrance ?? 'none'}
              onChange={(e) => patch({ entrance: e.target.value as EntranceMode })}
            >
              <option value="none">无</option>
              <option value="fade">淡显</option>
              <option value="slideLeft">左入（从左侧移入）</option>
              <option value="slideRight">右入（从右侧移入）</option>
              <option value="slideUp">上入（从上方移入）</option>
              <option value="slideDown">下入（从下方移入）</option>
            </select>
          </label>
        </div>
        {(clip.entrance && clip.entrance !== 'none') && (
          <div className="os-param-row">
            <div className="os-inline-range">
              <span className="os-inline-range-label">
                入场时长 {(clip.entranceDur ?? 0.6).toFixed(2)}s
              </span>
              <div className="os-range-row">
                <input
                  type="range"
                  min={0.2}
                  max={2}
                  step={0.1}
                  value={clip.entranceDur ?? 0.6}
                  onChange={(e) => patch({ entranceDur: e.target.valueAsNumber })}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== 位置与大小 ===== */}
        <div className="os-param-divider">位置与大小</div>
        <div className="os-meta-grid os-meta-grid-two">
          <label className="os-field">
            X(px)
            <input
              type="number"
              step={10}
              value={Math.round(clip.x)}
              onChange={(e) => patchVisual({ x: e.target.valueAsNumber })}
            />
          </label>
          <label className="os-field">
            Y(px)
            <input
              type="number"
              step={10}
              value={Math.round(clip.y)}
              onChange={(e) => patchVisual({ y: e.target.valueAsNumber })}
            />
          </label>
          <label className="os-field">
            宽(px)
            <input
              type="number"
              step={10}
              min={40}
              value={Math.round(clip.w)}
              onChange={(e) => patchVisual({ w: Math.max(40, e.target.valueAsNumber) })}
            />
          </label>
          <label className="os-field">
            高(px)
            <input
              type="number"
              step={10}
              min={40}
              value={Math.round(clip.h)}
              onChange={(e) => patchVisual({ h: Math.max(40, e.target.valueAsNumber) })}
            />
          </label>
        </div>
        <div className="os-param-row os-param-row-btns">
          <button
            type="button"
            className="os-btn os-btn-ghost"
            onClick={() => dispatch({ type: 'removeImageClip', id: clip.id })}
            title="把这段素材从画布和时间轴上删掉"
          >
            删除此片段
          </button>
        </div>
      </>
    )
  }

  // 选中素材片段 → 只编辑这一份（要求 3：选中视频时不要动效卡设置）
  if (selectedClip) {
    return (
      <aside className="os-panel os-panel-right">
        <div className="os-panel-header">参数面板</div>
        <div className="os-panel-body">{renderMediaClipEditor(selectedClip)}</div>
      </aside>
    )
  }

  // 没选中任何东西 → 空提示
  if (!selected) {
    return (
      <aside className="os-panel os-panel-right">
        <div className="os-panel-header">参数面板</div>
        <div className="os-panel-body os-empty">在时间轴选择实例，或从左上动效库添加</div>
      </aside>
    )
  }

  const selectedIndex = state.project.instances.findIndex((i) => i.id === selected.id) + 1
  const enterKind: EnterKind = selected.enter ?? 'fade'
  const enterSpeed = Number(selected.enterSpeed ?? 1)

  // ── 该卡音效 ──
  // sfxId 为 undefined = 跟随工程默认；显式 'none' = 这张卡就是不响
  const sfxOn = selected.sfxOn !== false
  const sfxFollowDefault = selected.sfxId == null
  const sfxVolume = Number(selected.sfxVolume ?? 1)
  // 没手动设过偏移时，音效会自动对齐这张卡的动画起音（数字卡不会还没涨数字就先响）
  const autoOffset = autoSfxOffset(selected.effectId, def?.category, selected.duration)
  const projectSfxOff = state.project.sfxEnabled === false
  const subtitleNoSfx = isSubtitle(selected) && sfxFollowDefault
  // 试听用的声音：卡上指定了就用卡上的，否则用工程默认（即便卡被静音也要能试听）
  // 分类默认（如「数据」类 → 数字滚动）优先于工程默认，因为它更贴这张卡
  const sfxCategoryDefault = def?.category ? SFX_DEFAULT_BY_CATEGORY[def.category] : undefined
  const sfxEffectiveId: SfxId =
    selected.sfxId && selected.sfxId !== 'none'
      ? selected.sfxId
      : (sfxCategoryDefault ?? state.project.sfxDefaultId ?? DEFAULT_SFX_ID)
  const auditionId: SfxId = sfxEffectiveId
  const auditionGain = sfxVolume * (state.project.sfxVolume ?? DEFAULT_SFX_VOLUME)
  // 音效时长滑竿：自动模式下旋钮停在音效自身的默认长度上（一眼看出这条音效多长），
  // 手动拖动后就是用户定的时长，「自动」按钮一键回到默认行为
  const auditionDef = sfxDef(auditionId)
  const sfxDurAuto = selected.sfxDuration == null
  const sfxDurDefault = auditionDef?.duration ?? 0
  // 自动模式的实际生效时长：长卡 = 剩余卡片时长（铺到卡尾），否则音效默认一声
  const sfxAutoRemain = Math.max(0, selected.duration - autoOffset - 0.12)
  const sfxAutoSustains = sfxAutoRemain > sfxDurDefault + 0.4
  const sfxDurValue = sfxDurAuto ? (sfxAutoSustains ? sfxAutoRemain : sfxDurDefault) : (selected.sfxDuration ?? 0)
  // 试听带上时长：onClick 里现场解算（长卡自动延续 / 手动秒数），见下方 🔊 按钮
  const sfxChoices: { id: string; name: string; hint: string; group?: string }[] = [
    {
      id: '',
      name: sfxCategoryDefault ? `跟随默认（${sfxOptions().find((o) => o.id === sfxEffectiveId)?.name ?? '无'}）` : '跟随工程默认',
      hint: sfxCategoryDefault
        ? `「${def?.category}」类默认用这个，也可以在顶栏设置里改工程默认`
        : '和设置里的默认音效保持一致',
    },
    ...sfxOptions().map((o) => ({ id: o.id as string, name: o.name, hint: o.hint, group: o.group })),
  ]
  // 采样音效单独成组（新版主打的科技感音效）排最前，「跟随默认」永远第一，合成音作后备
  const SAMPLED_GROUP = '科技感采样'
  const sfxSampledChoices = sfxChoices.filter((o) => o.group === SAMPLED_GROUP)
  const sfxFollowChoice = sfxChoices[0]
  const sfxPlainChoices = sfxChoices.slice(1).filter((o) => !o.group)
  /**
   * 拓展包带来的音效自带 group（一般是包名）：必须按 group 各自渲染成 optgroup，
   * 否则它们既不属于「科技感采样」也没有空 group，会整组在下拉框里消失 —— 用户买了却选不到。
   */
  const sfxExtraGroups = (() => {
    const map = new Map<string, { id: string; name: string; hint: string }[]>()
    for (const o of sfxChoices.slice(1)) {
      if (!o.group || o.group === SAMPLED_GROUP) continue
      if (!map.has(o.group)) map.set(o.group, [])
      map.get(o.group)!.push(o)
    }
    return [...map.entries()]
  })()
  /**
   * 「文字比例」滑杆的实际生效值：单卡设置优先，没设过就跟随设置里的通用尺寸档。
   * 铺满画布的卡不吃通用档（它按内容区铺满，缩放只会露空隙），所以退回 1。
   */
  const effectiveScale =
    fit === 'full' ? (selected.contentScale ?? 1) : (selected.contentScale ?? projectCardScale)
  const followsProjectSize = selected.contentScale == null && fit !== 'full'
  /**
   * 本卡尺寸档：contentScale 正落在某一档上就是那一档；
   * 滑杆微调到 0.93 这类中间值时返回 null（自定义），三个档位按钮都不高亮。
   */
  const ownSize = cardSizeFromScale(selected.contentScale)

  /** 量出卡片当前在画布上的实际像素尺寸（用于"按内容适配"） */
  const measureCard = () => {
    // 与关键帧打帧共用同一套量法（布局尺寸，不含关键帧缩放变换）
    return measureCardBox(selected.id, canvasW, canvasH) ?? { ...DEFAULT_BOX }
  }

  const setFit = (next: CardFit) => {
    /**
     * 把目标布局档解算出的"卡片区"（位置 + 尺寸）记进播放头处那一帧。
     *
     * 关键帧存在时，播放头处的画面被采样钳到既有帧（只有一帧时任何时刻都
     * 返回那一帧），关键帧外框覆盖着布局 —— 直接量 DOM 只能量到上一帧的样子，
     * "第二帧设了自适应却和第一帧一模一样"就是这么来的。
     * 所以等 React 提交后的下一帧：布局可解析的档（铺满 / 自定义尺寸）直接读
     * 渲染层发布的布局解；内容驱动的档（自适应 / 半屏）用探针短暂摘掉
     * 关键帧覆盖、量纯布局再恢复。
     */
    const rememberSize = () => {
      if (cardKeys.length === 0) return
      requestAnimationFrame(() => {
        const anim = sampleCardVisual(selected, cardLocalT)
        const raw = document
          .querySelector(`[data-paint-id="${selected.id}"]`)
          ?.getAttribute('data-layout-pos')
        if (!raw) return
        let fit = next
        let pos: Record<string, string | number | undefined> = {}
        let body: Record<string, string | number | undefined> = {}
        try {
          const parsed = JSON.parse(raw)
          if (typeof parsed.fit === 'string') fit = parsed.fit
          pos = parsed.pos ?? {}
          body = parsed.body ?? {}
        } catch {
          return
        }
        const box = measureCardLayout(selected.id, anim, canvasW, canvasH, fit, pos, body)
        if (!box) return
        // 整卡有 ≥2 个关键帧且外框完全一致 → 它们本来是同一种布局，换档 = 一起重排；
        // 只有一个关键帧、或各帧布局刻意不同（第一帧铺满、第二帧自适应）→ 只动播放头这一帧
        const posed = cardKeys.filter(
          (k) => k.w != null && k.h != null && k.x != null && k.y != null,
        )
        const sameBox =
          posed.length >= 2 &&
          posed.every(
            (k) =>
              Math.abs(k.w! - posed[0].w!) <= 2 &&
              Math.abs(k.h! - posed[0].h!) <= 2 &&
              Math.abs(k.x! - posed[0].x!) <= 2 &&
              Math.abs(k.y! - posed[0].y!) <= 2,
          )
        if (sameBox) {
          for (const k of posed) {
            dispatch({
              type: 'addCardKeyframe',
              id: selected.id,
              kf: { ...k, x: box.x, y: box.y, w: box.w, h: box.h },
            })
          }
        } else {
          patchCardAnim({ x: box.x, y: box.y, w: box.w, h: box.h })
        }
      })
    }
    // 档位没变也可以在当前时刻固化一帧：铺满 → 铺满 = 在这个时间点记住铺满的样子，
    // 用户可以把同一档"钉"在多个时间点上做补间锚点
    if (next === fit) {
      if (cardKeys.length > 0) rememberSize()
      return
    }
    // 注：切尺寸时卡内内容偏移归零由 store 的 updateMeta 统一兜底（fit 变化即重置），这里不用重复写
    if (next === 'full') {
      dispatch({
        type: 'updateMeta',
        id: selected.id,
        patch: {
          fit: 'full',
          free: false,
          autoFit: false,
          w: canvasW,
          h: canvasH,
          baseW: canvasW,
          baseH: canvasH,
        },
      })
      rememberSize()
      return
    }
    if (next === 'leftHalf' || next === 'rightHalf') {
      // 半屏：占内容区一半宽、整屏高；位置由模式决定，所以关掉自由定位与卡槽
      const halfW = Math.round(canvasW / 2)
      dispatch({
        type: 'updateMeta',
        id: selected.id,
        patch: {
          fit: next,
          free: false,
          autoFit: false,
          w: halfW,
          h: canvasH,
          baseW: halfW,
          baseH: canvasH,
        },
      })
      rememberSize()
      return
    }
    if (next === 'box') {
      const size = measureCard()
      dispatch({
        type: 'updateMeta',
        id: selected.id,
        patch: {
          fit: 'box',
          w: size.w,
          h: size.h,
          baseW: size.w,
          baseH: size.h,
          autoFit: false,
          ...(selected.free ? {} : { free: true, x: selected.x ?? 120, y: selected.y ?? 120 }),
        },
      })
      rememberSize()
      return
    }
    dispatch({ type: 'updateMeta', id: selected.id, patch: { fit: 'auto', w: undefined, h: undefined, autoFit: true } })
    rememberSize()
  }

  /**
   * 一键把卡内文字挪到画面正中间。
   * 卡片内部常有 min-height 留白，光靠外框居中文字仍会偏上；
   * 这里直接量出「文字块中心」相对「外框中心」的偏移，反向补偿进 contentOffset。
   */
  const autoCenterContent = () => {
    const host = document.querySelector(
      `.os-inst[data-paint-id="${selected.id}"]`,
    ) as HTMLElement | null
    if (!host) return
    const hr = host.getBoundingClientRect()
    if (hr.width < 2) return
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_ELEMENT)
    let l = Infinity
    let t = Infinity
    let r = -Infinity
    let b = -Infinity
    let n = 0
    while (walker.nextNode()) {
      const e = walker.currentNode as HTMLElement
      if (e.children.length !== 0) continue
      if (!(e.textContent || '').trim()) continue
      // 跳过编辑器自己的角标与手柄，别把它们当成正文
      if (e.closest('.os-free-tag, .os-free-resize, .os-content-move')) continue
      const q = e.getBoundingClientRect()
      if (q.width < 2 || q.height < 2) continue
      l = Math.min(l, q.left)
      t = Math.min(t, q.top)
      r = Math.max(r, q.right)
      b = Math.max(b, q.bottom)
      n += 1
    }
    if (!n) return
    const dx = (l + r) / 2 - (hr.left + hr.width / 2)
    const dy = (t + b) / 2 - (hr.top + hr.height / 2)
    // 屏幕像素 → 画布像素（画布本身被 scale 过，用画布实测宽度换算）
    const canvasEl = host.closest('.os-canvas') as HTMLElement | null
    const cr = canvasEl?.getBoundingClientRect()
    const k = cr && cr.width > 0 ? canvasW / cr.width : 1
    dispatch({
      type: 'updateMeta',
      id: selected.id,
      patch: {
        contentOffsetX: Math.round((selected.contentOffsetX ?? 0) - dx * k),
        contentOffsetY: Math.round((selected.contentOffsetY ?? 0) - dy * k),
      },
    })
  }

  const patchBox = (key: 'w' | 'h', value: number) => {
    // 有关键帧时写进当前帧的尺寸。宽高滑竿给的就是目标尺寸，直接用，
    // 不必再换算成缩放（换算只适用于"档位"这种比例式的输入）。
    if (cardKeys.length > 0) {
      patchCardAnim(key === 'w' ? { w: value } : { h: value })
      return
    }
    const size = measureCard()
    dispatch({
      type: 'updateMeta',
      id: selected.id,
      patch: {
        fit: 'box',
        autoFit: false,
        free: selected.free ?? true,
        x: selected.x ?? 120,
        y: selected.y ?? 120,
        [key]: value,
        ...(selected.w == null || selected.h == null
          ? { baseW: size.w, baseH: size.h, w: selected.w ?? size.w, h: selected.h ?? size.h }
          : {}),
      },
    })
  }

  const renderControl = (schema: ParamSchema) => {
    const value = selected.params[schema.key] ?? schema.default
    switch (schema.type) {
      case 'text':
        return (
          <textarea
            value={String(value)}
            rows={schema.key === 'lines' || schema.key === 'srt' ? 6 : schema.key === 'text' ? 3 : 1}
            onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.value })}
          />
        )
      case 'number':
        if (schema.min != null && schema.max != null) {
          return (
            <div className="os-range-row">
              <input
                type="range"
                min={schema.min}
                max={schema.max}
                step={schema.step ?? 1}
                value={Number(value)}
                onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.valueAsNumber })}
              />
              <span className="os-range-value">
                {Number(value).toFixed(Number.isInteger(schema.step ?? 1) ? 0 : 1)}
                {Number(value) === schema.default ? '（默认）' : ''}
              </span>
            </div>
          )
        }
        return (
          <input
            type="number"
            min={schema.min}
            max={schema.max}
            step={schema.step}
            value={Number(value)}
            onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.valueAsNumber })}
          />
        )
      case 'range':
        return (
          <div className="os-range-row">
            <input
              type="range"
              min={schema.min}
              max={schema.max}
              step={schema.step}
              value={Number(value)}
              onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.valueAsNumber })}
            />
            <span className="os-range-value">
              {Number(value).toFixed(1)}
              {Number(value) === schema.default ? '（默认）' : ''}
            </span>
          </div>
        )
      case 'color': {
        // accent 空字符串 = 跟随工程主题色；非空则该卡单独覆盖
        const isAccent = schema.key === 'accent'
        const raw = String(value ?? '')
        const followTheme = isAccent && raw === ''
        const displayValue = raw === '' ? palette.accent : raw
        return (
          <div className="os-color-wrap">
            <input
              type="color"
              value={displayValue}
              onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.value })}
            />
            {isAccent && (
              // 跟「背景透明度」按钮同样的 toggle 模式：永远显示，
              // 跟随主题 → 点一下变成「本卡单独设置」并写入当前工程主题色；
              // 已单独设置 → 点一下恢复跟随。
              // 这样不会卡死在「跟随主题」态、点了没反应。
              <button
                type="button"
                className={`os-btn ${followTheme ? 'os-btn-accent' : 'os-btn-ghost'}`}
                onClick={() => {
                  if (followTheme) {
                    dispatch({
                      type: 'updateParam',
                      id: selected.id,
                      key: 'accent',
                      value: palette.accent,
                    })
                  } else {
                    dispatch({ type: 'updateParam', id: selected.id, key: 'accent', value: '' })
                  }
                }}
                title={followTheme ? '把这张卡从工程主题改成单独设置' : '恢复为跟随工程主题色'}
              >
                {followTheme ? '本卡单独设置' : '恢复跟随'}
              </button>
            )}
          </div>
        )
      }
      case 'boolean':
        return (
          <Switch
            checked={Boolean(value)}
            onChange={(next) =>
              dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: next })
            }
          />
        )
      case 'select':
        return (
          <select value={String(value)} onChange={(e) => dispatch({ type: 'updateParam', id: selected.id, key: schema.key, value: e.target.value })}>
            {schema.options.map((opt) => (
              <option key={opt} value={opt}>{OPTION_LABELS[schema.key]?.[opt] ?? opt}</option>
            ))}
          </select>
        )
      default:
        return null
    }
  }

  const accentSchema = def?.schema.find((s) => s.key === 'accent')
  // ===== 卡属性关键帧（动画层）=====
  // 与素材片段是同一套语义：在播放头处固化外观，相邻帧补间。
  // 差别只在可动的东西 —— 卡片动的是「相对布局的增量」，所以改 slot / 尺寸档不会毁掉已有动画。
  const cardKeys = selected.keyframes ?? []
  const cardLocalT = Math.max(0, Math.min(selected.duration, currentTime - selected.start))
  const cardAnimNow = sampleCardVisual(selected, cardLocalT)
  /**
   * 写动画属性：有关键帧时写进"播放头处的那一帧"。
   * 否则改了会被插值立刻覆盖回去，看起来就像"没反应"。
   *
   * 播放头贴着某个关键帧（点菱形跳转是精确的；手拖播放头常有半帧内的偏差）时，
   * 只把改的属性合进**那一帧自己存的值** —— 其余属性保持那一帧原来的样子。
   * 不能把播放头处插值出来的"中间态"整份烤进帧里，否则两帧各自的设置
   * 会通过插值互相渗透，表现为"改这帧的尺寸，那帧也跟着变"。
   */
  const patchCardAnim = (p: Partial<CardVisual>) => {
    if (cardKeys.length === 0) {
      const merged = { ...cardAnimNow, ...p }
      dispatch({
        type: 'updateMeta',
        id: selected.id,
        patch: {
          offsetX: merged.offsetX,
          offsetY: merged.offsetY,
          animScale: merged.scale,
          animOpacity: merged.opacity,
          // 静态兜底也要接住宽高：不然没打关键帧时改「宽 / 高」输入框毫无反应
          ...(merged.w != null ? { w: merged.w } : {}),
          ...(merged.h != null ? { h: merged.h } : {}),
        },
      })
      return
    }
    // 半帧容差（25fps 半帧 ≈ 0.02s）：贴着已有帧的编辑一律视为"改那一帧"
    const hit = cardKeys.find((k) => Math.abs(k.t - cardLocalT) <= 0.02)
    if (hit) {
      dispatch({ type: 'addCardKeyframe', id: selected.id, kf: { ...hit, ...p } })
      return
    }
    const merged = { ...cardAnimNow, ...p }
    // 姿态缺失（旧关键帧 / 还没打过帧）时按当前画面量一次补齐位置与尺寸；
    // 姿态齐全就直接在采样值上叠加改动 —— 重量 DOM 既浪费还会盖掉采样值
    const box =
      cardAnimNow.w == null || cardAnimNow.h == null || cardAnimNow.x == null || cardAnimNow.y == null
        ? measureCardFrame(selected.id, cardAnimNow, canvasW, canvasH)
        : null
    dispatch({
      type: 'addCardKeyframe',
      id: selected.id,
      kf: visualToCardKf(cardLocalT, box ? { ...cardAnimNow, ...box, ...p } : merged),
    })
  }
  /**
   * 尺寸档（跟随 / 小 / 中 / 大）：有关键帧时必须换算成"当前帧的缩放"来写。
   *
   * contentScale 是**布局属性**，一改就对整张卡的所有时间点生效 ——
   * 用户在第二个关键帧调尺寸，却发现第一个关键帧也跟着变大，就是这个原因。
   * 所以有关键帧时按「目标档 ÷ 布局基准」直接**赋值**当前帧的 scale：
   * 之前写成 `当前帧scale × (目标/基准)` 的累乘式是错的 —— 基准从不更新，
   * 连点同一档会越点越大，点「中」/「跟随」也常常回不去。
   */
  const applySizePreset = (next: number | undefined) => {
    if (cardKeys.length > 0) {
      const basis = selected.contentScale ?? (fit === 'full' ? 1 : projectCardScale)
      const target = next ?? 1
      const scaled = Math.max(0.2, Math.min(3, target / (basis > 0 ? basis : 1)))
      patchCardAnim({ scale: Math.round(scaled * 100) / 100 })
      return
    }
    dispatch({ type: 'updateMeta', id: selected.id, patch: { contentScale: next } })
  }
  // 拆分后的字幕卡自带 params.text，旧的「整轨 SRT」输入框就不再显示了（留着只会误导）
  const usesOwnText = isSubtitle(selected) && subtitleTextOf(selected).length > 0
  // 字幕的字号 / 颜色 / 背景已经收归「字幕统一样式」统一控制，
  // 这里必须把同名控件摘掉 —— 留着的话用户改了会被全局样式覆盖，看起来像失灵。
  const contentSchema =
    def?.schema.filter(
      (s) =>
        s.key !== 'accent' &&
        !(isSubtitle(selected) && (s.key === 'srt' || SUBTITLE_STYLE_KEYS.has(s.key))),
    ) ?? []
  /**
   * 内容区按控件类型归拢后再渲染：文案 → 滑杆 → 数值框 → 下拉 → 开关 → 取色。
   *
   * schema 的顺序是动效作者写卡时定的，滑杆旁边夹一个输入框、下面又来一个开关很常见，
   * 直接按原序渲染面板会显得东一块西一块。这里只调整显示顺序，不动参数本身，
   * 也不影响「重置本卡」等读写逻辑。同组内保持 schema 原序（Array.sort 是稳定的），
   * 免得同一张卡的相邻参数顺序来回跳。
   */
  const contentOrdered = [...contentSchema].sort((a, b) => {
    const g = (CONTROL_GROUP[a.type] ?? 9) - (CONTROL_GROUP[b.type] ?? 9)
    if (g !== 0) return g
    // 滑杆与数值框同属一类：滑杆排前面，视觉上连续不跳
    return Number(isSliderSchema(b)) - Number(isSliderSchema(a))
  })
  const cardAccent = String(selected.params.accent ?? '').trim()

  // ===== 字幕轨：一句一张卡，这里做上下切换 / 插入 / 删除 / 改时间 =====
  const subtitleRail = isSubtitle(selected) ? subtitleTrack(state.project.instances) : []
  const subtitleAt = subtitleRail.findIndex((i) => i.id === selected.id)
  const subtitlePrev = subtitleAt > 0 ? subtitleRail[subtitleAt - 1] : null
  const subtitleNext = subtitleAt >= 0 && subtitleAt < subtitleRail.length - 1 ? subtitleRail[subtitleAt + 1] : null

  return (
    <aside className="os-panel os-panel-right">
      <div className="os-panel-header">参数面板</div>
      <div className="os-panel-body">
        <div className="os-instance-effect">卡片 {selectedIndex} | {selected.name}</div>
        <div className="os-param-row">
          <label className="os-inline-label">更换特效</label>
          <EffectSelect
            effects={effects}
            value={selected.effectId}
            onChange={(effectId) => dispatch({ type: 'replaceInstanceEffect', id: selected.id, effectId })}
          />
        </div>
        <div className="os-param-row os-param-row-btns">
          <button
            type="button"
            className="os-btn os-btn-ghost os-btn-reset"
            onClick={() => dispatch({ type: 'resetInstance', id: selected.id })}
            title="把这张卡恢复成刚从库里拖出来的样子：内容参数、尺寸模式、自由定位、本卡背景透明度全部回到默认；保留它在时间轴上的起点、时长、位置与段落分组"
          >
            ↺ 重置本卡
          </button>
          <span className="os-param-note">只重置参数与外观，不动时间轴位置</span>
        </div>

        {/* ===== 尺寸：三档统一，宽高与文字比例不再互相打架 ===== */}
        <div className="os-param-row os-param-row-inline" data-size="fit">
          <span className="os-inline-range-label">尺寸</span>
          <div className="os-seg os-seg-fit">
            {FIT_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                title={o.hint}
                className={`os-seg-btn ${fit === o.id ? 'active' : ''}`}
                onClick={() => setFit(o.id)}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
        {/* 分段选择区：尺寸模式与尺寸档位都是「一排按钮选一个」，挨在一起 */}
        <div className="os-param-row os-param-row-inline" data-size="preset">
          <span className="os-inline-range-label">本卡尺寸</span>
          <div className="os-seg os-seg-cardsize">
            <button
              key="follow"
              type="button"
              className={`os-seg-btn ${selected.contentScale == null ? 'active' : ''}`}
              onClick={() => applySizePreset(undefined)}
              title="跟随「设置 → 动效卡通用默认设置」里的尺寸档，改全局时这张卡一起变（有关键帧时该按比例记进当前帧）"
            >
              跟随
            </button>
            {CARD_SIZE_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.hint}
                className={`os-seg-btn ${ownSize === s.id ? 'active' : ''}`}
                onClick={() => applySizePreset(cardSizeScale(s.id))}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        {/* 状态提示单独成行：跟在按钮行下面，宽了自己换行，绝不挤压按钮 */}
        {followsProjectSize ? (
          <div className="os-param-note-line">跟随设置里的通用尺寸</div>
        ) : ownSize === null ? (
          <div className="os-param-note-line">自定义（滑杆微调过，不命中任何档位）</div>
        ) : null}
        {fit === 'full' && (
          <div className="os-param-note os-param-note-block">
            铺满画布时外框始终占满内容区，尺寸档不生效；下面的缩放只改变卡内内容的比例尺。
          </div>
        )}
        {isHalfFit(fit) && (
          <div className="os-param-note os-param-note-block">
            {fit === 'leftHalf' ? '左侧' : '右侧'}半屏：外框固定在内容区的
            {fit === 'leftHalf' ? '左' : '右'}半边、占满整屏高度，卡内内容自动垂直居中。
          </div>
        )}
        {/* 卡内内容位置：所有动效卡通用。画布上直接拖 ✥ 手柄也能改 */}
        <div className="os-param-row">
          <span className="os-param-label">内容位置</span>
          <label className="os-field">
            水平
            <input
              type="number"
              step={10}
              value={Math.round(selected.contentOffsetX ?? 0)}
              onChange={(e) =>
                dispatch({
                  type: 'updateMeta',
                  id: selected.id,
                  patch: { contentOffsetX: Number(e.target.value) || 0 },
                })
              }
            />
          </label>
          <label className="os-field">
            垂直
            <input
              type="number"
              step={10}
              value={Math.round(selected.contentOffsetY ?? 0)}
              onChange={(e) =>
                dispatch({
                  type: 'updateMeta',
                  id: selected.id,
                  patch: { contentOffsetY: Number(e.target.value) || 0 },
                })
              }
            />
          </label>
          <button
            type="button"
            className="os-btn os-btn-ghost"
            onClick={() =>
              dispatch({
                type: 'updateMeta',
                id: selected.id,
                patch: { contentOffsetX: 0, contentOffsetY: 0 },
              })
            }
            title="把卡内内容移回默认位置"
          >
            归零
          </button>
          <button
            type="button"
            className="os-btn os-btn-ghost"
            onClick={autoCenterContent}
            title="自动把卡内文字调到画面正中间"
          >
            居中
          </button>
        </div>
        <div className="os-param-note-line">
          平移卡内文字（外框不动）；也可以直接拖动画布上的 ✥ 手柄，或点「居中」一键对齐
        </div>
        {/* 滑竿区：宽高与整体缩放都是拖动条，挨在一起 */}
        {fit === 'box' && (
          <div className="os-meta-grid os-meta-grid-two">
            <label className="os-field">
              宽 {Math.round(selected.w ?? DEFAULT_BOX.w)}
              <input
                type="range"
                min={160}
                max={canvasW}
                step={10}
                value={Math.round(selected.w ?? DEFAULT_BOX.w)}
                onChange={(e) => patchBox('w', e.target.valueAsNumber)}
              />
            </label>
            <label className="os-field">
              高 {Math.round(selected.h ?? DEFAULT_BOX.h)}
              <input
                type="range"
                min={80}
                max={canvasH}
                step={10}
                value={Math.round(selected.h ?? DEFAULT_BOX.h)}
                onChange={(e) => patchBox('h', e.target.valueAsNumber)}
              />
            </label>
          </div>
        )}
        <div className="os-param-row" data-size="scale">
          <div className="os-inline-range" title="整卡内容（文字 + 图形）一起缩放，与上面的档位是同一个值：档位给快捷值，这里做微调">
            <span className="os-inline-range-label">整体缩放</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={effectiveScale}
                onChange={(e) => applySizePreset(e.target.valueAsNumber)}
              />
              <span className="os-range-value">{(effectiveScale * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* ===== 入场：整张卡怎么出现（卡片内部原有的动画不受影响） ===== */}
        {/* ===== 动画：卡属性关键帧（停留期继续移动 / 缩放 / 淡出）===== */}
        <div className="os-param-divider">
          动画
          {cardKeys.length > 0 && <span className="os-divider-count">{cardKeys.length} 帧</span>}
        </div>
        <div className="os-param-note os-param-note-block">
          让卡片在停留期间继续动：选中本卡 → 到<b>时间轴播放条</b>点「🔑 关键帧」，
          再挪播放头、改下面的数值 → 两帧之间自动补间。
          {cardKeys.length === 0 && ' 不打关键帧时，下面改的是静态值（全程不动）。'}
        </div>
        <div className="os-param-row">
          <label className="os-field">
            位移X
            <input
              type="number"
              step={10}
              value={Math.round(cardAnimNow.offsetX)}
              onChange={(e) => patchCardAnim({ offsetX: e.target.valueAsNumber || 0 })}
            />
          </label>
          <label className="os-field">
            位移Y
            <input
              type="number"
              step={10}
              value={Math.round(cardAnimNow.offsetY)}
              onChange={(e) => patchCardAnim({ offsetY: e.target.valueAsNumber || 0 })}
            />
          </label>
        </div>
        {/* 尺寸：直接给外框宽高（画布像素）。
            布局档（fit）是枚举、点一次就整卡生效；**这里才是"只改这一帧尺寸"的地方**。
            留空 = 该帧跟随布局尺寸。 */}
        <div className="os-param-row">
          <label className="os-field">
            宽
            <input
              type="number"
              step={10}
              min={40}
              value={cardAnimNow.w == null ? '' : Math.round(cardAnimNow.w)}
              placeholder="跟随布局"
              onChange={(e) => patchCardAnim({ w: Math.max(40, e.target.valueAsNumber || 40) })}
            />
          </label>
          <label className="os-field">
            高
            <input
              type="number"
              step={10}
              min={40}
              value={cardAnimNow.h == null ? '' : Math.round(cardAnimNow.h)}
              placeholder="跟随布局"
              onChange={(e) => patchCardAnim({ h: Math.max(40, e.target.valueAsNumber || 40) })}
            />
          </label>
        </div>
        <div className="os-param-row os-param-row-inline">
          <div className="os-inline-range" title="整卡缩放（背景 + 文字一起），以卡中心为原点">
            <span className="os-inline-range-label">缩放</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0.2}
                max={3}
                step={0.05}
                value={cardAnimNow.scale}
                onChange={(e) => patchCardAnim({ scale: e.target.valueAsNumber })}
              />
              <span className="os-range-value">{Math.round(cardAnimNow.scale * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="os-param-row os-param-row-inline">
          <div className="os-inline-range" title="整卡不透明度，配合关键帧做淡入淡出">
            <span className="os-inline-range-label">透明</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={cardAnimNow.opacity}
                onChange={(e) => patchCardAnim({ opacity: e.target.valueAsNumber })}
              />
              <span className="os-range-value">{Math.round(cardAnimNow.opacity * 100)}%</span>
            </div>
          </div>
        </div>
        {cardKeys.length > 0 && (
          <>
            <div className="os-param-divider">
              关键帧
              <span className="os-divider-count">{cardKeys.length} 个</span>
            </div>
            <div className="os-kf-list">
              {cardKeys.map((k) => {
                const kfSel = state.selectedCardKeyframe
                const isSel =
                  kfSel != null && kfSel.cardId === selected.id && Math.abs(kfSel.t - k.t) < 0.001
                return (
                  <span
                    key={k.t}
                    className={`os-kf-item ${isSel ? 'os-kf-item-selected' : ''}`}
                    title={`卡内 ${k.t.toFixed(2)}s · ${isSel ? '已选中，按 Delete 或点 × 删除' : '点一下选中'}`}
                    onClick={() => {
                      dispatch({ type: 'selectCardKeyframe', cardId: selected.id, t: k.t })
                      // 播放头同步跳到这一帧（与时间轴菱形一致）：
                      // 选中即可看到它此刻的画面，下面的数值改的也正是这一帧
                      dispatch({ type: 'seek', time: selected.start + k.t })
                    }}
                  >
                    <span className="os-kf-time">{k.t.toFixed(2)}s</span>
                    <button
                      type="button"
                      className="os-paint-item-x"
                      title="删除这个关键帧"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'removeCardKeyframe', id: selected.id, t: k.t })
                      }}
                    >
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
            <div className="os-param-row">
              <button
                className="os-btn os-btn-ghost"
                type="button"
                onClick={() => dispatch({ type: 'clearCardKeyframes', id: selected.id })}
              >
                清空全部关键帧
              </button>
            </div>
          </>
        )}

        <div className="os-param-divider">入场</div>
        <div className="os-param-row os-param-row-inline" data-enter="kind">
          <span className="os-inline-range-label">方式</span>
          <div className="os-seg os-seg-enter">
            {ENTER_OPTIONS.map(({ id, name, hint }) => (
              <button
                key={id}
                type="button"
                title={hint}
                className={`os-seg-btn ${enterKind === id ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'updateMeta', id: selected.id, patch: { enter: id } })}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        {enterKind !== 'none' && (
          <div className="os-param-row" data-enter="speed">
            <div className="os-inline-range">
              <span className="os-inline-range-label">速度</span>
              <div className="os-range-row">
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={enterSpeed}
                  onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { enterSpeed: e.target.valueAsNumber } })}
                />
                <span className="os-range-value">{enterSpeed.toFixed(1)}×</span>
              </div>
            </div>
          </div>
        )}
        <div className="os-param-note os-param-note-block">
          入场时长随速度变化：1× 约 0.5 秒走完。拖动播放头可以看到效果，点播放看完整动画。
        </div>

        {/* ===== 音效：这张卡出现时配什么声音 ===== */}
        <div className="os-param-divider">
          音效
          <span className="os-divider-count">
            {projectSfxOff ? '总开关已关' : sfxOn ? '开' : '本卡静音'}
          </span>
        </div>
        <div className="os-param-row os-param-row-inline">
          <span className="os-inline-range-label">本卡</span>
          <div className="os-seg os-seg-enter">
            <button
              type="button"
              title="这张卡跟随工程默认发音效"
              className={`os-seg-btn ${sfxOn ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'updateMeta', id: selected.id, patch: { sfxOn: true } })}
            >
              开
            </button>
            <button
              type="button"
              title="单独把这张卡静音（不影响其他卡）"
              className={`os-seg-btn ${!sfxOn ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'updateMeta', id: selected.id, patch: { sfxOn: false } })}
            >
              关
            </button>
          </div>
        </div>
        <div className="os-meta-grid os-meta-grid-two">
          <label className="os-field">
            音效
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={sfxFollowDefault ? '' : (selected.sfxId as string)}
                onChange={(e) =>
                  dispatch({
                    type: 'updateMeta',
                    id: selected.id,
                    patch: { sfxId: e.target.value === '' ? undefined : (e.target.value as SfxId) },
                  })
                }
              >
                <option key={sfxFollowChoice.id} value={sfxFollowChoice.id} title={sfxFollowChoice.hint}>
                  {sfxFollowChoice.name}
                </option>
                {sfxSampledChoices.length > 0 && (
                  <optgroup label="科技感采样（免费可商用）">
                    {sfxSampledChoices.map((o) => (
                      <option key={o.id} value={o.id} title={o.hint}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {sfxExtraGroups.map(([group, list]) => (
                  <optgroup key={group} label={group}>
                    {list.map((o) => (
                      <option key={o.id} value={o.id} title={o.hint}>
                        {o.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {sfxPlainChoices.map((o) => (
                  <option key={o.id} value={o.id} title={o.hint}>
                    {o.name}
                  </option>
                ))}
              </select>
              <button
                className="os-btn os-btn-ghost"
                type="button"
                title="立刻听一下这个音效（带时长：长卡 / 手动秒数都会在试听里体现）"
                disabled={auditionId === 'none'}
                onClick={() => {
                  const cue = resolveSfx(
                    selected,
                    state.project,
                    false,
                    def?.category,
                    selected.effectId,
                  )
                  playSfx(cue ? cue.id : auditionId, auditionGain, cue?.sustain)
                }}
              >
                🔊
              </button>
            </div>
          </label>
          <label
            className="os-field"
            title={
              autoOffset > 0
                ? `留空 = 自动对齐这张卡的动画起音（当前为 +${autoOffset.toFixed(2)}s）。也可手动填：正数延后、负数提前。`
                : '相对卡片出现时刻的偏移：填正数延后响，填负数提前响。留空 = 贴在卡片起点'
            }
          >
            触发偏移
            <input
              type="number"
              step={0.05}
              value={selected.sfxOffset ?? ''}
              placeholder={autoOffset > 0 ? `自动 +${autoOffset.toFixed(2)}s` : '自动 0s'}
              onChange={(e) =>
                dispatch({
                  type: 'updateMeta',
                  id: selected.id,
                  patch: {
                    sfxOffset:
                      e.target.value === ''
                        ? undefined
                        : Math.max(-2, Math.min(5, e.target.valueAsNumber || 0)),
                  },
                })
              }
            />
          </label>
          <label
            className="os-field"
            title="声音总共播多久。旋钮 = 实际播放时长：自动时长卡停在卡尾位置（音效跟随数据动画连贯铺满），短卡停在音效默认长度（一声）。轨道上的竖线刻度 = 音效默认长度基准。往右拖 = 手动定时长（秒），任何音效都能拉长，超出卡片按卡尾截断；点「自动」恢复跟随卡片。"
          >
            音效时长
            <div className="os-range-row" style={{ flex: 1 }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
                {/* 默认长度刻度：自动=一声时旋钮就停在这里；铺到卡尾时它标记"一声"的基准 */}
                <span
                  style={{
                    position: 'absolute',
                    left: `${Math.min(100, (sfxDurDefault / 15) * 100)}%`,
                    top: '50%',
                    width: 2,
                    height: 12,
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--ui-border)',
                    borderRadius: 1,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                  title={`音效默认长度 ${sfxDurDefault.toFixed(1)}s`}
                />
                <input
                  type="range"
                  min={0}
                  max={15}
                  step={0.1}
                  style={{ flex: 1 }}
                  value={Math.min(15, sfxDurValue)}
                  onChange={(e) => {
                    const v = Math.round(e.target.valueAsNumber * 10) / 10
                    // 拖到最左（0）= 回到自动；其余按 0.1s 取整写入手动时长
                    dispatch({
                      type: 'updateMeta',
                      id: selected.id,
                      patch: { sfxDuration: v <= 0.05 ? undefined : v },
                    })
                  }}
                />
              </div>
              <span className="os-range-value">
                {sfxDurAuto
                  ? sfxAutoSustains
                    ? '自动 · 铺到卡尾'
                    : '自动 · 一声'
                  : `${selected.sfxDuration!.toFixed(1)}s`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
              <button
                type="button"
                className={`os-btn os-btn-ghost ${sfxDurAuto ? 'os-btn-accent' : ''}`}
                style={{ padding: '2px 8px' }}
                title="回到自动：音效跟随数据动画连贯铺到卡尾（短卡响一声）"
                onClick={() =>
                  dispatch({ type: 'updateMeta', id: selected.id, patch: { sfxDuration: undefined } })
                }
              >
                自动
              </button>
            </div>
          </label>
        </div>
        <div className="os-param-row" data-sfx="volume">
          <div className="os-inline-range">
            <span className="os-inline-range-label">本卡音量</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sfxVolume}
                onChange={(e) =>
                  dispatch({
                    type: 'updateMeta',
                    id: selected.id,
                    patch: { sfxVolume: e.target.valueAsNumber },
                  })
                }
              />
              <span className="os-range-value">{Math.round(sfxVolume * 100)}%</span>
            </div>
          </div>
        </div>
        <div className="os-param-note os-param-note-block">
          {SFX_MUTED
            ? '本版本不发声：这里的下拉、音量、时长都会存进工程，但预览与导出都不出声。'
            : projectSfxOff
              ? '⚠️ 工程总开关关着，整片都不出声（导出也不会烤音轨）。到顶栏「设置 → 音效」里打开。'
              : subtitleNoSfx
                ? '口播字幕默认不发音效（一句一响会很吵）。想给这句单独配音效，在上面的下拉里挑一个。'
                : autoOffset > 0
                  ? `音效会自动对齐这张卡的动画起音（延后 ${autoOffset.toFixed(2)}s，可在「触发偏移」里改）。仅播放时出声，导出会混成一条音轨烤进成片。`
                  : '仅播放时出声，拖播放头不响；导出会把所有卡的音效混成一条音轨烤进成片。'}
        </div>

        {/* ===== 位置：卡槽 / 自由定位 / 坐标 / 分段落组 ===== */}
        <div className="os-param-divider">位置</div>
        <div className="os-meta-grid os-meta-grid-two">
          <label className="os-field" title={isSubtitle(selected) ? '字幕位置由「字幕统一样式」控制，改一次整片同步' : undefined}>
            卡槽
            {isSubtitle(selected) && <span className="os-param-note">统一样式控制</span>}
            <select
              value={selected.slot}
              disabled={fitLocksPosition(fit) || isSubtitle(selected)}
              onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { slot: e.target.value as SlotId, free: selected.free ? false : undefined } })}
            >
              {slotOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <div className="os-meta-cell">
            <Switch
              checked={Boolean(selected.free)}
              disabled={fitLocksPosition(fit) || isSubtitle(selected)}
              label="自由定位"
              hint={
                fit === 'full'
                  ? '铺满画布模式下位置由安全区决定'
                  : isHalfFit(fit)
                    ? `${fit === 'leftHalf' ? '左侧' : '右侧'}半屏模式下位置由这一档决定，想自由拖动画布请先切回「内容自适应」或「自定义」`
                    : isSubtitle(selected)
                    ? '字幕位置统一由「字幕统一样式」控制，不逐句拖动'
                    : '开启后可在画布上任意拖动这张卡'
              }
              onChange={(next) =>
                dispatch({
                  type: 'updateMeta',
                  id: selected.id,
                  patch: {
                    free: next,
                    ...(next ? { x: selected.x ?? 200, y: selected.y ?? 120 } : {}),
                  },
                })
              }
            />
          </div>
        </div>
        {selected.free && !fitLocksPosition(fit) && (
          <div className="os-meta-grid">
            <label className="os-field">X(px)
              <input type="number" step={10} value={Math.round(selected.x ?? 0)} onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { x: e.target.valueAsNumber } })} />
            </label>
            <label className="os-field">Y(px)
              <input type="number" step={10} value={Math.round(selected.y ?? 0)} onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { y: e.target.valueAsNumber } })} />
            </label>
            <label className="os-field" title="渐隐点(dimAt,秒)">渐隐(秒)
              <input type="number" step={0.1} min={0} value={selected.dimAt ?? ''} placeholder="不渐隐" onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { dimAt: e.target.value === '' ? undefined : Math.max(0, e.target.valueAsNumber) } })} />
            </label>
          </div>
        )}
        <div className="os-param-row">
          <label className="os-field">
            段落
            <input
              type="text"
              value={selected.seg ?? ''}
              placeholder="未分组"
              onChange={(e) => dispatch({ type: 'updateMeta', id: selected.id, patch: { seg: e.target.value || undefined } })}
            />
          </label>
        </div>

        {/* ===== 颜色：背景透明度 + 卡片强调色 + 局部着色 ===== */}
        <div className="os-param-divider">颜色</div>
        {/*
          背景透明度：拨杆只管「这张卡要不要单独设」，滑竿只管数值，两件事两个控件。
          之前是一个按钮两种文案（本卡单独设置 / 恢复跟随工程）既能开又能关，
          开了之后按钮只剩「恢复跟随工程」，看着像是关不掉，这里拆开。
          拖动滑竿会自动把拨杆打开（写入本卡值），关掉拨杆则回到跟随工程。
        */}
        <div className="os-param-row" data-card-bg-opacity>
          <div className="os-inline-range" title="0% = 背景完全不透明；100% = 背景完全隐藏，卡片里只剩文字（无背景、无模糊）。只作用于背景层，不影响文字清晰度。">
            <span className="os-inline-range-label">背景透明度</span>
            <div className="os-range-row">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={alphaToTransparency(
                  typeof selected.cardOpacity === 'number' ? selected.cardOpacity : projectCardOpacity,
                )}
                onChange={(e) =>
                  dispatch({
                    type: 'updateMeta',
                    id: selected.id,
                    patch: { cardOpacity: transparencyToAlpha(e.target.valueAsNumber) },
                  })
                }
              />
              <span className="os-range-value">
                {transparencyPercent(
                  typeof selected.cardOpacity === 'number' ? selected.cardOpacity : projectCardOpacity,
                )}
                %
              </span>
            </div>
          </div>
          <Switch
            checked={typeof selected.cardOpacity === 'number'}
            label="本卡单独设置"
            hint={
              typeof selected.cardOpacity === 'number'
                ? '关掉后这张卡恢复跟随工程统一透明度'
                : '打开后可单独调这张卡的透明度（直接拖上面的滑竿也会自动打开）'
            }
            onChange={(next) =>
              dispatch({
                type: 'updateMeta',
                id: selected.id,
                patch: {
                  cardOpacity: next
                    ? typeof selected.cardOpacity === 'number'
                      ? selected.cardOpacity
                      : projectCardOpacity
                    : undefined,
                },
              })
            }
          />
          <span className="os-param-note os-param-note-block">
            {typeof selected.cardOpacity === 'number'
              ? `本卡单独设置（${transparencyPercent(selected.cardOpacity)}%）· 关掉拨杆即恢复跟随工程 ${transparencyPercent(projectCardOpacity)}%`
              : `跟随工程 ${transparencyPercent(projectCardOpacity)}%`}
          </span>
        </div>
        {accentSchema ? (
          <div className="os-param-row">
            <span className="os-param-label">
              卡片强调色
              {cardAccent ? <span className="os-param-note">单独设置，覆盖主题</span> : <span className="os-param-note">跟随工程主题</span>}
            </span>
            {renderControl(accentSchema)}
            <div className="os-paint-swatches os-paint-swatches-inline">
              {QUICK_COLORS.slice(0, 7).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`os-paint-swatch ${cardAccent === c ? 'os-paint-swatch-on' : ''}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => dispatch({ type: 'updateParam', id: selected.id, key: 'accent', value: c })}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="os-param-row os-hint-row">该动效没有强调色参数</div>
        )}
        {/* ===== 字幕轨：一句一张卡 ===== */}
        {isSubtitle(selected) && (
          <>
            <div className="os-param-divider">
              字幕轨
              <span className="os-divider-count">
                {subtitleAt >= 0 ? `第 ${subtitleAt + 1} / ${subtitleRail.length} 句` : `${subtitleRail.length} 句`}
              </span>
            </div>
            {/* 一键让整片字幕显示 / 不显示：只影响画不画，文案与时间点都留着 */}
            <div className="os-param-row" data-sub-style="visible">
              <Switch
                checked={state.project.subtitlesVisible !== false}
                label="整片显示字幕"
                hint="关掉：预览和导出都不画字幕；字幕卡、文案与时间点全部保留，随时能开回来"
                onChange={(next) => dispatch({ type: 'setSubtitlesVisible', visible: next })}
              />
            </div>
            <div className="os-param-row os-param-row-btns">
              <button
                type="button"
                className="os-btn os-btn-ghost"
                disabled={!subtitlePrev}
                onClick={() => subtitlePrev && dispatch({ type: 'select', id: subtitlePrev.id })}
                title="选中上一句（时间轴播放头不动）"
              >
                ◀ 上一句
              </button>
              <button
                type="button"
                className="os-btn os-btn-ghost"
                disabled={!subtitleNext}
                onClick={() => subtitleNext && dispatch({ type: 'select', id: subtitleNext.id })}
                title="选中下一句（时间轴播放头不动）"
              >
                下一句 ▶
              </button>
            </div>
            <div className="os-param-row os-param-row-btns">
              <button
                type="button"
                className="os-btn os-btn-ghost"
                onClick={() => dispatch({ type: 'addSubtitleCard', afterId: selected.id, duration: DEFAULT_SUBTITLE_DURATION })}
                title="在本句之后插一张空白字幕卡，后面的句子自动后移"
              >
                ＋ 在本句后插入
              </button>
              <button
                type="button"
                className="os-btn os-btn-ghost"
                onClick={() => dispatch({ type: 'addSubtitleCard', afterId: null, duration: DEFAULT_SUBTITLE_DURATION })}
                title="在字幕轨末尾追加一张空白字幕卡"
              >
                ＋ 末尾新增
              </button>
            </div>
            <div className="os-meta-grid">
              <label className="os-field" title="起点会被限制在上一句结尾之后">
                起点(秒)
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  value={Number(selected.start.toFixed(2))}
                  onChange={(e) =>
                    dispatch({ type: 'updateMeta', id: selected.id, patch: { start: e.target.valueAsNumber } })
                  }
                />
              </label>
              <label className="os-field" title="时长会被限制在下一句开头之前">
                时长(秒)
                <input
                  type="number"
                  step={0.1}
                  min={MIN_SUBTITLE_DURATION}
                  value={Number(selected.duration.toFixed(2))}
                  onChange={(e) =>
                    dispatch({ type: 'updateMeta', id: selected.id, patch: { duration: e.target.valueAsNumber } })
                  }
                />
              </label>
            </div>
            <div className="os-param-row os-param-row-btns">
              <button
                type="button"
                className="os-btn os-btn-ghost"
                onClick={() => dispatch({ type: 'duplicate' })}
                title="复制本句，插到它后面"
              >
                复制本句
              </button>
              <button
                type="button"
                className="os-btn os-btn-ghost"
                onClick={() => dispatch({ type: 'remove', id: selected.id })}
                title="删除本句（Delete 键同效）"
              >
                删除本句
              </button>
            </div>
            <div className="os-param-note os-param-note-block">
              {subtitleRail.length} 句在字幕轨上按时间排列、互不重叠 · 本句{' '}
              {selected.start.toFixed(2)}s ~ {(selected.start + selected.duration).toFixed(2)}s · 轨道内可直接拖动改起点、拖两端改时长
            </div>
          </>
        )}

        {/* ===== 字幕统一样式：整片字幕共用一套，改一处全部同步 ===== */}
        {isSubtitle(selected) &&
          (() => {
            const st = state.project.subtitleStyle
            const bgAlpha = alphaOfCssColor(st.bg)
            const rest = Math.max(0, subtitleRail.length - 1)
            return (
              <>
                <div className="os-param-divider">
                  字幕统一样式
                  <span className="os-divider-count">整片 {subtitleRail.length} 句共用</span>
                </div>
                {/* 开关类：先定要不要背景条，后面两组里带「背景」字样的项跟着它显隐 */}
                <div className="os-param-row" data-sub-style="box">
                  <Switch
                    checked={st.box}
                    label="背景条"
                    hint="关掉就是纯文字，字幕没有底板"
                    onChange={(next) => dispatch({ type: 'setSubtitleStyle', patch: { box: next } })}
                  />
                </div>
                {/* 滑杆类：字号与背景不透明度挨在一起 */}
                <div className="os-param-row" data-sub-style="fontSize">
                  <div className="os-inline-range">
                    <span className="os-inline-range-label">字号</span>
                    <div className="os-range-row">
                      <input
                        type="range"
                        min={24}
                        max={80}
                        step={2}
                        value={st.fontSize}
                        onChange={(e) =>
                          dispatch({
                            type: 'setSubtitleStyle',
                            patch: { fontSize: e.target.valueAsNumber },
                          })
                        }
                      />
                      <span className="os-range-value">{st.fontSize}px</span>
                    </div>
                  </div>
                </div>
                {st.box && (
<div className="os-param-row" data-sub-style="bgAlpha">
                  <div className="os-inline-range">
                    <span className="os-inline-range-label">背景不透明度</span>
                    <div className="os-range-row">
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={bgAlpha}
                        onChange={(e) =>
                          dispatch({
                            type: 'setSubtitleStyle',
                            patch: { bg: rgbaFromHex(st.bg, e.target.valueAsNumber) },
                          })
                        }
                      />
                      <span className="os-range-value">{Math.round(bgAlpha * 100)}%</span>
                    </div>
                  </div>
                </div>
                )}
                {/* 取色类：背景色与文字色挨在一起 */}
                {st.box && (
                  <div className="os-param-row" data-sub-style="bg">
                    <label>背景色</label>
                    <div className="os-color-wrap">
                      <input
                        type="color"
                        value={hexOfCssColor(st.bg)}
                        onChange={(e) =>
                          dispatch({
                            type: 'setSubtitleStyle',
                            patch: { bg: rgbaFromHex(e.target.value, bgAlpha) },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
                <div className="os-param-row" data-sub-style="color">
                  <span className="os-param-label">文字色</span>
                  <div className="os-color-wrap">
                    <input
                      type="color"
                      value={hexOfCssColor(st.color)}
                      onChange={(e) =>
                        dispatch({ type: 'setSubtitleStyle', patch: { color: e.target.value } })
                      }
                    />
                  </div>
                  <div className="os-paint-swatches os-paint-swatches-inline">
                    {QUICK_COLORS.slice(0, 7).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`os-paint-swatch ${st.color === c ? 'os-paint-swatch-on' : ''}`}
                        style={{ background: c }}
                        title={c}
                        onClick={() => dispatch({ type: 'setSubtitleStyle', patch: { color: c } })}
                      />
                    ))}
                  </div>
                </div>
                {/* 分段选择类：对齐与位置挨在一起 */}
                <div className="os-param-row">
                  <label>对齐</label>
                  <div className="os-seg">
                    {(
                      [
                        ['left', '左'],
                        ['center', '居中'],
                        ['right', '右'],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        className={`os-seg-btn ${st.align === id ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'setSubtitleStyle', patch: { align: id } })}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="os-param-row" data-sub-style="slot">
                  <span className="os-param-label">位置</span>
                  <div className="os-seg">
                    {(
                      [
                        ['bottom', '底部'],
                        ['center', '居中'],
                        ['top', '顶部'],
                      ] as const
                    ).map(([id, name]) => (
                      <button
                        key={id}
                        type="button"
                        className={`os-seg-btn ${st.slot === id ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'setSubtitleStyle', patch: { slot: id } })}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="os-param-note os-param-note-block">
                  改任意一句的字号 / 颜色 / 背景 / 位置，其余 {rest} 句同步生效。每句的文案与时间点仍然各自独立。
                </div>
              </>
            )
          })()}

        {/* ===== 内容 ===== */}
        <div className="os-param-divider">{usesOwnText ? '本句文案' : '内容'}</div>
        {selected.effectId.startsWith('hf-') && (() => {
          const tplId = selected.effectId.slice(3)
          const scenes = hfPresets[tplId]
          if (!scenes || scenes.length === 0) return null
          const merged = scenes.map((s) => ({ ...s, mergedParams: { ...(def?.defaultParams ?? {}), ...s.params } }))
          return (
            <div className="os-param-row">
              <label>场景预设</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {merged.map((s) => {
                  const isActive = JSON.stringify(selected.params) === JSON.stringify(s.mergedParams)
                  return (
                    <button
                      key={s.name}
                      type="button"
                      className={`os-btn ${isActive ? '' : 'os-btn-ghost'}`}
                      onClick={() => {
                        for (const [k, v] of Object.entries(s.mergedParams)) {
                          dispatch({ type: 'updateParam', id: selected.id, key: k, value: v })
                        }
                      }}
                    >
                      {s.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })()}
        {contentOrdered.map((schema) => {
          // 数值型（带 min/max 的滑杆）走内联行：标题+滑竿同行，与视频设置保持一致
          const isInlineSlider = schema.type === 'number' && schema.min != null && schema.max != null
          if (isInlineSlider) {
            return (
              <div key={schema.key} className="os-param-row" data-content-key={schema.key}>
                <div className="os-inline-range">
                  <span className="os-inline-range-label">{schema.label}</span>
                  {renderControl(schema)}
                </div>
              </div>
            )
          }
          return (
            <div key={schema.key} className="os-param-row" data-content-key={schema.key}>
              <span className="os-param-label">{schema.label}</span>
              {renderControl(schema)}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
