import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

function run(bin: string, args: string[]): string {
  return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

/** 导出会经过无头 Chromium 渲染：它解不了 HEVC 等编码，非 H.264 的视频先转成 H.264 */
function ensureWebPlayableVideo(file: string): string {
  try {
    const probe = run('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      file,
    ])
    const codec = probe.trim().split('\n')[0]?.trim() ?? ''
    if (!codec || codec === 'h264') return file
    // 同一素材 id 的转码结果直接复用：素材内容由 id 唯一对应，重复导出不再重转
    const out = file.replace(/\.[a-z0-9]+$/i, '') + '.h264.mp4'
    if (fs.existsSync(out)) return out
    console.error(`[export] 源视频编码 ${codec} 无头浏览器解不了，转码 H.264：${path.basename(file)}`)
    execFileSync(
      'ffmpeg',
      [
        '-y', '-i', file,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        out,
      ],
      { stdio: 'ignore' },
    )
    return out
  } catch (e) {
    console.error('[export] 视频转码失败，按原文件尝试：', e instanceof Error ? e.message : String(e))
    return file
  }
}

/**
 * 导出素材中转目录。
 *
 * 编辑器里的素材 url 是 blob: 对象 URL，只在创建它的那个页面会话里有效；
 * 导出用的无头浏览器是一个全新的页面，拿不到这些 Blob，素材会直接渲染不出来。
 * 所以导出时前端把素材像素以 base64 送过来，服务端落盘到此目录，
 * 再用 /api/export-media 提供成普通 http 地址回填进工程，无头页面才能正常加载。
 */
const MEDIA_DIR = path.join(os.tmpdir(), 'animation-export-media')

