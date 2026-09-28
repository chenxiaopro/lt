#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "========================================"
echo " 青葫三楼 · 后端安装"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
  echo "还没有安装 Node.js。"
  echo "请先安装 Node 18 或 22（有 20 也可以）。"
  echo "宝塔软件商店里的版本管理器：装 22.x 或 18.x 即可。"
  echo "版本管理器装不上：按 INSTALL-BAOTA.md 文末「附录：终端安装 Node」做。"
  exit 1
fi

echo "当前 Node 版本：$(node -v)"
echo "当前 npm 版本：$(npm -v)"
echo

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "当前 Node 是 $(node -v)，需要 18 或更高（推荐 22）。"
  echo "请看 INSTALL-BAOTA.md 第 2 步和文末「附录：终端安装 Node」。"
  exit 1
fi

if [ -f /opt/rh/devtoolset-11/enable ]; then
  # CentOS 7 需要较新的 gcc 才能编译 better-sqlite3
  source /opt/rh/devtoolset-11/enable
elif [ -f /opt/rh/devtoolset-7/enable ]; then
  source /opt/rh/devtoolset-7/enable
fi

GCC_MAJOR="$(gcc -dumpversion 2>/dev/null | cut -d. -f1)"
echo "编译器 gcc：$(gcc -dumpversion 2>/dev/null || echo 未安装)"
if [ "${GCC_MAJOR:-0}" -lt 7 ]; then
  echo "编译数据库模块需要 gcc 7 或更高。"
  echo "CentOS 7 请先在终端执行："
  echo "  yum install -y centos-release-scl"
  echo "  yum install -y devtoolset-7-gcc devtoolset-7-gcc-c++ make python3"
  echo "然后再跑 bash 一键安装.sh"
  exit 1
fi

echo "正在安装后端依赖，大约 1～3 分钟，请等待……"
npm install --omit=dev

mkdir -p data uploads

if [ ! -f .env ]; then
  SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  cat > .env <<EOF
JWT_SECRET=${SECRET}
PORT=3001
NODE_ENV=production
EOF
  echo "已自动生成密钥文件 backend/.env"
else
  echo "已存在 backend/.env，跳过生成密钥"
fi

echo
echo "后端依赖安装完成。"
echo "数据目录：$(pwd)/data"
echo "上传目录：$(pwd)/uploads"
