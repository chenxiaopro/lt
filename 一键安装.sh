#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo " 青葫三楼 · 一键安装（后端）"
echo "========================================"
echo "安装目录：${ROOT}"
echo

bash "${ROOT}/backend/install.sh"

if ! command -v pm2 >/dev/null 2>&1; then
  echo
  echo "还没有安装 PM2。"
  echo "请打开宝塔面板 → 软件商店 → 搜索「PM2管理器」→ 安装。"
  echo "装好后再重新执行：bash 一键安装.sh"
  echo
  echo "也可以用宝塔「网站 → Node项目」图形界面启动，详见 INSTALL-BAOTA.md 第 8 步。"
  exit 0
fi

cd "${ROOT}/backend"
if pm2 describe qinghu-api >/dev/null 2>&1; then
  echo "检测到已有进程 qinghu-api，正在重启……"
  pm2 restart qinghu-api
else
  echo "正在用 PM2 启动后端……"
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo
echo "========================================"
echo " 后端已启动"
echo "========================================"
echo "本机自检地址：http://127.0.0.1:3001/api/health"
echo "浏览器打开上面地址，应看到类似 {\"ok\":true} 的字样。"
echo
echo "接下来请打开 INSTALL-BAOTA.md，从「第 9 步」继续："
echo "  1. 把网站根目录改成 frontend/dist"
echo "  2. 改 Nginx 配置（反代 /api 和 /uploads）"
echo "  3. 申请 SSL"
echo "  4. 打开网站完成 /setup 建站"
