#!/usr/bin/env bash
# 动效编辑台一键启动（macOS / Linux）
cd "$(dirname "$0")"
echo "启动 DIY动效编辑台..."
(open "http://localhost:9379/" || xdg-open "http://localhost:9379/" 2>/dev/null) &
npm run dev -- --host --port 9379