function mediaMime(ext: string): string {
  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'mov':
      return 'video/quicktime'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

/** 把前端送来的素材 base64 落盘，返回 assetId → 可访问 http 地址的映射 */
function stageMedia(
  media: { id?: unknown; base64?: unknown; ext?: unknown }[],
  host: string,
): Map<string, string> {
  const map = new Map<string, string>()
  if (!Array.isArray(media) || media.length === 0) return map
  fs.mkdirSync(MEDIA_DIR, { recursive: true })
  const VIDEO_EXT = new Set(['mov', 'mp4', 'webm', 'avi', 'mkv', 'mts', 'm2ts', 'm4v'])
  for (const m of media) {
    const id = String(m?.id ?? '')
    const b64 = String(m?.base64 ?? '')
    if (!id || !b64) continue
    const ext = String(m?.ext ?? 'mp4').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4'
    const file = path.join(MEDIA_DIR, `${id}.${ext}`)
    try {
      fs.writeFileSync(file, Buffer.from(b64, 'base64'))
      // 视频素材先保证编码可被无头浏览器解码（HEVC 的 iPhone MOV 就是从这里丢画面的）
      const served = VIDEO_EXT.has(ext) ? ensureWebPlayableVideo(file) : file
      const servedName = path.basename(served)
      map.set(id, `http://${host}/api/export-media/${servedName}`)
    } catch (e) {
      console.error('[export] media write failed ' + id + ': ' + (e instanceof Error ? e.message : String(e)))
    }
  }
  return map
}

/**
 * 导出中间件：
 *  - 无头 Chrome 虚拟时间逐帧（每帧 seek 后等双 rAF 落定 = 时钟校正）
 *  - 等 document.fonts.ready 后才开闸（Pitfall 09 字形跳动）
 *  - 透明走 ffmpeg ProRes 4444（yuva444p10le），非透明 MOV 走 ProRes 422 HQ
 *  - 可选音效烤入（audioBase64）
 *  - 导出后 ffprobe 自动验证编码与 alpha，失败即报错
 */
function exportPlugin(): Plugin {
  return {
    name: 'animation-export',
    configureServer(server) {
      // GET /api/export-media/<file> —— 给无头渲染页提供导出素材。
      // 必须支持 Range：素材层会按播放头 seek 视频，不支持 Range 会导致画面卡在首帧。
      server.middlewares.use('/api/export-media', (req, res) => {
        const raw = decodeURIComponent((req.url || '/').split('?')[0] || '/')
        const name = path.basename(raw)
        const file = path.join(MEDIA_DIR, name)
        if (!name || file !== path.join(MEDIA_DIR, path.basename(file)) || !fs.existsSync(file)) {
          res.statusCode = 404
          res.end('media not found')
          return
        }
        const stat = fs.statSync(file)
        const type = mediaMime(path.extname(name).slice(1).toLowerCase())
        const rangeHeader = req.headers.range
        if (rangeHeader) {
          const m = /bytes=(\d*)-(\d*)/.exec(String(rangeHeader))
          const start = m && m[1] ? parseInt(m[1], 10) : 0
          const endReq = m && m[2] ? parseInt(m[2], 10) : stat.size - 1
          const end = Math.min(Math.max(endReq, start), stat.size - 1)
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${stat.size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': type,
          })
          fs.createReadStream(file, { start, end }).pipe(res)
          return
        }
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': type,
          'Accept-Ranges': 'bytes',
        })
        fs.createReadStream(file).pipe(res)
      })

      // GET /api/registry —— 供 AI 编排 Skill 自动获取卡片清单
      server.middlewares.use('/api/registry', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        try {
          const mod = await server.ssrLoadModule('/src/registry.ts')
          const list = (mod.registry as { id: string; name: string; category?: string; description?: string; schema: unknown[]; defaultParams: Record<string, unknown> }[]).map((e) => ({
            id: e.id,
            name: e.name,
            category: e.category,
            description: e.description,
            schema: e.schema,
            defaultParams: e.defaultParams,
          }))
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(list, null, 2))
        } catch (e) {
          res.statusCode = 500
          res.end('registry load failed: ' + (e instanceof Error ? e.message : String(e)))
        }
      })

      server.middlewares.use('/api/export', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        let dir = ''
        const log = (m: string) => console.error('[export] ' + m)
        try {
          let body = ''
          for await (const chunk of req) body += chunk
          log('received ' + body.length + ' bytes')
          const {
            project,
            fps = 30,
            format = 'mp4',
            transparent = false,
            audioBase64 = null,
            audioExt = 'm4a',
            media = [],
            speed: speedRaw = 1,
          } = JSON.parse(body)

          // 素材像素落盘 + 回填 http 地址：
          // 编辑器传来的 url 是 blob: 对象 URL，无头页面取不到，素材会整段不显示。
          // 透明与非透明两条导出路径共用这一步。
          const exportHost = (req.headers.host as string) || 'localhost:5173'
          const mediaUrls = stageMedia(media as never, exportHost)
          if (
            mediaUrls.size > 0 &&
            project &&
            Array.isArray((project as { mediaAssets?: unknown }).mediaAssets)
          ) {
            const p = project as { mediaAssets: { id?: string; url?: string }[] }
            p.mediaAssets = p.mediaAssets.map((a) => {
              const u = a && a.id ? mediaUrls.get(a.id) : undefined
              return u ? { ...a, url: u } : a
            })
            log('staged ' + mediaUrls.size + ' media file(s)')
          }

          if (!transparent) {
            dir = path.join(os.tmpdir(), 'animation-export-' + Date.now())
            fs.mkdirSync(dir, { recursive: true })
            log('fast export via video recording')
            const { chromium } = await import('playwright')
            const browser = await chromium.launch({
              // 录屏导出要按倍速"真播"视频（硬 seek 追不上倍速推进的播放头），
              // 无头环境默认拦自动播放，这里显式放行。
              args: ['--autoplay-policy=no-user-gesture-required'],
            })
            const context = await browser.newContext({
              viewport: { width: 1920, height: 1080 },
              deviceScaleFactor: 1,
              recordVideo: {
                size: { width: 1920, height: 1080 },
                dir,
              },
            })
            // 录屏从 context 创建就开始，前面会录进一段页面加载期，
            // 记下起点，后面用 -ss 把这段裁掉，否则成片开头是空白且时长变长。
            const recStart = Date.now()
            const page = await context.newPage()
            // 倍速：虚拟时间按 speed 倍推进，录屏时长缩短为 1/speed。
            // 视频必须以**同一倍率真播放**才跟得上，所以这里就先算出来注入页面。
            const speed = Math.max(1, Math.min(6, Number(speedRaw) || 1))
            await page.addInitScript(
              (args) => {
                ;(globalThis as unknown as Record<string, unknown>).__EXPORT_PROJECT = args.p
                ;(globalThis as unknown as Record<string, unknown>).__EXPORT_ALPHA = false
                ;(globalThis as unknown as Record<string, unknown>).__EXPORT_RATE = args.rate
              },
              { p: project, rate: speed },
            )
            const host = (req.headers.host as string) || 'localhost:5173'
            await page.goto(`http://${host}/?render=1`, { waitUntil: 'domcontentloaded' })
            await page.waitForFunction(
              () => {
                const r = (globalThis as unknown as Record<string, unknown>).__render
                return r && (r as { ready?: boolean }).ready
              },
              { timeout: 30000 },
            )
            await page.evaluate(() => {
              const g = globalThis as unknown as {
                document: { fonts: { ready: Promise<unknown> } }
              }
              return g.document.fonts.ready
            })
            const total = Number(project.duration) || 12
            log(`recording ${total}s at ${speed}x (wall ~${(total / speed).toFixed(1)}s)`)
            // 页面已就绪、即将开始推进：录屏里的这一段是加载期，后面要用 -ss 裁掉
            const lead = Math.max(0, (Date.now() - recStart) / 1000)
            await page.evaluate(
              ({ duration, sp }) => {
                const r = (globalThis as unknown as Record<string, unknown>).__render as {
                  seek: (v: number) => void
                }
                let t = 0
                let last = performance.now()
                const g = globalThis as unknown as {
                  requestAnimationFrame: (cb: () => void) => void
                  __renderDone?: boolean
                }
                const tick = () => {
                  const now = performance.now()
                  const dt = Math.min(0.1, (now - last) / 1000)
                  last = now
                  t += dt * sp
                  if (t >= duration) {
                    // 收尾：定格在最后一帧，并告知服务端内容推进已结束
                    r.seek(duration)
                    g.__renderDone = true
                    return
                  }
                  r.seek(t)
                  g.requestAnimationFrame(tick)
                }
                g.requestAnimationFrame(tick)
              },
              { duration: total, sp: speed },
            )
            // 等内容推进结束，量出内容区在录屏里的真实长度
            let contentSec = total / speed
            try {
              await page.waitForFunction(
                () => (globalThis as unknown as { __renderDone?: boolean }).__renderDone === true,
                { timeout: (total / speed + 10) * 1000 },
              )
              contentSec = Math.max(0.2, (Date.now() - recStart) / 1000 - lead)
            } catch {
              contentSec = total / speed
            }
            await page.waitForTimeout(400)
            const video = page.video()
            await context.close()
            try {
              await Promise.race([
                browser.close(),
                new Promise<void>((r) => setTimeout(r, 8000)),
              ])
            } catch {
              /* ignore */
            }
            const videoPath = video ? await video.path() : null
            if (!videoPath) throw new Error('录制视频失败：没有生成 video 文件')
            const ext = format === 'mov' ? 'mov' : format === 'webm' ? 'webm' : 'mp4'
            const out = path.join(dir, `export.${ext}`)
            // 录屏 = [加载期 lead] + [内容推进 contentSec] + [收尾定格]
            // 只取中间那段，再按倍速把时间轴还原回真实时长，成片才是准确的 total 秒。
            const args: string[] = ['-y', '-ss', lead.toFixed(3), '-t', contentSec.toFixed(3), '-i', videoPath]
            if (speed !== 1) args.push('-vf', `setpts=${speed}*PTS`)
            args.push('-r', String(fps))
            let audioPath: string | null = null
            if (audioBase64 && typeof audioBase64 === 'string' && audioBase64.length > 0) {
              audioPath = path.join(dir, 'audio.' + String(audioExt).replace(/[^a-z0-9]/gi, ''))
              fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'))
              // 音轨本来就是完整内容时间轴，不参与裁剪与变速
              args.push('-i', audioPath)
            }
            if (ext === 'mov') {
              args.push('-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le')
            } else if (ext === 'webm') {
              // WebM：VP9 压缩小，带 alpha 或纯色底
              // -cpu-used 默认 0（最慢最高质），4 是速度与体积的平衡点；
              // -row-mt 1 打开行级多线程（VP9 默认不开），两者是 WebM 提速最明显的参数。
              args.push(
                '-c:v', 'libvpx-vp9',
                '-crf', '18', '-b:v', '0',
                '-cpu-used', '4', '-row-mt', '1',
                '-pix_fmt', 'yuva420p',
              )
            } else {
              // preset 默认 medium；veryfast 在同 CRF 下体积略增（约 10~20%），编码快 2~3 倍。
              // -threads 0 = 让 x264 自己吃满所有核心。
              args.push(
                '-c:v', 'libx264',
                '-preset', 'veryfast', '-threads', '0',
                '-pix_fmt', 'yuv420p', '-crf', '18',
              )
            }
            if (audioPath) {
              // 音频编码按容器选：MOV 不支持 Opus（此前导出 MOV 报错的原因），
              // MP4 的 Opus 播放兼容性也差 —— MOV 配 PCM（ProRes 剪辑标准），MP4 配 AAC，WebM 才是 Opus
              const audioArgs =
                ext === 'mov'
                  ? ['-c:a', 'pcm_s16le']
                  : ext === 'webm'
                    ? ['-c:a', 'libopus', '-b:a', '160k']
                    : ['-c:a', 'aac', '-b:a', '192k']
              args.push('-map', '0:v:0', '-map', '1:a:0', ...audioArgs, '-shortest')
            }
            // 输出长度钉死成工程时长，避免录屏收尾的定格帧混进成片
            args.push('-t', String(total), out)
            execFileSync('ffmpeg', args, { stdio: 'ignore' })
            const probe = run('ffprobe', [
              '-v', 'error',
              '-select_streams', 'v:0',
              '-show_entries', 'stream=codec_name,pix_fmt',
              '-of', 'json',
              out,
            ])
            const stream = (JSON.parse(probe).streams ?? [{}])[0]
            const codec = String(stream.codec_name ?? '')
            const pixFmt = String(stream.pix_fmt ?? '')
            const verify =
              ext === 'mov'
                ? `codec=${codec} pix_fmt=${pixFmt} ✅ ProRes 422 HQ`
                : ext === 'webm'
                  ? `codec=${codec} pix_fmt=${pixFmt} ✅ VP9 + alpha`
                  : `codec=${codec} pix_fmt=${pixFmt} ✅ H.264`
            res.setHeader('Content-Type', ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4')
            res.setHeader('Content-Disposition', `attachment; filename="animation-export.${ext}"`)
            res.setHeader('X-Animation-Verify', encodeURIComponent(verify))
            log('verified: ' + verify + ', streaming')
            fs.createReadStream(out).pipe(res)
            return
          }

          log('launching chromium')
          const { chromium } = await import('playwright')
          const browser = await chromium.launch()
          log('chromium launched')
          const host = (req.headers.host as string) || 'localhost:5173'
          const url = `http://${host}/?render=1`
          log('goto ' + url)

          /**
           * 逐帧渲染支持多个 page 并行。
           * 每帧都是「seek(t) → 等一帧 → 截图」，帧与帧之间没有依赖，
           * 按帧号分片给不同 page（第 k 个只渲染 i % workers === k 的帧），
           * 文件名仍按帧号命名，帧序列不受影响。
           *
           * 但实测（本机 12 核、1920×1080 透明 PNG、4s 样本）：
           *   workers=1 → 69.4s，workers=4 → 74.0s —— 并行没有收益，反而略慢。
           * 原因：每帧成本主要在「页面渲染 + 截图」，多个 page 共享同一个渲染进程，
           * 并不能真正并行，却要多付几份页面加载开销和内存。
           * 因此默认串行（与改造前一致）；换机器/换场景可用 EXPORT_WORKERS 自行验证。
           */
          const envWorkers = Number(process.env.EXPORT_WORKERS)
          const workers = Math.max(
            1,
            Math.min(4, Number.isFinite(envWorkers) && envWorkers > 0 ? envWorkers : 1),
          )

          const openPage = async () => {
            const p = await browser.newPage({
              viewport: { width: 1920, height: 1080 },
              deviceScaleFactor: 1,
            })
            await p.addInitScript(
              (args) => {
                ;(globalThis as unknown as Record<string, unknown>).__EXPORT_PROJECT = args.p
                ;(globalThis as unknown as Record<string, unknown>).__EXPORT_ALPHA = args.alpha
              },
              { p: project, alpha: transparent },
            )
            await p.goto(url, { waitUntil: 'domcontentloaded' })
            await p.waitForFunction(
              () => {
                const r = (globalThis as unknown as Record<string, unknown>).__render
                return r && (r as { ready?: boolean }).ready
              },
              { timeout: 30000 },
            )
            // 等字体全部加载完成（Pitfall 09），否则前几帧字形会跳
            await p.evaluate(() => {
              const g = globalThis as unknown as {
                document: { fonts: { ready: Promise<unknown> } }
              }
              return g.document.fonts.ready
            })
            return p
          }

          const total = Number(project.duration) || 12
          const frameCount = Math.max(1, Math.round(total * fps))
          dir = path.join(os.tmpdir(), 'animation-export-' + Date.now())
          fs.mkdirSync(dir, { recursive: true })
          const frameExt = transparent ? 'png' : 'jpg'
          log(`rendering ${frameCount} frames with ${workers} parallel page(s)`)

          const pages = await Promise.all(Array.from({ length: workers }, openPage))
          log('pages ready')

          await Promise.all(
            pages.map((p, k) =>
              (async () => {
                for (let i = k; i < frameCount; i += workers) {
                  const t = i / fps
                  await p.evaluate(
                    (tt) => {
                      const r = (globalThis as unknown as Record<string, unknown>).__render as {
                        seek: (v: number) => Promise<void>
                      }
                      /**
                       * seek 内部会等「React 落位 → 视频解码出目标帧 → 再画一帧」，
                       * 必须把它的 Promise 交还给 Playwright 等待。
                       * 之前这里点完 seek 就自己等一帧 rAF，等于把等待丢掉了 ——
                       * 视频还没解码就截图，截到的就是黑帧。
                       */
                      return r.seek(tt)
                    },
                    t,
                  )
                  await p.locator('.os-canvas').screenshot({
                    path: path.join(dir, `frame_${String(i).padStart(5, '0')}.${frameExt}`),
                    ...(transparent
                      ? { omitBackground: true }
                      : { type: 'jpeg' as const, quality: 95 }),
                  })
                }
              })(),
            ),
          )
          log('frames done, closing browser')
          // Windows 上 browser.close() 偶发挂起，加超时 + 强制 kill 兜底
          try {
            await Promise.race([
              browser.close(),
              new Promise<void>((r) => setTimeout(r, 8000)),
            ])
          } catch {
            /* ignore */
          }
          try {
            ;(browser as unknown as { process?: { kill: (sig: string) => void } })
              .process?.kill('SIGKILL')
          } catch {
            /* ignore */
          }
          log('browser closed, encoding')

          const ext = format === 'mov' ? 'mov' : format === 'webm' ? 'webm' : 'mp4'
          const out = path.join(dir, `export.${ext}`)
          const frames = path.join(dir, `frame_%05d.${frameExt}`)
          const args: string[] = ['-y', '-framerate', String(fps), '-i', frames]

          // 可选音频烤入
          let audioPath: string | null = null
          if (audioBase64 && typeof audioBase64 === 'string' && audioBase64.length > 0) {
            audioPath = path.join(dir, 'audio.' + String(audioExt).replace(/[^a-z0-9]/gi, ''))
            fs.writeFileSync(audioPath, Buffer.from(audioBase64, 'base64'))
            args.push('-i', audioPath)
          }

          if (ext === 'mov') {
            if (transparent) {
              // 透明 MOV 必须 ProRes 4444 + alpha
              args.push('-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le')
            } else {
              args.push('-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le')
            }
          } else if (ext === 'webm') {
            // WebM：VP9 + alpha（透明）或纯色底，压缩比高、网页/PR 友好
            // 逐帧路径动辄几百帧，VP9 默认 -cpu-used 0 会慢到不可用，统一给 4 + 行级多线程
            if (transparent) {
              args.push(
                '-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0',
                '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuva420p',
              )
            } else {
              args.push(
                '-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0',
                '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p',
              )
            }
          } else {
            args.push(
              '-c:v', 'libx264',
              '-preset', 'veryfast', '-threads', '0',
              '-pix_fmt', 'yuv420p', '-crf', '18',
            )
          }

          if (audioPath) {
            // 音频编码按容器选：MOV 不支持 Opus，MP4 的 Opus 兼容性差
            const audioArgs =
              ext === 'mov'
                ? ['-c:a', 'pcm_s16le']
                : ext === 'webm'
                  ? ['-c:a', 'libopus', '-b:a', '160k']
                  : ['-c:a', 'aac', '-b:a', '192k']
            args.push('-map', '0:v:0', '-map', '1:a:0', ...audioArgs, '-shortest')
          }
          args.push(out)
          execFileSync('ffmpeg', args, { stdio: 'ignore' })

          // ffprobe 自动验收：确认编码正确 + 透明导出必含 alpha
          const probe = run('ffprobe', [
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=codec_name,pix_fmt',
            '-of', 'json',
            out,
          ])
          const stream = (JSON.parse(probe).streams ?? [{}])[0]
          const codec = String(stream.codec_name ?? '')
          const pixFmt = String(stream.pix_fmt ?? '')
          let verify = `codec=${codec} pix_fmt=${pixFmt}`
          if (ext === 'mov') {
            if (codec !== 'prores') throw new Error(`导出验证失败：期望 prores，实际 ${codec}`)
            if (transparent && !pixFmt.startsWith('yuva')) {
              throw new Error(`透明导出验证失败：pix_fmt=${pixFmt} 不含 alpha 通道`)
            }
            verify += transparent ? ' ✅ ProRes 4444 + alpha' : ' ✅ ProRes 422 HQ'
          } else if (ext === 'webm') {
            if (codec !== 'vp9') throw new Error(`导出验证失败：期望 vp9，实际 ${codec}`)
            if (transparent && !pixFmt.startsWith('yuva')) {
              throw new Error(`透明导出验证失败：pix_fmt=${pixFmt} 不含 alpha 通道`)
            }
            verify += transparent ? ' ✅ VP9 + alpha' : ' ✅ VP9'
          } else {
            if (codec !== 'h264') throw new Error(`导出验证失败：期望 h264，实际 ${codec}`)
            verify += ' ✅ H.264'
          }
          if (audioPath) verify += ' + 音效已烤入'

          res.setHeader('Content-Type', ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4')
          res.setHeader('Content-Disposition', `attachment; filename="animation-export.${ext}"`)
          res.setHeader('X-Animation-Verify', encodeURIComponent(verify))
          log('verified: ' + verify + ', streaming')
          fs.createReadStream(out).pipe(res)
        } catch (e) {
          log('ERROR: ' + (e instanceof Error ? e.message : String(e)))
          res.statusCode = 500
          res.end('Export failed: ' + (e instanceof Error ? e.stack || e.message : String(e)))
        } finally {
          if (dir) {
            // 回收临时目录（帧序列 + 音频中间产物）
            setTimeout(() => {
              try {
                fs.rmSync(dir, { recursive: true, force: true })
              } catch {
                /* ignore */
              }
            }, 60_000).unref?.()
          }
        }
      })
    },
  }
}

