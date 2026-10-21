import { useEffect, useState } from 'react'
import { EditorProvider, useEditor } from './store'
import { skins } from './themes'
import TopBar from './components/TopBar'
import EffectLibrary from './components/EffectLibrary'
import MediaLibrary from './components/MediaLibrary'
import PackPanel from './components/PackPanel'
import { PacksBootstrap } from './packRuntime'
import PreviewCanvas from './components/PreviewCanvas'
import ParameterPanel from './components/ParameterPanel'
import Timeline from './components/Timeline'
import PlayerDriver from './components/PlayerDriver'
import SfxPlayer from './components/SfxPlayer'
import TemplateGallery from './components/TemplateGallery'
import SrtImport from './components/SrtImport'
import ExportModal from './components/ExportModal'
import HomePanel from './components/HomePanel'
import ResetConfirmModal from './components/ResetConfirmModal'
import RenderStage from './components/RenderStage'
import './App.css'

type ModalKind = null | 'export' | 'templates' | 'srt' | 'home' | 'reset'

/* ===== 左（动效库）/ 右（参数面板）栏宽度：可拖边缘调，宽度记在本机 ===== */
const PANEL_W_KEY = 'animation-editor-panel-width-v1'
const DEFAULT_LEFT_W = 220
const DEFAULT_RIGHT_W = 252
const MIN_PANEL_W = 180
const MAX_PANEL_W = 560

function loadPanelWidth(): { left: number; right: number } {
  try {
    const raw = localStorage.getItem(PANEL_W_KEY)
    if (!raw) return { left: DEFAULT_LEFT_W, right: DEFAULT_RIGHT_W }
    const p = JSON.parse(raw) as { left?: number; right?: number }
    const clamp = (v: unknown, d: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.min(MAX_PANEL_W, Math.max(MIN_PANEL_W, v)) : d
    return { left: clamp(p.left, DEFAULT_LEFT_W), right: clamp(p.right, DEFAULT_RIGHT_W) }
  } catch {
    return { left: DEFAULT_LEFT_W, right: DEFAULT_RIGHT_W }
  }
}

/**
 * 面板边缘的拖拽条：按住左右拖即可改对应栏宽度，双击恢复默认。
 * 宽度写进 CSS 变量 --os-left-w / --os-right-w，由 .os-main 的 grid 消费。
 */
function PanelResizer({
  side,
  width,
  onResize,
  onReset,
}: {
  side: 'left' | 'right'
  width: number
  onResize: (next: number) => void
  onReset: () => void
}) {
  const [dragging, setDragging] = useState(false)
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = width
    setDragging(true)
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const raw = side === 'left' ? startW + dx : startW - dx
      onResize(Math.min(MAX_PANEL_W, Math.max(MIN_PANEL_W, Math.round(raw))))
    }
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  return (
    <div
      className={`os-resizer os-resizer-${side} ${dragging ? 'dragging' : ''}`}
      style={side === 'left' ? { left: width } : { right: width }}
      role="separator"
      aria-orientation="vertical"
      title="左右拖动调整宽度，双击恢复默认"
      onPointerDown={startDrag}
      onDoubleClick={onReset}
    />
  )
}

function KeyboardShortcuts() {
  const { state, dispatch } = useEditor()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (document.querySelector('.os-modal-mask')) return

      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        dispatch({ type: 'redo' })
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        dispatch({ type: 'duplicate' })
        return
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        dispatch({ type: 'duplicate' })
        return
      }
      // S = 剪刀：在播放头处把选中的素材一刀切开（可 undo）
      if (!mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        dispatch({ type: 'splitAt' })
        return
      }
      if (e.code === 'Space') {
        if (target?.closest('button')) return
        e.preventDefault()
        dispatch({ type: state.playing ? 'pause' : 'play' })
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 关键帧优先：时间轴上选中了菱形，Delete 删的是这个关键帧，不是整段素材
        if (state.selectedMediaKeyframe) {
          e.preventDefault()
          dispatch({
            type: 'removeMediaKeyframe',
            id: state.selectedMediaKeyframe.clipId,
            t: state.selectedMediaKeyframe.t,
          })
          return
        }
        // 卡关键帧同理：选中了卡上的菱形，Delete 删的是这一帧，不是整张卡
        if (state.selectedCardKeyframe) {
          e.preventDefault()
          dispatch({
            type: 'removeCardKeyframe',
            id: state.selectedCardKeyframe.cardId,
            t: state.selectedCardKeyframe.t,
          })
          return
        }
        // 图片素材片段优先：画布上选中了图片，Delete 删的是图片片段
        if (state.selectedImageClipId) {
          e.preventDefault()
          dispatch({ type: 'removeImageClip', id: state.selectedImageClipId })
          return
        }
        // 机位段优先：在机位轨道上选中了段，Delete 删的是机位段
        if (state.selectedHostClipId) {
          e.preventDefault()
          dispatch({ type: 'removeHostClip', id: state.selectedHostClipId })
          return
        }
        if (state.selectedId) {
          e.preventDefault()
          dispatch({ type: 'remove', id: state.selectedId })
          return
        }
        // 出镜素材条：切开后把不要的那段删掉（中间挖洞）
        if (state.selectedHostTrackId) {
          e.preventDefault()
          dispatch({ type: 'removeHostTrack', id: state.selectedHostTrackId })
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, state.selectedId, state.selectedImageClipId, state.selectedHostClipId, state.selectedHostTrackId, state.selectedMediaKeyframe, state.playing])

  return null
}

