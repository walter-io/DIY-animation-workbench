import { useMemo, useRef, useState } from 'react'
import { useEditor } from '../store'
import Modal from './Modal'
import { isSubtitle } from '../subtitleTrack'
import { SFX_MUTED, audioBufferToWavBase64, renderSfxMix, resolveSfx } from '../sfx'

/** 二进制 → base64（音效烤入 / 素材像素送进无头渲染页都走这个） */
function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(new Error('文件读取失败'))
    r.readAsDataURL(file)
  })
}

/** 素材在编辑器里是 blob: 地址，无头页面取不到，读出像素一起送过去 */
async function collectMedia(
  assets: { id: string; name: string; kind: string; url: string }[],
  onProgress: (name: string) => void,
): Promise<{ id: string; base64: string; ext: string }[]> {
  const out: { id: string; base64: string; ext: string }[] = []
  for (const a of assets) {
    if (!a.url) continue
    onProgress(a.name)
    try {
      const blob = await fetch(a.url).then((r) => r.blob())
      const base64 = await fileToBase64(blob)
      const ext =
        (a.name.split('.').pop() ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase() ||
        (a.kind === 'video' ? 'mp4' : 'png')
      out.push({ id: a.id, base64, ext })
    } catch (e) {
      console.error('素材读取失败', a.name, e)
    }
  }
  return out
}

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const { state, effectFor } = useEditor()
  const [fps, setFps] = useState(state.project.fps || 30)
  const [format, setFormat] = useState<'mp4' | 'mov' | 'webm'>('mov')
  // 轨道里有素材时默认不勾透明：透明片是拿去叠在别的画面上的，
  // 勾了透明素材画面会被整段排除，用户导出就会发现"视频没了"。
  const [transparent, setTransparent] = useState(state.project.imageClips.length === 0)
  const [speed, setSpeed] = useState(1)
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState('')
  const [verify, setVerify] = useState('')
  const audioRef = useRef<HTMLInputElement>(null)
  const [audio, setAudio] = useState<File | null>(null)

  const frameCount = Math.max(1, Math.round(state.project.duration * fps))
  const hasMediaClips = state.project.imageClips.length > 0

  /**
   * 本次会烤进成片的音效。
   * 与预览播放共用 resolveSfx，所以「预览听到的」和「导出烤进去的」必然一致。
   */
  const sfxCues = useMemo(
    () =>
      state.project.sfxEnabled === false
        ? []
        : state.project.instances
            .map((i) =>
              resolveSfx(i, state.project, isSubtitle(i), effectFor(i.effectId)?.category, i.effectId),
            )
            .filter((c): c is NonNullable<typeof c> => c != null),
    [state.project, effectFor],
  )

  const start = async () => {
    setBusy(true)
    setLog('正在启动无头渲染器…')
    setVerify('')
    try {
      // 音轨：有音效时把音效（以及用户上传的音频）离线混成一条 WAV 再送过去；
      // 没有音效就沿用原文件，省一次转码。
      let audioBase64: string | null = null
      let audioExt = audio ? audio.name.split('.').pop() ?? 'm4a' : 'm4a'
      if (sfxCues.length > 0) {
        let bed: AudioBuffer | null = null
        if (audio) {
          setLog('正在读取音频…')
          // 只为解码开一个离线上下文（不需要出声，也不受自动播放策略限制）
          const tmp = new OfflineAudioContext(1, 1, 44100)
          bed = await tmp.decodeAudioData(await audio.arrayBuffer())
        }
        setLog(`正在合成 ${sfxCues.length} 个音效…`)
        const mix = await renderSfxMix(sfxCues, state.project.duration, { bed })
        if (mix) {
          audioBase64 = audioBufferToWavBase64(mix)
          audioExt = 'wav'
        } else if (audio) {
          // 混音没成（比如浏览器不支持离线渲染）也要把用户选的音频保住，不能整个丢掉
          audioBase64 = await fileToBase64(audio)
        }
      } else if (audio) {
        setLog('正在读取音频…')
        audioBase64 = await fileToBase64(audio)
      }
      // 轨道里的素材片段：把像素一起送过去，否则无头页面加载不到 blob: 地址，导出会漏掉素材
      const usedAssets = state.project.mediaAssets.filter((a) =>
        state.project.imageClips.some((c) => c.assetId === a.id),
      )
      const media =
        usedAssets.length > 0
          ? await collectMedia(usedAssets, (name) => setLog(`正在读取素材：${name}`))
          : []

      setLog(`逐帧渲染 ${frameCount} 帧（虚拟时间 + 等字体加载）…`)
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: state.project,
          fps,
          format,
          transparent,
          audioBase64,
          audioExt,
          media,
          speed,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const verifyHeader = res.headers.get('X-Animation-Verify')
      if (verifyHeader) setVerify(decodeURIComponent(verifyHeader))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `animation-export.${format === 'mov' ? 'mov' : format === 'webm' ? 'webm' : 'mp4'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setLog('导出完成，已开始下载。')
    } catch (e) {
      setLog('导出出错：' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="导出视频"
      onClose={onClose}
      footer={
        <button className="os-btn" type="button" disabled={busy} onClick={start}>
          {busy ? '渲染中…' : '开始导出'}
        </button>
      }
    >
      <div className="os-export-form">
        <div className="os-param-row">
          <label>帧率 (FPS)</label>
          <input
            type="number"
            min={1}
            max={60}
            value={fps}
            onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="os-param-row">
          <label>格式</label>
          <select value={format} onChange={(e) => setFormat(e.target.value as 'mp4' | 'mov' | 'webm')}>
            <option value="mov">MOV · ProRes 4444（剪映可叠透明层）</option>
            <option value="webm">WebM · VP9（透明 + 文件小，网页/PR 友好）</option>
            <option value="mp4">MP4 · H.264（快速预览）</option>
          </select>
        </div>
        <div className="os-param-row">
          <label className="os-toggle">
            <input
              type="checkbox"
              checked={transparent}
              disabled={format === 'mp4'}
              onChange={(e) => setTransparent(e.target.checked)}
            />
            <span>{format === 'mp4' ? '透明背景（仅 MOV / WebM 支持）' : '透明背景（alpha 通道）'}</span>
          </label>
        </div>
        {hasMediaClips && transparent && (
          <div className="os-param-note os-param-note-block">
            ⚠️ <b>透明导出不会包含导入的视频／图片</b>。轨道上有 {state.project.imageClips.length} 个素材片段，
            但透明片是拿去叠在别的画面上的，素材画面会被整段排除 —— 想让视频出现在成片里，
            请<b>取消勾选上面的「透明背景」</b>。
          </div>
        )}
        {hasMediaClips && !transparent && (
          <div className="os-param-note-line">
            ✅ 本次导出会包含轨道上的 {state.project.imageClips.length} 个素材片段
          </div>
        )}
        <div className="os-param-row">
          <label>导出速度</label>
          <select
            value={speed}
            disabled={transparent}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={1}>1x · 标准（最稳，成片用这个）</option>
            <option value={2}>2x · 快速（约省一半时间）</option>
            <option value={3}>3x · 极速（运动画面可能略跳）</option>
          </select>
        </div>
        {transparent && (
          <div className="os-param-note-line">透明导出是逐帧截图，速度固定，不受这里影响</div>
        )}
        <div className="os-param-row">
          <label>音轨（可选）</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={audioRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            />
            <button
              className="os-btn os-btn-ghost"
              type="button"
              onClick={() => audioRef.current?.click()}
              disabled={busy}
            >
              {audio ? `🎵 ${audio.name}` : '选择音频文件'}
            </button>
            {audio && (
              <button className="os-btn os-btn-ghost" type="button" onClick={() => setAudio(null)} disabled={busy}>
                移除
              </button>
            )}
          </div>
        </div>
        {SFX_MUTED ? (
          <div className="os-param-note-line">
            本版本不发声：动效卡的音效设置会留着，但预览与导出都不出声音。
            {audio ? '上面选的音频文件仍会原样烤进成片。' : '需要声音的话，可在上面单独选一个音频文件。'}
          </div>
        ) : sfxCues.length > 0 ? (
          <div className="os-param-note-line">
            🔊 本次会烤入 <b>{sfxCues.length}</b> 个动效卡音效
            {audio ? '，并与上面选的音频混在一起' : ''}（合成成一条 WAV 音轨）
          </div>
        ) : (
          <div className="os-param-note-line">
            当前没有动效卡音效 —— 总开关关着，或这些卡都被单独静音了
          </div>
        )}
        {format === 'mov' && (
          <div className="os-param-note os-param-note-block">
            MOV 走 ProRes 编码，画质高但<b>编码慢、文件很大</b>。只是预览 / 发社交平台的话，
            格式选 <b>MP4（H.264）</b> 会快很多，成片再回来选 MOV。
          </div>
        )}
        <p className="os-modal-hint">
          导出将在本地用无头浏览器逐帧渲染 {frameCount} 帧（等待字体加载完成后开闸），
          再用 ffmpeg 封装{format === 'mov' ? ' ProRes（透明走 4444+alpha）' : format === 'webm' ? ' VP9（透明带 alpha）' : ' H.264'}
          {audio ? '并烤入音效' : ''}，导出后自动 ffprobe 验收。
          时长 {state.project.duration}s × {fps}fps，期间勿关闭本页。
        </p>
        {log && <div className="os-export-log">{log}</div>}
        {verify && <div className="os-export-verify">✅ ffprobe 验收：{verify}</div>}
      </div>
    </Modal>
  )
}
