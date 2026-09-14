import { useMemo, useRef, useState } from 'react'
import { useEditor } from '../store'
import Modal from './Modal'
import { parseSrt } from '../srt'
import { chunkCues, suggestCardsForChunks } from '../autoCards'
import { readPrefs } from '../prefs'

/** 口播稿导入弹窗：粘贴 .srt 或选择本地文件 → 生成底部字幕轨 */
export default function SrtImport({ onClose }: { onClose: () => void }) {
  const { dispatch } = useEditor()
  const [srt, setSrt] = useState('')
  const [autoCards, setAutoCards] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const cues = useMemo(() => {
    try {
      return parseSrt(srt)
    } catch {
      return []
    }
  }, [srt])
  const total = cues.length ? Math.ceil(cues[cues.length - 1].end / 1000) : 0
  const chunks = chunkCues(cues)
  const cardCount = autoCards
    ? suggestCardsForChunks(chunks).filter(Boolean).length
    : 0
  // 预览前 4 张卡长什么样，导入前就能看到匹配质量
  const previewCards = autoCards
    ? suggestCardsForChunks(chunks)
        .map((s, i) => (s ? { i, s } : null))
        .filter((x): x is { i: number; s: NonNullable<typeof x>['s'] } => x != null)
        .slice(0, 4)
    : []
  // 个人偏好：常用卡型排行（历史版本面板「记录我的偏好」积累），仅用于提示展示
  const prefsTop = useMemo(() => {
    const ranking = readPrefs()
      ? Object.entries(readPrefs()!.effectCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)
      : []
    return ranking.length ? ranking.join('、') : ''
  }, [])

  const pickFile = (file: File | undefined) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => setSrt(String(r.result ?? ''))
    r.readAsText(file)
  }

  const doImport = () => {
    if (!cues.length) return
    dispatch({ type: 'addSrtInstance', srt, total, autoCards })
    onClose()
  }

  return (
    <Modal title="导入口播稿 (.srt)" onClose={onClose} footer={<button className="os-btn" type="button" disabled={!cues.length} onClick={doImport}>导入字幕与动效</button>}>
      <div className="os-srt-import">
        <p className="os-srt-hint">
          粘贴剪映导出的 .srt 字幕内容，或选择本地 .srt 文件。导入后按口播断句，<strong>每一句生成一张独立的字幕卡</strong>，
          全部排在字幕轨上（可单独选中、改文案、调时长、拖动、删除、插入）；开启自动要点卡后，每 3 句按内容匹配生成一张动效卡。
        </p>
        <div className="os-srt-actions">
          <button className="os-btn os-btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
            选择 .srt 文件
          </button>
          <button className="os-btn os-btn-ghost" type="button" onClick={() => setSrt('')}>
            清空
          </button>
          <input ref={fileRef} type="file" accept=".srt,text/plain" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0])} />
        </div>
        <textarea
          className="os-srt-textarea"
          value={srt}
          onChange={(e) => setSrt(e.target.value)}
          placeholder={'1\n00:00:01,000 --> 00:00:04,000\n欢迎来到本期节目\n\n2\n00:00:05,000 --> 00:00:08,500\n今天我们用数据讲增长'}
          spellCheck={false}
        />
        <label className="os-toggle">
          <input
            type="checkbox"
            checked={autoCards}
            onChange={(e) => setAutoCards(e.target.checked)}
          />
          <span>自动生成要点动效卡</span>
        </label>
        <div className={`os-srt-stat ${cues.length ? '' : 'empty'}`}>
          {cues.length
            ? `解析到 ${cues.length} 句 · 总时长 ${total}s · 将生成 ${cues.length} 张字幕卡（同一条字幕轨）${cardCount ? ` + ${cardCount} 张要点卡` : ''}`
            : '等待粘贴 SRT 内容…'}
        </div>
        {autoCards && prefsTop && (
          <div className="os-srt-hint">
            已参考个人偏好：常用卡型（{prefsTop}）会优先匹配。
          </div>
        )}
        {previewCards.length > 0 && (
          <div className="os-srt-preview">
            <div className="os-srt-preview-title">匹配预览（前 {previewCards.length} 张）</div>
            {previewCards.map(({ i, s }) => (
              <div key={i} className="os-srt-preview-item">
                <span className={`os-srt-role os-srt-role-${s.role ?? 'body'}`}>
                  {s.role === 'open' ? '开场' : s.role === 'end' ? '收尾' : '论述'}
                </span>
                <span className="os-srt-preview-name">{s.name}</span>
                <span className="os-srt-preview-text">
                  {Object.values(s.params)
                    .filter((v): v is string => typeof v === 'string' && v.length > 0)
                    .slice(0, 2)
                    .map((v) => v.replace(/\n/g, ' / '))
                    .join(' · ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
