#!/usr/bin/env bash
#
# 赤云音乐 - 宝塔面板一键部署脚本 (Ubuntu 22.04 / Debian 系)
#
# 用法:
#   bash install.sh <域名> [选项]
#
# 示例:
#   bash install.sh music.example.com
#   bash install.sh music.example.com --api http://music.cxovo.cn
#   bash install.sh music.example.com --root /www/wwwroot/music.example.com
#   bash install.sh music.example.com --no-nginx   # 只部署文件，不改 nginx
#
set -euo pipefail

DOMAIN=""
WEB_ROOT=""
API_BASE="http://music.cxovo.cn"
MANAGE_NGINX=1

BT_VHOST_DIR="/www/server/panel/vhost/nginx"
NGINX_BIN="/www/server/nginx/sbin/nginx"
WWW_USER="www"

log()  { printf '\033[32m[赤云]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[赤云]\033[0m %s\n' "$*"; }
die()  { printf '\033[31m[赤云]\033[0m %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
赤云音乐 - 宝塔面板一键部署脚本 (Ubuntu 22.04 / Debian 系)

用法:
  bash install.sh <域名> [选项]

选项:
  -r, --root <目录>   指定网站根目录（默认 /www/wwwroot/<域名>）
  -a, --api  <地址>   指定接口服务地址（默认 http://music.cxovo.cn）
      --no-nginx      只部署静态文件，不修改 nginx 配置
  -h, --help          显示帮助

示例:
  bash install.sh music.example.com
  bash install.sh music.example.com --api http://music.cxovo.cn
  bash install.sh music.example.com --root /www/wwwroot/music.example.com
  bash install.sh music.example.com --no-nginx
EOF
  exit 0
}

# ---------- 解析参数 ----------
while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage ;;
    -r|--root) WEB_ROOT="${2:-}"; shift 2 ;;
    -a|--api)  API_BASE="${2:-}"; shift 2 ;;
    --no-nginx) MANAGE_NGINX=0; shift ;;
    -*) die "未知参数: $1" ;;
    *)
      if [ -z "$DOMAIN" ]; then DOMAIN="$1"; else die "多余参数: $1"; fi
      shift ;;
  esac
done

[ "$(id -u)" -eq 0 ] || die "请使用 root 运行：sudo bash install.sh <域名>"
[ -n "$DOMAIN" ] || { usage; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
[ -f "$PROJECT_DIR/package.json" ] || die "找不到 package.json，请确认目录结构完整"

[ -n "$WEB_ROOT" ] || WEB_ROOT="/www/wwwroot/$DOMAIN"
API_BASE="${API_BASE%/}"

log "域名:        $DOMAIN"
log "网站目录:    $WEB_ROOT"
log "接口地址:    $API_BASE"

# ---------- 1. 准备前端产物 ----------
DEPLOY_SRC=""
if [ -f "$PROJECT_DIR/dist/index.html" ]; then
  DEPLOY_SRC="$PROJECT_DIR/dist"
  log "使用随包预构建的 dist/"
elif command -v npm >/dev/null 2>&1; then
  warn "未找到 dist/，尝试在服务器本地构建（需要 Node.js）"
  ( cd "$PROJECT_DIR" && npm install --no-audit --no-fund && npm run build )
  [ -f "$PROJECT_DIR/dist/index.html" ] || die "构建失败：未生成 dist/index.html"
  DEPLOY_SRC="$PROJECT_DIR/dist"
else
  die "既没有预构建的 dist/，服务器也没有 Node.js。请在本地执行 npm run build 后重新打包上传。"
fi

# ---------- 2. 部署静态文件 ----------
log "部署静态文件到 $WEB_ROOT"
mkdir -p "$WEB_ROOT"
# 只清理本项目的构建产物，避免误删网站目录里的其他文件
rm -rf "$WEB_ROOT/assets"
rm -f "$WEB_ROOT/index.html" "$WEB_ROOT/favicon.svg"
cp -a "$DEPLOY_SRC"/. "$WEB_ROOT"/
chmod -R 755 "$WEB_ROOT"
if id "$WWW_USER" >/dev/null 2>&1; then
  chown -R "$WWW_USER:$WWW_USER" "$WEB_ROOT"
fi

# ---------- 3. 写入 nginx 配置 ----------
if [ "$MANAGE_NGINX" -eq 1 ]; then
  if [ -d "$BT_VHOST_DIR" ]; then
    CONF="$BT_VHOST_DIR/$DOMAIN.conf"
    [ -f "$CONF" ] && cp "$CONF" "$CONF.chiyun.bak.$(date +%s)" && warn "已备份原配置: $CONF"
    sed -e "s|__DOMAIN__|$DOMAIN|g" \
        -e "s|__WEB_ROOT__|$WEB_ROOT|g" \
        -e "s|__API_BASE__|$API_BASE|g" \
        "$SCRIPT_DIR/nginx.conf.template" > "$CONF"
    log "已写入 nginx 配置: $CONF"
    mkdir -p /www/wwwlogs
  else
    warn "未检测到宝塔 nginx 目录 ($BT_VHOST_DIR)，跳过自动配置。"
    warn "请把下面内容粘贴到你的 nginx server 配置中："
    sed -e "s|__DOMAIN__|$DOMAIN|g" \
        -e "s|__WEB_ROOT__|$WEB_ROOT|g" \
        -e "s|__API_BASE__|$API_BASE|g" \
        "$SCRIPT_DIR/nginx.conf.template"
    MANAGE_NGINX=0
  fi
fi

# ---------- 4. 重载 nginx ----------
if [ "$MANAGE_NGINX" -eq 1 ]; then
  reloaded=0
  if [ -x "$NGINX_BIN" ]; then
    "$NGINX_BIN" -t && "$NGINX_BIN" -s reload && reloaded=1
  elif command -v nginx >/dev/null 2>&1; then
    nginx -t && nginx -s reload && reloaded=1
  elif systemctl list-unit-files 2>/dev/null | grep -q '^nginx\.service'; then
    systemctl reload nginx && reloaded=1
  fi
  if [ "$reloaded" -eq 1 ]; then
    log "nginx 已重载"
  else
    warn "未能自动重载 nginx，请到宝塔面板里重启 Nginx"
  fi
fi

echo
log "部署完成"
echo "  访问:   http://$DOMAIN"
echo "  目录:   $WEB_ROOT"
echo "  接口:   $API_BASE  (前端 /api/xxx -> $API_BASE/xxx)"
echo
echo "提示: 若要在宝塔面板中启用 HTTPS，请在网站设置里申请证书。"
echo "      面板若重新生成了 nginx 配置，重新运行本脚本即可恢复 /api 反向代理。"
