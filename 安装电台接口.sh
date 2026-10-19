#!/bin/bash
# 青葫三楼 · 一键安装电台搜歌接口
# 文档：https://neteasecloudmusicapienhanced.js.org/
# 仓库：https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced
# 镜像：moefurina/ncm-api
#
# 在网站根目录执行（该目录要直接能看到 backend 和 frontend）：
#   bash 安装电台接口.sh
#   bash 安装电台接口.sh music.cxovo.cn
#
# 带域名时：自动写 Nginx 反代 + 申请 Let's Encrypt 证书 + 写入 YY_API。
# 域名需要先在 DNS 后台加 A 记录指向本机公网 IP，脚本不能替你改 DNS。
#
set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
NCM_DIR="${ROOT}/ncm-api"
NCM_NAME="qinghu-ncm"
API_NAME="qinghu-api"
PORT=""
BASE=""
PUBLIC=""
DOMAIN=""
DOMAIN_OK=0
VHOST_DIR="/www/server/panel/vhost/nginx"
CERT_BASE="/www/server/panel/vhost/cert"
WROOT_BASE="/www/wwwroot"
WWWLOGS_DIR="/www/wwwlogs"
NGINX_BIN=""

echo "========================================"
echo " 青葫三楼 · 安装电台接口"
echo "========================================"
echo "安装目录：${ROOT}"
echo "文档：https://neteasecloudmusicapienhanced.js.org/"
echo

if [ ! -d "${ROOT}/backend" ]; then
  echo "当前目录看不到 backend 文件夹。"
  echo "请先 cd 到网站根，例如：cd /www/wwwroot/你的域名"
  exit 1
fi

if command -v nginx >/dev/null 2>&1; then
  NGINX_BIN="$(command -v nginx)"
elif [ -x /www/server/nginx/sbin/nginx ]; then
  NGINX_BIN="/www/server/nginx/sbin/nginx"
fi

clean_domain() {
  local d="$1"
  d="${d#http://}"; d="${d#https://}"
  d="${d%%/*}"; d="${d%%:*}"
  echo "${d}"
}

if [ "$#" -ge 1 ] && [ -n "${1:-}" ]; then
  DOMAIN="$(clean_domain "$1")"
else
  if [ -t 0 ]; then
    printf "给电台接口配一个专属域名吗？直接回车跳过（示例 music.cxovo.cn）："
    read -r DOMAIN || true
    DOMAIN="$(clean_domain "${DOMAIN}")"
  fi
fi
if [ -n "${DOMAIN}" ] && ! echo "${DOMAIN}" | grep -qE '^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$'; then
  echo "域名格式看起来不对：${DOMAIN}，已忽略，改用本机地址。"
  DOMAIN=""
fi

port_busy() {
  local p="$1"
  ss -ltn 2>/dev/null | grep -qE "[:.]${p}[^0-9]"
}

ncm_ok() {
  local p="$1"
  local body
  body="$(curl -s --max-time 8 "http://127.0.0.1:${p}/search?keywords=a&type=1&limit=1" || true)"
  echo "${body}" | grep -q '"code"'
}

pick_port() {
  local p
  for p in 3000 3002 3040 3050; do
    if ncm_ok "${p}"; then
      echo "${p}"
      return 0
    fi
    if ! port_busy "${p}"; then
      echo "${p}"
      return 0
    fi
  done
  echo ""
}

upsert_env() {
  local file="$1" key="$2" val="$3"
  mkdir -p "$(dirname "${file}")"
  if [ ! -f "${file}" ]; then
    printf '%s=%s\n' "${key}" "${val}" > "${file}"
    return 0
  fi
  local tmp="${file}.tmp.$$"
  awk -v k="${key}" -v v="${val}" '
    BEGIN { done=0 }
    index($0, k "=") == 1 { print k "=" v; done=1; next }
    { print }
    END { if (!done) print k "=" v }
  ' "${file}" > "${tmp}" && mv -f "${tmp}" "${file}"
}

write_yy_api() {
  local url="$1"
  upsert_env "${ROOT}/backend/.env" "YY_API" "${url}"
  echo "已写入 backend/.env ：YY_API=${url}"
  if [ -f "${ROOT}/backend/data/forum.db" ] || [ -f "${ROOT}/backend/forum.db" ]; then
    if (cd "${ROOT}/backend" && node set-yy-api.js "${url}"); then
      echo "已同步站务后台「电台接口」"
    else
      echo "数据库暂未写入，搜歌仍走 .env 里的 YY_API"
    fi
  fi
}