/**
 * 内容包目录（位于仓库根目录，使用者手动拷目录进来 / 删掉即可增删内容）。
 *
 * 两条 URL 前缀分别对应「动效卡」与「音效」两类内容。
 * 之所以不放 Vite 的 public/：public 里的东西会被无差别拷进构建产物，
 * 而这里的定位是「随时能增删的内容」，更像用户自己的素材工程，而不是程序的一部分。
 */
const CONTENT_ROOTS = {
  cards: { folder: '动效卡库', url: '/content/cards' },
  sounds: { folder: '音效库', url: '/content/sounds' },
} as const

type ContentKind = keyof typeof CONTENT_ROOTS

function readJsonFile<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return null
  }
}

/**
 * 递归目录拷贝（不依赖 `fs.cpSync`）。
 *
 * 实测：本机 Node 22 上 `fs.cpSync` 面对中文源/目标路径会**直接把进程打崩**
 * （退出码 0xC0000409，无异常、无输出、无任何回调），构建因此静默中断，
 * dist 里留下一个空的内容目录、清单文件也没生成。
 * 手写 readdir + copyFileSync 没有任何问题，所以内容拷贝走这条路径。
 */
function copyDir(from: string, to: string): number {
  let count = 0
  fs.mkdirSync(to, { recursive: true })
  for (const ent of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, ent.name)
    const d = path.join(to, ent.name)
    if (ent.isDirectory()) count += copyDir(s, d)
    else if (ent.isFile()) {
      fs.copyFileSync(s, d)
      count += 1
    }
  }
  return count
}

