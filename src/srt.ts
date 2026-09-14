export type SrtCue = { index: number; start: number; end: number; text: string }

/** 解析 SRT 时间码 "00:00:01,234" 为毫秒 */
function timeToMs(t: string): number {
  const m = /(\d+):(\d{1,2}):(\d{1,2})[,.](\d{1,3})/.exec(t)
  if (!m) return 0
  const h = Number(m[1])
  const min = Number(m[2])
  const s = Number(m[3])
  const ms = Number(m[4].padEnd(3, '0'))
  return h * 3600000 + min * 60000 + s * 1000 + ms
}

/** 解析标准 .srt 文本为 cue 数组（毫秒级 start/end） */
export function parseSrt(raw: string): SrtCue[] {
  if (!raw || !raw.trim()) return []
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n\s*\n/)
  const cues: SrtCue[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) continue
    const timeLine = lines.find((l) => l.includes('-->'))
    if (!timeLine) continue
    const [a, b] = timeLine.split('-->').map((s) => s.trim())
    const start = timeToMs(a)
    const end = timeToMs(b)
    if (end <= start) continue
    const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n').trim()
    if (!text) continue
    const index = Number(lines[0]) || cues.length + 1
    cues.push({ index, start, end, text })
  }
  return cues
}

/** 从 .srt 文件内容里提取纯文本（去时间码，多句连排，便于预览/复制） */
export function srtToPlainText(raw: string): string {
  return parseSrt(raw)
    .map((c) => c.text)
    .join('\n')
}