restart_qinghu() {
  if command -v pm2 >/dev/null 2>&1 && pm2 describe "${API_NAME}" >/dev/null 2>&1; then
    pm2 restart "${API_NAME}" >/dev/null 2>&1 || true
    echo "已重启 ${API_NAME}，使 YY_API 生效"
  fi
}

has_docker() {
  command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1
}

install_docker() {
  echo "检测到 Docker，使用镜像 moefurina/ncm-api"
  if docker ps -a --format '{{.Names}}' | grep -qx "${NCM_NAME}"; then
    docker start "${NCM_NAME}" >/dev/null 2>&1 || true
  else
    if ! docker pull moefurina/ncm-api:latest; then
      echo "Docker 镜像拉取失败，改用 Node 安装。"
      return 1
    fi
    docker run -d --restart unless-stopped --name "${NCM_NAME}" \
      -p "127.0.0.1:${PORT}:3000" \
      -e ENABLE_GENERAL_UNBLOCK=true \
      -e http_proxy= -e https_proxy= -e HTTP_PROXY= -e HTTPS_PROXY= -e no_proxy= -e NO_PROXY= \
      moefurina/ncm-api:latest >/dev/null
  fi
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 12 15; do
    if ncm_ok "${PORT}"; then return 0; fi
    sleep 2
  done
  echo "Docker 容器已启动，但接口还没就绪。"
  return 1
}

clone_ncm() {
  local dest="$1"
  if [ -f "${dest}/app.js" ]; then
    echo "已有源码：${dest}"
    return 0
  fi
  if [ -d "${dest}" ]; then
    mv "${dest}" "${dest}.bak.$(date +%s)"
  fi
  command -v git >/dev/null 2>&1 || return 1
  export GIT_TERMINAL_PROMPT=0
  local u
  for u in \
    "https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git" \
    "https://ghproxy.net/https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git"
  do
    echo "正在克隆：${u}"
    if git clone --depth 1 "${u}" "${dest}"; then
      return 0
    fi
  done
  return 1
}

fetch_ncm_tarball() {
  local dest="$1"
  mkdir -p /tmp/opencode
  local tarfile="/tmp/opencode/ncm-api.tgz"
  local u
  for u in \
    "https://codeload.github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/tar.gz/refs/heads/main" \
    "https://ghproxy.net/https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced/archive/refs/heads/main.tar.gz"
  do
    echo "正在下载源码包：${u}"
    if curl -fsSL --max-time 120 -o "${tarfile}" "${u}"; then
      mkdir -p /tmp/opencode/ncm-src
      tar -xzf "${tarfile}" -C /tmp/opencode/ncm-src
      local inner
      inner="$(find /tmp/opencode/ncm-src -mindepth 1 -maxdepth 1 -type d | head -n 1)"
      if [ -n "${inner}" ] && [ -f "${inner}/app.js" ]; then
        mv "${inner}" "${dest}"
        return 0
      fi
    fi
  done
  return 1
}

install_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "还没有 Node.js。请先装 Node 22，或先装 Docker 后再执行本脚本。"
    return 1
  fi
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [ "${major}" -lt 22 ]; then
    echo "当前 Node 是 $(node -v)，NeteaseCloudMusicApiEnhanced 需要 22 或更高。"
    echo "宝塔软件商店把 Node 换成 22.x 后重跑；有 Docker 也可以让脚本走镜像。"
    return 1
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "还没有 PM2。请在宝塔软件商店安装「PM2管理器」后再执行。"
    return 1
  fi
  echo "使用 Node $(node -v) + PM2 安装接口"
  if [ ! -f "${NCM_DIR}/app.js" ]; then
    clone_ncm "${NCM_DIR}" || fetch_ncm_tarball "${NCM_DIR}" || {
      echo "源码下载失败。请检查服务器能否访问 GitHub，然后重跑。"
      return 1
    }
  fi
  echo "正在安装依赖，大约 1～3 分钟……"
  (
    cd "${NCM_DIR}"
    npm install --omit=dev --legacy-peer-deps
  ) || {
    echo "npm 安装失败。"
    return 1
  }
  cat > "${NCM_DIR}/ecosystem.qinghu.cjs" <<ENDCFG
