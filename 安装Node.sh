#!/bin/bash
set -e

echo "========================================"
echo " 青葫三楼 · 终端安装 Node.js"
echo "========================================"
echo

UNAME_M="$(uname -m)"
case "$UNAME_M" in
  x86_64) NODE_ARCH="x64" ;;
  aarch64|arm64) NODE_ARCH="arm64" ;;
  *)
    echo "当前 CPU 架构是 ${UNAME_M}，这份脚本只覆盖 x86_64 和 arm64。"
    exit 1
    ;;
esac

NEED_GLIBC217=0
if [ -f /etc/redhat-release ] && grep -qE "release 7" /etc/redhat-release; then
  NEED_GLIBC217=1
fi
if ldd --version 2>/dev/null | head -n 1 | grep -q "2\\.17"; then
  NEED_GLIBC217=1
fi

DEST="/www/server/nodejs"
mkdir -p "$DEST"

if [ "$NEED_GLIBC217" = "1" ]; then
  if [ "$NODE_ARCH" != "x64" ]; then
    echo "CentOS 7 / glibc 2.17 目前只提供 x86_64 安装包。"
    exit 1
  fi
  VER="v22.14.0"
  NAME="node-${VER}-linux-x64-glibc-217"
  URL="https://unofficial-builds.nodejs.org/download/release/${VER}/${NAME}.tar.gz"
  echo "检测到 CentOS 7 / 旧版 glibc。"
  echo "将安装兼容包：${NAME}"
  echo "官方 Node 20/22 在这套系统上会提示 GLIBC_2.27 not found，所以必须用这一份。"
else
  VER="v22.14.0"
  NAME="node-${VER}-linux-${NODE_ARCH}"
  URL="https://npmmirror.com/mirrors/node/${VER}/${NAME}.tar.gz"
  echo "将安装：${NAME}"
fi

TGZ="/tmp/${NAME}.tar.gz"
echo "安装目录：${DEST}/${NAME}"
echo

if [ ! -x "${DEST}/${NAME}/bin/node" ]; then
  echo "正在下载 Node（大约 40～80MB），请等待……"
  if command -v wget >/dev/null 2>&1; then
    wget -O "$TGZ" "$URL"
  else
    curl -L -o "$TGZ" "$URL"
  fi
  echo "正在解压……"
  tar -xzf "$TGZ" -C "$DEST"
else
  echo "安装目录已存在，跳过下载。"
fi

if [ ! -x "${DEST}/${NAME}/bin/node" ]; then
  echo "解压后没有找到 node，请把上面的报错截图下来。"
  exit 1
fi

mkdir -p /usr/local/bin
ln -sf "${DEST}/${NAME}/bin/node" /usr/local/bin/node
ln -sf "${DEST}/${NAME}/bin/npm" /usr/local/bin/npm
ln -sf "${DEST}/${NAME}/bin/npx" /usr/local/bin/npx

if [ -d /usr/bin ]; then
  ln -sf "${DEST}/${NAME}/bin/node" /usr/bin/node
  ln -sf "${DEST}/${NAME}/bin/npm" /usr/bin/npm
  ln -sf "${DEST}/${NAME}/bin/npx" /usr/bin/npx
fi

hash -r 2>/dev/null || true

echo
echo "安装完成。"
echo "node 版本：$(node -v)"
echo "npm 版本：$(npm -v)"
echo

if [ "$NEED_GLIBC217" = "1" ]; then
  echo "CentOS 7 还要装 gcc 7，否则后面 npm install 会失败。"
  echo "请在终端继续执行："
  echo "  yum install -y centos-release-scl"
  echo "  yum install -y devtoolset-7-gcc devtoolset-7-gcc-c++ make python3"
  echo "然后再到网站目录执行： bash 一键安装.sh"
else
  echo "接下来回到网站目录执行："
  echo "  bash 一键安装.sh"
fi
