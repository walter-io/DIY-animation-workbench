import { useRef, useState } from 'react'
import { useEditor, usePlayhead } from '../store'
import type { MediaAsset } from '../types'
import { deleteAssetBlob, putAssetBlob } from '../mediaPersistence'

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function fmtDur(sec: number) {
  if (!sec || !isFinite(sec)) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 抽视频首帧做缩略图（dataURL），失败就返回空、走 url 兜底 */
function captureThumb(video: HTMLVideoElement, width: number, height: number): string | undefined {
  try {
    const w = 160
    const h = Math.max(1, Math.round((w * height) / (width || 16 / 9)))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.6)
  } catch {
    return undefined
  }
}

function readVideo(file: File): Promise<MediaAsset> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.muted = true
    v.src = url
    let done = false
    const finish = (thumb?: string) => {
      if (done) return
      done = true
      resolve({
        id: uid('asset'),
        kind: 'video',
        name: file.name,
        url,
        duration: v.duration || 0,
        width: v.videoWidth || 0,
        height: v.videoHeight || 0,
        ...(thumb ? { thumb } : {}),
      })
    }
    v.onloadedmetadata = () => {
      // 抽一帧首图；抽不到也不阻塞，直接入库
      v.onseeked = () => finish(captureThumb(v, v.videoWidth, v.videoHeight))
      try {
        v.currentTime = Math.min(0.1, (v.duration || 1) / 2)
      } catch {
        finish()
      }
    }
    v.onerror = () => reject(new Error(`无法读取视频：${file.name}`))
    // 兜底：4 秒还没 loadedmetadata 就直接入库（无时长/缩略图）
    setTimeout(() => finish(), 4000)
  })
}

function readImage(file: File): Promise<MediaAsset> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({
        id: uid('asset'),
        kind: 'image',
        name: file.name,
        url,
        duration: 0,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    img.onerror = () => reject(new Error(`无法读取图片：${file.name}`))
    img.src = url
  })
}

export default function MediaLibrary() {
  const { state, dispatch } = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assets = state.project.mediaAssets
  const time = usePlayhead()

  const importFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    for (const file of Array.from(files)) {
      try {
        const asset =
          file.type.startsWith('video') ? await readVideo(file) : file.type.startsWith('image') ? await readImage(file) : null
        if (!asset) {
          setError(`已跳过非视频/图片文件：${file.name}`)
          continue
        }
        // 像素文件单独存 IndexedDB，这样刷新页面后还能从里面重建 objectURL
        void putAssetBlob(asset.id, file)
        dispatch({ type: 'addMediaAsset', asset })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    }
    setBusy(false)
  }

  /**
   * 直接拖到轨道用的是 HTML5 DnD；这里给一个"点一下就加到播放头"的兜底入口。
   * 图片和视频走同一个动作 —— 落点轨道统一取 1，拖上去之后还能再上下换轨道。
   */
  const addAtPlayhead = (asset: MediaAsset) => {
    dispatch({ type: 'addMediaClipFromAsset', assetId: asset.id, start: time, track: 1 })
  }

  const onDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData('application/x-os-asset', JSON.stringify({ id: asset.id, kind: asset.kind }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="os-panel os-panel-left">
      <div className="os-panel-header os-panel-header-lib">
        <span className="os-lib-header-title">素材库 ({assets.length})</span>
        <button
          className="os-lib-import-btn"
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? '导入中…' : '＋ 导入'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/*,image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          void importFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="os-panel-body">
        {error && <div className="os-lib-error">{error}</div>}
        {assets.length === 0 ? (
          <div className="os-empty os-media-empty">
            <div className="os-media-empty-icon">🎞️</div>
            <div>把视频或图片拖进来</div>
            <button className="os-lib-import-btn wide" type="button" onClick={() => fileRef.current?.click()}>
              ＋ 导入视频 / 图片
            </button>
            <div className="os-media-hint">导入后拖到下方轨道即可使用</div>
          </div>
        ) : (
          <div className="os-media-list">
            {assets.map((a) => (
              <div
                key={a.id}
                className="os-media-item"
                draggable
                onDragStart={(e) => onDragStart(e, a)}
                title={`${a.name}\n拖到轨道，或点 ＋ 加到播放头（${fmtDur(a.duration) || '图片'}）`}
              >
                <div className="os-media-thumb">
                  <img src={a.thumb || a.url || undefined} alt={a.name} draggable={false} />
                  <span className={`os-media-kind os-media-kind-${a.kind}`}>{a.kind === 'video' ? '视频' : '图片'}</span>
                </div>
                <div className="os-media-meta">
                  <div className="os-media-name" title={a.name}>
                    {a.name}
                  </div>
                  <div className="os-media-sub">
                    {a.kind === 'video' ? fmtDur(a.duration) : `${a.width}×${a.height}`}
                  </div>
                </div>
                <div className="os-media-acts">
                  <button
                    className="os-media-act add"
                    type="button"
                    title="加到当前播放头位置"
                    onClick={() => addAtPlayhead(a)}
                  >
                    ＋
                  </button>
                  <button
                    className="os-media-act del"
                    type="button"
                    title="从素材库移除"
                    onClick={() => {
                      void deleteAssetBlob(a.id)
                      dispatch({ type: 'removeMediaAsset', id: a.id })
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