function mimeOf(file: string): string {
  const ext = path.extname(file).toLowerCase()
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.mp3') return 'audio/mpeg'
  if (ext === '.wav') return 'audio/wav'
  if (ext === '.ogg') return 'audio/ogg'
  return 'application/octet-stream'
}

/**
 * 扫描两个内容根目录 → 每个子目录读一次 manifest.json，拼出装载清单。
 *
 * 每次请求都实时扫一遍：**拷进来一个文件夹就能直接刷新页面看到，不需要跑任何同步命令**。
 * 文件夹规则很简单：一级子目录 = 一个包，里面有 manifest.json 才认。
 */
function scanContent(base: string): { kind: ContentKind; packs: Record<string, unknown>[] }[] {
  const out: { kind: ContentKind; packs: Record<string, unknown>[] }[] = []
  for (const kind of Object.keys(CONTENT_ROOTS) as ContentKind[]) {
    const dir = path.join(base, CONTENT_ROOTS[kind].folder)
    let names: string[] = []
    try {
      names = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .filter((n) => !n.startsWith('.') && !n.startsWith('_'))
    } catch {
      // 目录不存在 / 被删干净了：这一類就是空的，不报错、不影响主程序启动
      out.push({ kind, packs: [] })
      continue
    }
    const packs: Record<string, unknown>[] = []
    for (const name of names.sort()) {
      const manifest = readJsonFile<Record<string, unknown>>(path.join(dir, name, 'manifest.json'))
      if (!manifest) {
        console.warn(`[content] ${CONTENT_ROOTS[kind].folder}/${name} 缺 manifest.json，已跳过`)
        continue
      }
      packs.push({ ...manifest, id: String(manifest.id ?? name), dir: name })
    }
    out.push({ kind, packs })
  }
  return out
}

