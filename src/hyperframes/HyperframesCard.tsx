import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { EffectProps, ParamSchema, Params } from '../types'
import { hyperframesTemplates, hyperframesTemplateMap } from './generated'
import { hfModes } from './modes'
import { hfContentSelectors } from './selectors'

/**
 * 桥接注入脚本：把本工作台的 params 通过 window.__hyperframes.getVariables()
 * 喂给模板，并把工作台 progress（0~1）换算成模板动画 timeline 的 progress（0~1）。
 * 用 tl.progress 而非 tl.seek：paused timeline 的 seek 不触发 onUpdate，
 * 而 progress() 会同步渲染当前帧（数字滚动、描边等动画在 seek 模式下会卡 0）。
 */
function buildBridgeScript(templateId: string, params: Params, frozenFit: number) {
  const paramsJson = JSON.stringify(params)
  const sel = hfContentSelectors[templateId]
  const frameSel = sel?.frame?.length ? sel.frame[0] : null
  return `
    <script>
      (function () {
        var params = ${paramsJson};
        var frameSel = ${JSON.stringify(frameSel)};
        // 单卡透明度（params.__cardOpacity）优先，其次工程级 __stageCardOpacity
        var cardOpacity = (typeof params.__cardOpacity === 'number' ? params.__cardOpacity : null)
          || (window.parent && window.parent.__stageCardOpacity) || 0.65;
        document.documentElement.style.setProperty('--cardOpacity', String(cardOpacity));
        var style = document.createElement('style');
        style.textContent = 'html[data-export-mode="transparent"] #root,html[data-export-mode="transparent"] .scene{background:transparent!important} html[data-export-mode="transparent"] .panel,html[data-export-mode="transparent"] .item,html[data-export-mode="transparent"] .card,html[data-export-mode="transparent"] .box,html[data-export-mode="transparent"] .backdrop{background:color-mix(in srgb,#12100E calc(var(--cardOpacity,0.65)*100%),transparent)!important}';
        document.head.appendChild(style);
        window.__hyperframes = {
          getVariables: function () { return params; }
        };
        // 透明导出（叠加到视频）：强制模板的 html,body 全屏深色底透明，
        // 让卡片内容（数字/文字/图形）可见、背景透明，便于叠加到视频上。
        // 注意：不要切换 data-export-mode（模板的 transparent 模式会隐藏内容，
        // 全屏黑底由外层 .os-render-root + omitBackground 解决）。
        (function applyExportAlpha() {
          try {
            var alpha = !!(window.parent && window.parent.__EXPORT_ALPHA);
            if (!alpha) return;
            var s = document.createElement('style');
            s.setAttribute('data-hf-alpha', '');
            s.textContent = 'html,body{background:transparent!important;}';
            (document.head || document.documentElement).appendChild(s);
          } catch (e) { /* noop */ }
        })();
        // 内容适配：把模板里真实内容面板按固定比例放大到可读尺寸。
        // 比例只在首次测量后固定，之后文案变化不会导致卡片尺寸跳动。
        (function applyContentFit() {
          if (!frameSel) return;
          // 透明导出时保持模板原生布局，避免内容被放大后遮挡底层视频。
          if (window.parent && window.parent.__EXPORT_ALPHA) return;
          var zoom = ${JSON.stringify(frozenFit)} || 0;
          function apply() {
            var root = document.getElementById('root');
            var frame = document.querySelector(frameSel);
            if (!root || !frame) return;
            var r = frame.getBoundingClientRect();
            if (!(r.width > 1 && r.height > 1)) return;
            if (!zoom) {
              zoom = Math.max(1, Math.min(2.4, Math.min(1540 / r.width, 860 / r.height)));
            }
            var tx = 960 / zoom - (r.left + r.width / 2);
            var ty = 540 / zoom - (r.top + r.height / 2);
            root.style.transformOrigin = '0 0';
            root.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + zoom + ')';
          }
          try {
            // 桥接脚本注入在 <head>，模板业务脚本稍后才填充内容；
            // 等一帧再测量，确保内容面板已经按 params 渲染完成。
            setTimeout(apply, 60);
          } catch (e) { /* noop */ }
          if (${JSON.stringify(frozenFit)} <= 1) {
            setTimeout(function () {
              var frame = document.querySelector(frameSel);
              if (!frame) return;
              var r = frame.getBoundingClientRect();
              if (r.width > 1 && r.height > 1) {
                var payload = { __hf: '${templateId}', type: 'frameRect', rect: { w: r.width, h: r.height } };
                (window.parent && window.parent.postMessage ? window.parent : window).postMessage(payload, '*');
              }
            }, 120);
          }
        })();
        // 接收父窗口的进度驱动
        window.addEventListener('message', function (e) {
          var d = e.data;
          if (!d || d.__hf !== '${templateId}') return;
          if (d.type === 'seek') {
            var tl = window.__timelines && window.__timelines.main;
            if (tl && tl.progress) tl.progress(Math.max(0, Math.min(1, d.p)));
          }
        });
      })();
    </script>`
}

/**
 * HyperFrames 模板桥接卡：用 iframe srcDoc 渲染内联的模板 HTML，
 * 通过 postMessage 同步进度、通过注入的 getVariables 传参。
 * params 变化 → 重建 srcDoc（模板重新读变量）。
 *
 * fill=true 时渲染为铺满容器（全屏模式，无卡片装饰）；
 * fill=false（默认）渲染为 16:9 自适应卡片（预览/局部叠加用）。
 */