function EditorShell() {
  const [modal, setModal] = useState<ModalKind>(null)
  const [leftTab, setLeftTab] = useState<'effects' | 'media' | 'packs'>('effects')
  const [panelW, setPanelW] = useState(loadPanelWidth)
  const { state } = useEditor()
  const skin = skins[state.project.skin]

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_W_KEY, JSON.stringify(panelW))
    } catch {
      /* ignore */
    }
  }, [panelW])

  const layout = state.project.layout
  /**
   * 皮肤/配色的「语义彩色」提升到 App 根节点。
   *
   * 这些变量（--stage-data / --stage-primary / --stage-assist …）原本只注入到画布与卡片预览子树，
   * 但编辑器 UI 自己也大量引用它们（模式按钮的冰蓝→紫渐变、面板提示色、配色圆点…），
   * 引用不到 → 整套彩色静默失效，界面只剩黑白灰。这里在根节点补上，
   * 让 UI 与画布共用同一套色彩。只提升语义色，不碰 --stage-bg/text 等画布专用令牌。
   */
  const palette = state.project.palette
  // 主色跟随用户选的配色；primary / assist 固定用皮肤的紫与粉，
  // 这样「冰蓝→紫」这类双色渐变仍有层次（否则两端会被覆盖成同一个色）。
  const accentColor = palette?.accent || skin.canvasVars['--stage-accent']
  const uiColorVars = {
    '--stage-accent': accentColor,
    '--stage-primary': skin.canvasVars['--stage-primary'],
    '--stage-data': palette?.data || skin.canvasVars['--stage-data'],
    '--stage-assist': skin.canvasVars['--stage-assist'],
    '--stage-special': palette?.special || skin.canvasVars['--stage-special'],
    // 面板强调色（滑竿、选中态、聚焦环）也跟随主色
    '--ui-accent-color': accentColor,
    '--ui-accent-color-soft': `color-mix(in srgb, ${accentColor} 18%, transparent)`,
  } as React.CSSProperties

  return (
    <div
      className={`os-app os-layout-${layout} ui-${skin.ui}`}
      style={{
        ['--os-left-w' as string]: `${panelW.left}px`,
        ['--os-right-w' as string]: `${panelW.right}px`,
        ...uiColorVars,
      }}
    >
      <KeyboardShortcuts />
      {/* 拓展包运行时：开机装载一次 public/packs 下启用的包，把卡注册进 store */}
      <PacksBootstrap />
      <TopBar
        onOpenExport={() => setModal('export')}
        onOpenTemplates={() => setModal('templates')}
        onOpenSrt={() => setModal('srt')}
        onOpenHome={() => setModal('home')}
        onOpenReset={() => setModal('reset')}
      />
      <div className="os-main">
        <div className="os-left">
          {/* 左栏（动效库 / 素材库）右边缘：按住左右拖改宽度 */}
          {layout !== 'focus' && (
            <PanelResizer
              side="left"
              width={panelW.left}
              onResize={(left) => setPanelW((p) => ({ ...p, left }))}
              onReset={() => setPanelW((p) => ({ ...p, left: DEFAULT_LEFT_W }))}
            />
          )}
          <div className="os-left-tabs">
            <button
              type="button"
              className={`os-left-tab ${leftTab === 'effects' ? 'active' : ''}`}
              onClick={() => setLeftTab('effects')}
            >
              动效库
            </button>
            <button
              type="button"
              className={`os-left-tab ${leftTab === 'media' ? 'active' : ''}`}
              onClick={() => setLeftTab('media')}
            >
              素材库
            </button>
            <button
              type="button"
              className={`os-left-tab ${leftTab === 'packs' ? 'active' : ''}`}
              onClick={() => setLeftTab('packs')}
              title="拓展包：额外购买的动效卡与音效"
            >
              拓展包
            </button>
          </div>
          {leftTab === 'effects' ? <EffectLibrary /> : leftTab === 'media' ? <MediaLibrary /> : <PackPanel />}
        </div>
        <div className="os-center">
          <PreviewCanvas />
          <Timeline />
        </div>
        <ParameterPanel />
        {/* 右栏（参数面板）左边缘：按住左右拖改宽度 */}
        {layout !== 'focus' && layout !== 'review' && (
          <PanelResizer
            side="right"
            width={panelW.right}
            onResize={(right) => setPanelW((p) => ({ ...p, right }))}
            onReset={() => setPanelW((p) => ({ ...p, right: DEFAULT_RIGHT_W }))}
          />
        )}
      </div>
      <PlayerDriver />
      <SfxPlayer />
      {modal === 'export' && <ExportModal onClose={() => setModal(null)} />}
      {modal === 'templates' && <TemplateGallery onClose={() => setModal(null)} />}
      {modal === 'srt' && <SrtImport onClose={() => setModal(null)} />}
      {modal === 'home' && <HomePanel onClose={() => setModal(null)} />}
      {modal === 'reset' && <ResetConfirmModal onClose={() => setModal(null)} />}
    </div>
  )
}

export default function App() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('render') === '1') {
    return (
      <EditorProvider>
        <RenderStage />
      </EditorProvider>
    )
  }
  return (
    <EditorProvider>
      <EditorShell />
    </EditorProvider>
  )
}