module.exports = {
  apps: [{
    name: "${NCM_NAME}",
    script: "app.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: "${PORT}",
      HOST: "127.0.0.1",
      ENABLE_GENERAL_UNBLOCK: "true"
    }
  }]
};
ENDCFG
  if pm2 describe "${NCM_NAME}" >/dev/null 2>&1; then
    pm2 delete "${NCM_NAME}" >/dev/null 2>&1 || true
  fi
  (cd "${NCM_DIR}" && pm2 start ecosystem.qinghu.cjs)
  pm2 save >/dev/null 2>&1 || true
  local i
  for i in 1 2 3 4 5 6 7 8 9 10 12 15; do
    if ncm_ok "${PORT}"; then return 0; fi
    sleep 2
  done
  echo "PM2 已启动 ${NCM_NAME}，接口还没就绪。最近日志："
  pm2 logs "${NCM_NAME}" --lines 20 --nostream 2>/dev/null || true
  return 1
}

public_ip() {
  local ip=""
  ip="$(curl -s --max-time 5 https://api.ipify.org || true)"
  [ -n "${ip}" ] || ip="$(curl -s --max-time 5 https://ipv4.icanhazip.com || true)"
  [ -n "${ip}" ] || ip="$(curl -s --max-time 5 https://ip.sb || true)"
  echo "${ip}" | tr -d '[:space:]'
}

resolve_ip() {
  local d="$1"
  getent hosts "${d}" 2>/dev/null | awk '{print $1; exit}' || true
}

reload_nginx() {
  [ -n "${NGINX_BIN}" ] || return 1
  if "${NGINX_BIN}" -t >/dev/null 2>&1; then
    "${NGINX_BIN}" -s reload >/dev/null 2>&1 && return 0
  fi
  return 1
}

