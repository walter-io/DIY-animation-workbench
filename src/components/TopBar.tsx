import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useEditor } from '../store'
import { skinList, styleOptions, fontOptions, themePresets, matchPresetId } from '../themes'
import type { Palette } from '../types'
import { alphaToTransparency, transparencyPercent, transparencyToAlpha } from '../cardOpacity'
import { CARD_SIZE_OPTIONS, DEFAULT_CARD_SIZE } from '../cardSize'
import { CANVAS_BG_OPTIONS } from '../canvasBg'
import { serializeProject } from '../mediaPersistence'
import { isSubtitle } from '../subtitleTrack'
import { DEFAULT_SFX_ID, DEFAULT_SFX_VOLUME, getSfxVersion, playSfx, sfxOptions, subscribeSfx, type SfxId } from '../sfx'

const PALETTE_FIELDS: { key: keyof Palette; name: string; hint: string }[] = [
  { key: 'accent', name: '主色', hint: '标题、强调、关键线条' },
  { key: 'data', name: '数据色', hint: '数字、图表、进度' },
  { key: 'special', name: '点缀色', hint: '金句、警示、点睛' },
]

type TopBarProps = {
  onOpenExport: () => void
  onOpenTemplates: () => void
  onOpenSrt: () => void
  onOpenHome: () => void
  onOpenReset: () => void
}

