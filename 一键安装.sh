#!/bin/bash
# 青葫三楼 · 一键安装 / 覆盖更新（后端）
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT=3001
APP=qinghu-api

echo "========================================"
echo " 青葫三楼 · 一键安装（后端）"
echo "========================================"
echo "安装目录：${ROOT}"
echo

if ! bash "${ROOT}/backend/install.sh"; then
  echo
  echo "后端依赖安装失败，请按上面的提示处理后再执行：bash 一键安装.sh"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo
  echo "还没有安装 PM2。"
  echo "请在宝塔软件商店安装「PM2管理器」，然后重新执行：bash 一键安装.sh"
  exit 1
fi

cd "${ROOT}/backend"

# 1) 版本文件校验：确认 zip 真的覆盖到了 server.js
if grep -q 'const RELEASE = "1.0.32"' server.js 2>/dev/null; then
  echo "文件检查通过：server.js 已是 1.0.32"
else
  echo
  echo "【失败】server.js 不是 1.0.32，说明 zip 没有覆盖到："
  echo "  ${ROOT}/backend/server.js"
  echo "请把 qinghu-sanlou-1.0.32.zip 解压覆盖到 ${ROOT}"
  echo "（该目录下要能直接看到 backend 和 frontend 两个文件夹）"
  exit 1
fi

# 2) 释放被旧进程占用的 3001 端口（关键：旧进程不归 PM2 管，必须先清掉）
echo
echo "检查 ${PORT} 端口占用……"
port_busy() { ss -ltn 2>/dev/null | grep -qE "[:.]${PORT}[^0-9]"; }
port_owner() { ss -ltnp 2>/dev/null | grep -E "[:.]${PORT}[^0-9]" || true; }
if port_busy; then
  echo "当前占用者："
  port_owner
fi
free_port() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:${PORT} 2>/dev/null || true)"
    if [ -n "${pids}" ]; then kill -9 ${pids} >/dev/null 2>&1 || true; fi
  fi
  # 兜底：直接解析 ss 输出里的 pid
  local spids
  spids="$(port_owner | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u)"
  if [ -n "${spids}" ]; then kill -9 ${spids} >/dev/null 2>&1 || true; fi
}
free_port
sleep 1
if port_busy; then
  free_port
  sleep 1
fi
if port_busy; then
  echo "以下进程仍占用 ${PORT}，请手动结束后再执行本脚本："
  port_owner
else
  echo "端口 ${PORT} 已空闲。"
fi

# 3) 重建 PM2 进程
if pm2 describe "${APP}" >/dev/null 2>&1; then
  pm2 delete "${APP}" >/dev/null 2>&1 || true
fi
echo "正在用 PM2 启动后端……"
pm2 start ecosystem.config.cjs
pm2 save

# 4) 校验版本（带重试）
echo
echo "等待后端启动并校验版本……"
OK=""
H=""
for i in 1 2 3 4 5 6; do
  H="$(curl -s --max-time 4 http://127.0.0.1:${PORT}/api/health || true)"
  if echo "${H}" | grep -q '"release":"1.0.32"'; then OK=1; echo "${H}"; break; fi
  sleep 1
done

echo
if [ -n "${OK}" ]; then
  echo "========================================"
  echo " 后端 1.0.32 已生效"
  echo "========================================"
else
  echo "========================================"
  echo " 后端仍未生效，下面是诊断信息"
  echo "========================================"
  echo "健康检查返回：${H:-（无响应）}"
  echo "--- pm2 日志（最后 30 行）---"
  pm2 logs "${APP}" --lines 30 --nostream 2>/dev/null || true
  echo "--- pm2 进程列表 ---"
  pm2 list 2>/dev/null || true
  echo "--- ${PORT} 端口占用 ---"
  port_owner || true
  exit 1
fi

echo
echo "接下来请打开 INSTALL-BAOTA.md，从「第 9 步」继续："
echo "  1. 把网站根目录改成 frontend/dist"
echo "  2. 改 Nginx 配置（反代 /api 和 /uploads）"
echo "  3. 申请 SSL"
echo "  4. 打开网站完成 /setup 建站"
echo
echo "三楼电台要走网易云搜歌时，再执行："
echo "  bash 安装电台接口.sh"