write_vhost() {
  local d="$1" p="$2"
  local conf="${VHOST_DIR}/${d}.conf"
  local cert_dir="${CERT_BASE}/${d}"
  local challenge="${WROOT_BASE}/ncm-acme/${d}"
  mkdir -p "${VHOST_DIR}" "${cert_dir}" "${challenge}/.well-known/acme-challenge" "${WWWLOGS_DIR}"
  local ssl_block=""
  if [ -f "${cert_dir}/fullchain.pem" ] && [ -f "${cert_dir}/privkey.pem" ]; then
    ssl_block="
server {
    listen 443 ssl;
    server_name ${d};
    access_log ${WWWLOGS_DIR}/ncm-api.${d}.log;
    error_log ${WWWLOGS_DIR}/ncm-api.${d}.error.log;

    ssl_certificate ${cert_dir}/fullchain.pem;
    ssl_certificate_key ${cert_dir}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_pass http://127.0.0.1:${p};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}"
  fi
  cat > "${conf}" <<EOF
# 青葫三楼 · 电台接口专属域名（由 安装电台接口.sh 生成）
server {
    listen 80;
    server_name ${d};
    access_log ${WWWLOGS_DIR}/ncm-api.${d}.log;
    error_log ${WWWLOGS_DIR}/ncm-api.${d}.error.log;

    location ^~ /.well-known/acme-challenge/ {
        root ${challenge};
        default_type "text/plain";
    }

    location / {
        proxy_pass http://127.0.0.1:${p};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
${ssl_block}
EOF
  echo "已写入 Nginx 配置：${conf}"
}

ensure_acme() {
  local sh=""
  if [ -x /root/.acme.sh/acme.sh ]; then sh="/root/.acme.sh/acme.sh"; fi
  if [ -z "${sh}" ]; then
    echo "正在安装 acme.sh（用于自动申请证书与续期）……"
    curl -fsSL --max-time 60 https://get.acme.sh | sh -s email=admin@"${DOMAIN}" >/dev/null 2>&1 || true
    [ -x /root/.acme.sh/acme.sh ] && sh="/root/.acme.sh/acme.sh"
  fi
  [ -n "${sh}" ] || return 1
  "${sh}" --set-default-ca --server letsencrypt >/dev/null 2>&1 || true
  echo "${sh}"
}

issue_cert() {
  local d="$1"
  local challenge="${WROOT_BASE}/ncm-acme/${d}"
  local cert_dir="${CERT_BASE}/${d}"
  local acme
  acme="$(ensure_acme)" || return 1
  echo "正在申请证书：${d}"
  if ! "${acme}" --issue -d "${d}" --webroot "${challenge}" --keylength 2048 >/dev/null 2>&1; then
    return 1
  fi
  "${acme}" --install-cert -d "${d}" \
    --key-file "${cert_dir}/privkey.pem" \
    --fullchain-file "${cert_dir}/fullchain.pem" \
    --reloadcmd "${NGINX_BIN} -s reload" >/dev/null 2>&1 || return 1
  return 0
}

setup_domain() {
  local d="$1" p="$2"
  echo
  echo "配置专属域名：${d}"
  if [ -z "${NGINX_BIN}" ]; then
    echo "【跳过】没找到 Nginx，无法自动反代。可先装 Nginx，或用本机地址 http://127.0.0.1:${p}"
    return 0
  fi
  local pub got
  pub="$(public_ip)"
  got="$(resolve_ip "${d}")"
  if [ -z "${got}" ]; then
    echo "【提示】${d} 还没有解析记录。"
    echo "       请先在 DNS 后台加 A 记录指向这台服务器的公网 IP：${pub:-（请自行确认）}"
    echo "       解析生效后重跑：bash 安装电台接口.sh ${d}"
    echo "       本次先写入本机地址 http://127.0.0.1:${p}"
    return 0
  fi
  if [ -n "${pub}" ] && [ "${got}" != "${pub}" ]; then
    echo "【提示】${d} 现在解析到 ${got}，本机公网 IP 是 ${pub}。"
    echo "       解析没指到本机时证书会申请失败，本次先按 HTTP 反代配置。"
  fi

  DOMAIN_OK=1
  write_vhost "${d}" "${p}"
  reload_nginx || echo "Nginx 重载失败，请检查配置后执行：nginx -t"

  local url="http://${d}"
  if issue_cert "${d}"; then
    write_vhost "${d}" "${p}"
    reload_nginx || true
    url="https://${d}"
    echo "证书已就绪：https://${d}"
    echo "自检：curl \"${url}/search?keywords=海阔天空&limit=1\""
  else
    echo "【提示】证书没申请成功，先用 HTTP：http://${d}"
    echo "       确认 ${d} 的 A 记录已指向 ${pub:-本机公网 IP} 后，重跑本脚本会自动续上证书。"
  fi
  PUBLIC="${url}"
}

PORT="$(pick_port)"
if [ -z "${PORT}" ]; then
  echo "3000 / 3002 / 3040 / 3050 都被占用，请先空出一个端口再执行。"
  exit 1
fi
echo "将使用本机端口 ${PORT}（仅 127.0.0.1，安全组不用放行）"

if ncm_ok "${PORT}"; then
  echo "本机 ${PORT} 上已经有可用的网易云接口，跳过安装。"
else
  INSTALLED=""
  if has_docker; then
    if install_docker; then INSTALLED=1; fi
  fi
  if [ -z "${INSTALLED}" ]; then
    if ! install_node; then
      echo
      echo "安装失败。请先把 Node 换成 22.x 并安装 PM2，或安装 Docker 后重跑。"
      exit 1
    fi
  fi
fi

if ! ncm_ok "${PORT}"; then
  echo "接口仍无响应：http://127.0.0.1:${PORT}/search"
  exit 1
fi

BASE="http://127.0.0.1:${PORT}"
if [ -n "${DOMAIN}" ]; then
  setup_domain "${DOMAIN}" "${PORT}"
fi

if [ "${DOMAIN_OK}" = "1" ] && [ -n "${PUBLIC}" ]; then
  write_yy_api "${PUBLIC}"
else
  write_yy_api "${BASE}"
fi
restart_qinghu

echo
echo "========================================"
echo " 电台接口已就绪"
echo "========================================"
echo "本机地址：${BASE}"
if [ "${DOMAIN_OK}" = "1" ] && [ -n "${PUBLIC}" ]; then
  echo "专属域名：${PUBLIC}"
fi
echo "自检：curl \"${BASE}/search?keywords=海阔天空&limit=1\""
echo "青葫搜歌会优先走这套接口，没有播放地址时再退回 iTunes 预览。"
echo "站务后台总览里的「电台接口」已同步。"
echo "安全组 / 防火墙不要放行 ${PORT}。"
if [ -n "${DOMAIN}" ]; then
  echo "域名 ${DOMAIN} 需放行 80 和 443。"
fi
echo
echo "想听整首而不是 30 秒试听：到站务后台「三楼电台」填网易云登录 Cookie（MUSIC_U=...）。"
echo "浏览器登录 music.163.com 后，在开发者工具的网络请求头里复制 Cookie 整段即可。"