function Dropdown({
  label,
  title,
  wide,
  children,
}: {
  label: string
  title?: string
  /** 宽面板：设置项多，两列铺开 + 限高滚动，不让它顶出屏幕 */
  wide?: boolean
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="os-dd" ref={ref}>
      <button
        className={`os-dd-btn ${open ? 'active' : ''}`}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title}
        aria-expanded={open}
      >
        {label}
        <span className="os-dd-caret">▾</span>
      </button>
      {open && (
        <div className={`os-dd-menu${wide ? ' os-dd-menu-wide' : ''}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export default function TopBar({
  onOpenExport,
  onOpenTemplates,
  onOpenSrt,
  onOpenHome,
  onOpenReset,
}: TopBarProps) {
  const { state, dispatch } = useEditor()
  const { project } = state
  const {
    videoUrl,
    videoName,
    videoVisible,
    videoOpacity,
    zoom,
    canvasOrientation,
    videoW,
    videoH,
    showGrid,
  } = state
  const [saved, setSaved] = useState(false)
  // 订阅音效名单：装/卸拓展包时下拉框要立刻跟着变
  useSyncExternalStore(subscribeSfx, getSfxVersion)

  // 字幕总开关：老工程没这个字段，按「显示」处理
  const subtitlesVisible = project.subtitlesVisible !== false
  const subtitleCount = project.instances.reduce((n, i) => (isSubtitle(i) ? n + 1 : n), 0)

  const videoIsPortrait = videoW > 0 && videoH > 0 && videoH > videoW
  const videoIsLandscape = videoW > 0 && videoH > 0 && videoW >= videoH
  const directionMismatch = !!videoUrl && (
    (canvasOrientation === 'portrait' && !videoIsPortrait) ||
    (canvasOrientation === 'landscape' && !videoIsLandscape)
  )
  const saveLocal = () => {
    try {
      const list = JSON.parse(localStorage.getItem('animation-editor-versions-v1') || '[]') as unknown[]
      const version = {
        id: `v_${Date.now()}`,
        name: state.project.name,
        at: new Date().toLocaleString('zh-CN'),
        project: serializeProject(state.project),
      }
      localStorage.setItem(
        'animation-editor-versions-v1',
        JSON.stringify([version, ...list].slice(0, 50)),
      )
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1200)
    } catch {
      /* ignore */
    }
  }
  return (
    <header className="os-topbar">
      <div className="os-topbar-left">
        <div className="os-logo">DIY动效编辑台</div>
        <input
          className="os-project-name"
          value={project.name}
          onChange={(e) => dispatch({ type: 'setName', name: e.target.value })}
          spellCheck={false}
        />
      </div>

      <div className="os-topbar-right">
        <button className="os-dd-btn" type="button" onClick={onOpenSrt}>
          📝 导入口播稿
        </button>
        <button className="os-dd-btn" type="button" onClick={onOpenTemplates}>
          模板
        </button>
        {videoUrl && <Dropdown label="视频" title="垫底视频：显示 / 透明度">
          {() => (
            <>
              <button
                className={`os-dd-item ${videoVisible ? 'active' : ''}`}
                type="button"
                onClick={() => dispatch({ type: 'toggleVideoVisible' })}
              >
                {videoVisible ? '👁 显示中' : '🚫 已隐藏'}
              </button>
              <label className="os-dd-row">
                透明度
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={videoOpacity}
                  onChange={(e) => dispatch({ type: 'setVideoOpacity', opacity: e.target.valueAsNumber })}
                />
              </label>
              {videoW > 0 && videoH > 0 && (
                <span
                  className="os-dd-hint"
                  title={`垫底视频实际尺寸：${videoW}×${videoH}，${videoIsPortrait ? '竖屏' : '横屏'}`}
                >
                  📐 {videoName ? `${videoName} · ` : ''}{videoW}×{videoH}
                  {directionMismatch ? '（方向不匹配）' : ''}
                </span>
              )}
            </>
          )}
        </Dropdown>}

        <Dropdown label="主题色" title="工程主题色：一次设置，全部卡片统一换色">
          {() => (
            <div className="os-dd-form">
              <div className="os-dd-label">预设主题</div>
              <div className="os-theme-grid">
                {themePresets.map((t) => {
                  const active = matchPresetId(project.palette) === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`os-theme-btn ${active ? 'active' : ''}`}
                      onClick={() => dispatch({ type: 'setPalette', palette: t.palette })}
                    >
                      <span className="os-theme-dots">
                        <i style={{ background: t.palette.accent }} />
                        <i style={{ background: t.palette.data }} />
                        <i style={{ background: t.palette.special }} />
                      </span>
                      {t.name}
                    </button>
                  )
                })}
              </div>
              <div className="os-dd-label">自定义</div>
              {PALETTE_FIELDS.map((f) => (
                <div key={f.key} className="os-theme-row" title={f.hint}>
                  <span>{f.name}</span>
                  <input
                    type="color"
                    value={project.palette[f.key]}
                    onChange={(e) => dispatch({ type: 'setPalette', palette: { [f.key]: e.target.value } })}
                  />
                  <code>{project.palette[f.key]}</code>
                </div>
              ))}
              <button
                type="button"
                className="os-dd-item"
                onClick={() => dispatch({ type: 'clearCardAccents' })}
                title="把所有单独设置过强调色的卡片恢复为跟随主题"
              >
                全部卡片跟随主题色
              </button>
            </div>
          )}
        </Dropdown>

        <Dropdown label="设置" wide title="皮肤 / 骨架 / 字体 / 字幕 / 音效 / 动效卡通用默认设置">
          {() => (
            <div className="os-dd-form os-dd-form-wide">
              <div className="os-dd-col">
              <div className="os-dd-title">动效卡通用默认设置</div>
              <div className="os-dd-label">
                卡片尺寸
                <span className="os-dd-note">没单独调过尺寸的卡跟随这里</span>
              </div>
              <div className="os-dd-seg">
                {CARD_SIZE_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    className={`os-dd-seg-btn ${(project.cardSize ?? DEFAULT_CARD_SIZE) === s.id ? 'active' : ''}`}
                    type="button"
                    title={s.hint}
                    onClick={() => dispatch({ type: 'setCardSize', size: s.id })}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="os-dd-note-block">
                只作用于「没有单独调过尺寸」的卡：铺满画布的卡不走这一档，单卡在右侧参数面板里调过「整体缩放」或手动拖拽缩放过的也以自己的为准。
              </div>
              <div className="os-dd-title">画布背景</div>
              <div className="os-swatch-grid">
                {CANVAS_BG_OPTIONS.map((b) => (
                  <button
                    key={b.id}
                    className={`os-swatch-btn ${(project.canvasBg ?? 'auto') === b.id ? 'active' : ''}`}
                    type="button"
                    title={b.hint}
                    style={b.id === 'custom' && project.canvasBgColor ? { background: project.canvasBgColor } : { background: b.swatch }}
                    onClick={() => dispatch({ type: 'setCanvasBg', bg: b.id })}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
              <div className="os-dd-note-block">
                整块画布（成片）的底色，改一处整片都变，非透明导出也会带上。米白 = 解说知识卡默认的纸感底。
              </div>
              {(project.canvasBg ?? 'auto') === 'custom' && (
                <label className="os-dd-row" title="自定义画布底色">
                  自定义色
                  <input
                    type="color"
                    value={project.canvasBgColor ?? '#f4f5f7'}
                    onChange={(e) => dispatch({ type: 'setCanvasBg', bg: 'custom', color: e.target.value })}
                  />
                  <span>{project.canvasBgColor ?? '#f4f5f7'}</span>
                </label>
              )}
              <div className="os-dd-label">主题</div>
              <div className="os-swatch-grid">
                {skinList.map((s) => (
                  <button
                    key={s.id}
                    className={`os-swatch-btn ${project.skin === s.id ? 'active' : ''}`}
                    type="button"
                    data-ui={s.ui}
                    style={{ background: s.ui === 'light' ? '#f4f5f7' : '#0b0b0d' }}
                    onClick={() => dispatch({ type: 'setSkin', skin: s.id as never })}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="os-dd-label">卡片质感</div>
              <div className="os-swatch-grid os-swatch-grid-two">
                {styleOptions.map((s) => (
                  <button
                    key={s.id}
                    className={`os-swatch-btn ${project.style === s.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => dispatch({ type: 'setStyle', style: s.id as never })}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="os-dd-label">字体</div>
              <div className="os-swatch-grid os-swatch-grid-two">
                {fontOptions.map((f) => (
                  <button
                    key={f.id}
                    className={`os-swatch-btn ${project.font === f.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => dispatch({ type: 'setFont', font: f.id as never })}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <div className="os-dd-label">卡片背景透明</div>
              <label className="os-dd-row" title="0% = 背景完全不透明；100% = 背景完全隐藏，卡片里只剩文字">
                透明
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={alphaToTransparency(project.cardOpacity)}
                  onChange={(e) =>
                    dispatch({ type: 'setCardOpacity', opacity: transparencyToAlpha(e.target.valueAsNumber) })
                  }
                />
                <span>{transparencyPercent(project.cardOpacity)}%</span>
              </label>
              </div>

              <div className="os-dd-col">
              {/* 口播字幕总开关：一键让整片字幕显示 / 不显示，文案与时间点都保留 */}
              <div className="os-dd-title">口播字幕</div>
              <div className="os-dd-seg">
                <button
                  className={`os-dd-seg-btn ${subtitlesVisible ? 'active' : ''}`}
                  type="button"
                  title="显示：整片字幕照常出现在画面上，导出也会烤进去"
                  onClick={() => dispatch({ type: 'setSubtitlesVisible', visible: true })}
                >
                  👁 全部显示
                </button>
                <button
                  className={`os-dd-seg-btn ${!subtitlesVisible ? 'active' : ''}`}
                  type="button"
                  title="不显示：预览和导出都不画字幕，卡片与文案仍在时间轴上，随时能开回来"
                  onClick={() => dispatch({ type: 'setSubtitlesVisible', visible: false })}
                >
                  🚫 全部隐藏
                </button>
              </div>
              <div className="os-dd-note-block">
                {subtitleCount > 0
                  ? `共 ${subtitleCount} 句。关掉后预览与导出都不画字幕，但字幕卡、文案和时间点都还在，随时能一键开回来。`
                  : '工程里还没有口播字幕，导入口播稿后这里会显示总句数。'}
              </div>
              <div className="os-dd-title">音效</div>
              <div className="os-dd-seg">
                <button
                  className={`os-dd-seg-btn ${project.sfxEnabled !== false ? 'active' : ''}`}
                  type="button"
                  title="开着：每张动效卡出现时会发一声，导出时也会烤进成片"
                  onClick={() => dispatch({ type: 'setSfxEnabled', enabled: true })}
                >
                  {project.sfxEnabled !== false ? '🔊 开' : '开'}
                </button>
                <button
                  className={`os-dd-seg-btn ${project.sfxEnabled === false ? 'active' : ''}`}
                  type="button"
                  title="关掉：整片不出声，导出也不会烤音轨（卡片上的音效设置都保留）"
                  onClick={() => dispatch({ type: 'setSfxEnabled', enabled: false })}
                >
                  {project.sfxEnabled === false ? '🔇 关' : '关'}
                </button>
              </div>
              <div className="os-dd-note-block">
                {project.sfxEnabled === false
                  ? '总开关：已关。预览与导出都不出声（导出不烤音轨），卡片上配好的音效都留着，一键就能开回来。'
                  : '总开关：开。动效卡出现时会发声，导出也会混成一条音轨烤进成片。'}
                只在这里改一次，全片生效。
              </div>
              <div className="os-dd-label">
                默认音效
                <span className="os-dd-note">没单独指定的卡用这个</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  className="os-select"
                  style={{ flex: 1 }}
                  value={project.sfxDefaultId ?? DEFAULT_SFX_ID}
                  onChange={(e) => dispatch({ type: 'setSfxDefaultId', id: e.target.value as SfxId })}
                >
                  {sfxOptions().map((o) => (
                    <option key={o.id} value={o.id} title={o.hint}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <button
                  className="os-btn os-btn-ghost"
                  type="button"
                  title="试听默认音效"
                  onClick={() => playSfx(project.sfxDefaultId ?? DEFAULT_SFX_ID, project.sfxVolume ?? DEFAULT_SFX_VOLUME)}
                >
                  🔊
                </button>
              </div>
              <div className="os-dd-row" title="每张卡的最终音量 = 卡上音量 × 这个总音量">
                总音量
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={project.sfxVolume ?? DEFAULT_SFX_VOLUME}
                  onChange={(e) => dispatch({ type: 'setSfxVolume', volume: e.target.valueAsNumber })}
                />
                <span>{Math.round((project.sfxVolume ?? DEFAULT_SFX_VOLUME) * 100)}%</span>
              </div>
              <div className="os-dd-note-block">
                音效只在播放时出声（拖播放头不响），导出会混成一条音轨烤进成片。口播字幕默认不发音效。
              </div>
              <div className="os-dd-title">画布方向</div>
              <div className="os-dd-seg">
                {([
                  ['landscape', '横屏 16:9'],
                  ['portrait', '竖屏 9:16'],
                ] as const).map(([id, name]) => (
                  <button
                    key={id}
                    className={`os-dd-seg-btn ${canvasOrientation === id ? 'active' : ''}`}
                    type="button"
                    onClick={() => dispatch({ type: 'setCanvasOrientation', orientation: id })}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="os-dd-title">参考网格</div>
              <button
                className={`os-dd-item ${showGrid ? 'active' : ''}`}
                type="button"
                onClick={() => dispatch({ type: 'toggleGrid' })}
              >
                {showGrid ? '网格 开' : '网格 关'}
              </button>
              <div className="os-dd-row">
                缩放
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => dispatch({ type: 'setZoom', zoom: e.target.valueAsNumber })}
                />
                <span>{zoom.toFixed(2)}x</span>
              </div>
              </div>
            </div>
          )}
        </Dropdown>

        {/* 版本三件套直接平铺：原来藏在「版本」下拉里，每次都要点两下才够得着 */}
        <div className="os-topbar-group">
          <button
            className="os-dd-btn"
            type="button"
            title="把当前工程存一份到本机历史版本（不覆盖已有记录）"
            onClick={saveLocal}
          >
            💾 {saved ? '已保存' : '保存版本'}
          </button>
          <button
            className="os-dd-btn"
            type="button"
            title="打开历史版本列表，可回到任意一个版本"
            onClick={onOpenHome}
          >
            🕘 历史版本
          </button>
          <button
            className="os-dd-btn"
            type="button"
            title="清空当前工程回到空白编辑台（历史版本仍然保留）"
            onClick={onOpenReset}
          >
            ↺ 重置编辑台
          </button>
        </div>
        <button className="os-btn" type="button" onClick={onOpenExport}>
          导出
        </button>
      </div>
    </header>
  )
}