export function HyperframesCard({
  templateId,
  params,
  progress,
  fill = false,
}: {
  templateId: string
  params: Params
  progress: number
  fill?: boolean
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [cardScale, setCardScale] = useState(880 / 1920)
  const [fitVersion, setFitVersion] = useState(0)
  const fitRef = useRef(1)
  const progressRef = useRef(progress)
  progressRef.current = progress

  const template = hyperframesTemplateMap.get(templateId)

  // 单卡背景透明度：不参与 srcDoc 重建（否则拖滑杆会疯狂重载 iframe），
  // 改为加载后直接写进 iframe 文档的 --cardOpacity。
  const cardOpacity = typeof params.__cardOpacity === 'number' ? params.__cardOpacity : null
  const { __cardOpacity: _dropOpacity, ...publicParams } = params
  const publicParamsKey = JSON.stringify(publicParams)

  // 内联模板 HTML + 桥接脚本（随模板一起缓存，params 变化才重建）
  const srcDoc = useMemo(
    () => {
      if (!template?.html) return null
      const bridge = buildBridgeScript(templateId, JSON.parse(publicParamsKey), fitRef.current)
      const html = template.html
      if (html.includes('</head>')) {
        return html.replace('</head>', bridge + '</head>')
      }
      return bridge + html
    },
    // 透明度不参与重建，避免拖动滑杆时 iframe 反复重载
    [template, templateId, publicParamsKey, fitVersion],
  )

  useEffect(() => {
    if (cardOpacity == null) return
    const doc = iframeRef.current?.contentDocument
    if (doc) doc.documentElement.style.setProperty('--cardOpacity', String(cardOpacity))
  }, [cardOpacity, loaded, srcDoc])

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const measure = () => {
      if (el.clientWidth > 1 && el.clientHeight > 1) {
        setCardScale(Math.min(el.clientWidth / 1920, el.clientHeight / 1080))
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 首次收到模板内容面板尺寸后固定适配比例，后续文案变化不再重算
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const d = e.data
      if (!d || d.__hf !== templateId || d.type !== 'frameRect' || !d.rect) return
      if (fitRef.current > 1) return
      const zoom = Math.max(
        1,
        Math.min(2.4, Math.min(1540 / d.rect.w, 860 / d.rect.h)),
      )
      fitRef.current = zoom
      setFitVersion((v) => v + 1)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [templateId])

  const pushSeek = useCallback(
    (p: number) => {
      const iframe = iframeRef.current
      iframe?.contentWindow?.postMessage({ __hf: templateId, type: 'seek', p }, '*')
    },
    [templateId],
  )

  // iframe onLoad = 模板业务脚本已执行完毕，__timelines.main 已就绪 → 对齐进度
  const onLoad = useCallback(() => {
    setLoaded(true)
    pushSeek(progressRef.current)
  }, [pushSeek])

  // 进度同步：seek 到模板时间线
  useEffect(() => {
    if (!loaded || !srcDoc) return
    pushSeek(progress)
  }, [progress, loaded, srcDoc, pushSeek])

  if (!srcDoc) {
    return (
      <div style={{ width: '100%', padding: 18, color: 'var(--stage-text-muted)', fontSize: 14 }}>
        模板 {templateId} 未找到（缺少内联 HTML）
      </div>
    )
  }

  // 全屏模式：铺满容器、无卡片装饰（模板自带 1920×1080 全屏背景与排版）
  if (fill) {
    return (
      <div
        ref={cardRef}
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          title={templateId}
          onLoad={onLoad}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            height: 1080,
            border: 'none',
            transform: `scale(${cardScale})`,
            transformOrigin: '0 0',
          }}
          allow="autoplay"
        />
        {!loaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              color: 'var(--stage-text-muted)',
              fontSize: 13,
            }}
          >
            模板加载中…
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={cardRef}
      className="os-card"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        overflow: 'hidden',
        borderRadius: 10,
        padding: 0,
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title={templateId}
        onLoad={onLoad}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          border: 'none',
          transform: `scale(${cardScale})`,
          transformOrigin: '0 0',
        }}
        allow="autoplay"
      />
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            color: 'var(--stage-text-muted)',
            fontSize: 13,
          }}
        >
          模板加载中…
        </div>
      )}
    </div>
  )
}

/** 供 registry 使用的 EffectProps 适配组件 */
export function makeHyperframesEffect(templateId: string) {
  function HyperframesEffectComp({ params, progress, isPreview }: EffectProps) {
    // 全屏模式：模板登记为 fullscreen 且未自由定位时铺满画布（预览小窗保持卡片式）
    const isFullscreen = hfModes[templateId]?.default === 'fullscreen' || hfModes[templateId]?.allowed?.includes('fullscreen')
    // 透明导出（叠加到视频）：不要提取/放大内容填满画布，否则卡片整屏不透明会遮住视频。
    // 改为按模板原生 1920×1080 渲染（画布其余部分透明，露出底层视频），让小卡片自然叠加。
    const isExportAlpha = typeof window !== 'undefined' && !!(window as { __EXPORT_ALPHA?: boolean }).__EXPORT_ALPHA
    const fill = isPreview ? false : isFullscreen && !isExportAlpha
    return <HyperframesCard templateId={templateId} params={params} progress={progress} fill={fill} />
  }
  HyperframesEffectComp.displayName = `Hyperframes(${templateId})`
  return HyperframesEffectComp
}

/** 导出全部模板定义（供 registry / 动效库展示） */
export { hyperframesTemplates }

export type { ParamSchema }
