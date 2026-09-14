import { StrictMode } from 'react'
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

/**
 * 拓展包要用 React 写卡片组件，但包是运行时 `import(url)` 加载的纯浏览器模块，
 * 解析不了 `import React from 'react'` 这种裸包名 —— 由主程序把 React 挂到全局给它用。
 * 类型声明统一放在 src/packRuntime.ts（避免两处声明打架），见 public/packs/README.md。
 */
;(window as Window & { __OS_WORKBENCH__?: { React: unknown; version: string } }).__OS_WORKBENCH__ = {
  React,
  version: '1.0',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
