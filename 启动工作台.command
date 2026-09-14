#!/usr/bin/env bash
# 动效编辑台一键启动（macOS / Linux）
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 没有检测到 Node.js。"
  echo "       请先安装 Node.js 20 或更高版本：https://nodejs.org/"
  read -r -p "按回车键关闭..." _
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "首次运行，正在安装依赖（约 1-3 分钟，只需一次）..."
  echo
  if ! npm install; then
    echo
    echo "[错误] 依赖安装失败。常见原因："
    echo "       1. 网络不通 —— 可先切换国内镜像再试："
    echo "          npm config set registry https://registry.npmmirror.com"
    echo "       2. Node.js 版本过低 —— 需要 20 或更高。"
    echo
    read -r -p "按回车键关闭..." _
    exit 1
  fi
  echo
  echo "依赖安装完成。"
  echo
fi

echo "启动 DIY动效编辑台..."
(open "http://localhost:9379/" || xdg-open "http://localhost:9379/" 2>/dev/null) &
npm run dev -- --host --port 9379