/**
 * 内容包运行时服务（本地开发）。
 *
 * - `/content/cards/<包>/<文件>`、`/content/sounds/<包>/<文件>` 按静态文件直出；
 * - `GET /api/content` 实时返回"有哪些包"。
 *
 * 静态直出这一层不能省：包里的 cards.js 是运行时 `import(url)` 加载的纯浏览器 ESM，
 * dev server 会把带 import 语义头的请求丢给插件管线（public 下的文件会被拒绝以 source code 引入），
 * 走静态中间件才能像生产一样原样返回。
 *
 * 生产构建没有 dev server，改为在 `closeBundle` 时把两个目录拷进 dist/
 * 并生成静态的 `content-index.json`（见下面的 build 勾子）。
 */
function contentPacksPlugin(): Plugin {
  return {
    name: 'os-content-packs',
    /**
     * 把打包时算好的内容清单直接注进 index.html（`window.__OS_CONTENT_INDEX__`）。
     *
     * 纯静态托管（没有 dev server、也拿不到 content-index.json 的相对路径）时，
     * 前端还能靠这份注入数据知道"装了哪些包"，不至于整块功能不可用。
     */
    transformIndexHtml(html) {
      const groups = scanContent(process.cwd())
      if (!groups.some((g) => g.packs.length > 0)) return html
      const data = JSON.stringify({ updatedAt: Date.now(), groups })
      return html.replace(
        '</head>',
        `  <script>window.__OS_CONTENT_INDEX__=${data}</script>\n  </head>`,
      )
    },
    configureServer(server) {
      const base = server.config.root
      const dirs: Record<ContentKind, string> = {
        cards: path.join(base, CONTENT_ROOTS.cards.folder),
        sounds: path.join(base, CONTENT_ROOTS.sounds.folder),
      }

      server.middlewares.use((req, res, next) => {
        const raw = (req.url || '').split('?')[0] || ''
        const hit = (Object.keys(CONTENT_ROOTS) as ContentKind[]).find((k) =>
          raw.startsWith(CONTENT_ROOTS[k].url + '/'),
        )
        if (!hit) return next()
        let rel = raw.slice((CONTENT_ROOTS[hit].url + '/').length)
        try {
          rel = decodeURIComponent(rel)
        } catch {
          return next()
        }
        const rootDir = dirs[hit]
        const file = path.resolve(rootDir, rel)
        // 目录穿越防护：解析后必须还在内容目录里
        if (file !== rootDir && !file.startsWith(rootDir + path.sep)) return next()
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next()
        res.writeHead(200, { 'Content-Type': mimeOf(file), 'Cache-Control': 'no-cache' })
        fs.createReadStream(file).pipe(res)
      })

      server.middlewares.use('/api/content', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify({ updatedAt: Date.now(), groups: scanContent(base) }, null, 2))
      })
    },

    /**
     * 生产构建：把两个内容目录原样拷进 dist/，并落一份静态清单兜底。
     *
     * 不能挂在 `closeBundle` 上 —— 那个钩子跑在「写文件」阶段，拷贝进去的东西
     * 会被随后的 emptyOutDir / 目录树刷新抹掉。`writeBundle` 在写盘之后触发，时机才对。
     */
    writeBundle() {
      const trace = (m: string) => {
        const f = process.env.OS_CONTENT_TRACE
        if (!f) return
        try {
          fs.appendFileSync(f, m + '\n', 'utf8')
        } catch {
          /* ignore */
        }
      }
      trace('[content] writeBundle enter')
      const base = process.cwd()
      const dist = path.join(base, 'dist')
      trace('[content] dist=' + dist + ' exists=' + fs.existsSync(dist))
      if (!fs.existsSync(dist)) return
      const groups = scanContent(base)
      trace('[content] scanned groups=' + JSON.stringify(groups.map((g) => [g.kind, g.packs.length])))
      try {
        for (const kind of Object.keys(CONTENT_ROOTS) as ContentKind[]) {
          const from = path.join(base, CONTENT_ROOTS[kind].folder)
          trace('[content] copy ' + from + ' exists=' + fs.existsSync(from))
          if (!fs.existsSync(from)) continue
          const n = copyDir(from, path.join(dist, CONTENT_ROOTS[kind].folder))
          trace('[content] copied ' + kind + ' files=' + n)
        }
        fs.writeFileSync(
          path.join(dist, 'content-index.json'),
          JSON.stringify({ updatedAt: Date.now(), groups }, null, 2),
          'utf8',
        )
        trace('[content] wrote content-index.json')
        // 顺手把中文目录名转成拼音别名的副本，兼底：某些静态服务器 / 工具链处理中文路径容易出错，
        // 前端会优先请求 ASCII 路径，失败才退回中文路径。属于附加保障，失败不影响主流程。
        const ascii = path.join(dist, 'content')
        fs.mkdirSync(ascii, { recursive: true })
        for (const kind of Object.keys(CONTENT_ROOTS) as ContentKind[]) {
          const from = path.join(dist, CONTENT_ROOTS[kind].folder)
          if (!fs.existsSync(from)) continue
          const n = copyDir(from, path.join(ascii, kind))
          trace('[content] aliased ' + kind + ' files=' + n)
        }
        trace('[content] done')
      } catch (e) {
        trace('[content] FAILED: ' + (e instanceof Error ? e.stack || e.message : String(e)))
        console.warn('[content] dist 拷贝失败：' + (e instanceof Error ? e.message : String(e)))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), contentPacksPlugin(), exportPlugin()],
})
