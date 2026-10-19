# 宝塔服务器部署说明（Ubuntu 22.04）

赤云音乐是一个纯前端 SPA，线上由 nginx 提供静态文件，并把 `/api` 反向代理到音乐接口服务。开发环境用的是 Vite proxy，线上用 nginx 实现同样的效果。

## 一、上传并解压

把 `chiyun-music-deploy.zip` 上传到服务器，例如 `/root`，然后解压：

```bash
cd /root
unzip chiyun-music-deploy.zip
cd chiyun-music
```

包里已经包含构建好的 `dist/`，服务器上不需要安装 Node.js。

## 二、一键安装

在宝塔面板先建好站点（域名 + 网站目录），然后运行：

```bash
# 用默认目录 /www/wwwroot/<域名>
sudo bash deploy/install.sh music.example.com

# 自定义接口或目录
sudo bash deploy/install.sh music.example.com --api http://music.cxovo.cn --root /www/wwwroot/music.example.com
```

脚本会做四件事：

1. 把 `dist/` 部署到网站根目录并设置 `www` 属主
2. 生成宝塔 nginx 配置 `/www/server/panel/vhost/nginx/<域名>.conf`（已存在则先备份）
3. 校验并重载 nginx
4. 打印访问地址

如果只想部署文件、自己改 nginx：

```bash
sudo bash deploy/install.sh music.example.com --no-nginx
```

## 三、HTTPS

在宝塔面板「网站 -> 设置 -> SSL」申请证书即可。面板重新生成配置后，`/api` 反向代理可能会丢失，重新运行一次 `install.sh` 就能恢复。

注意：网易云接口返回的音频地址可能是 `http://`，如果你启用了 HTTPS 且浏览器拦截混合内容导致无法播放，可以暂时用 HTTP 访问，或在面板里确认接口返回的是 `https://` 地址。

## 四、升级

拿到新的 zip 后重新解压，再执行一次安装命令。脚本会自动备份旧的 nginx 配置并覆盖静态文件。

## 手动 nginx 配置

不想让脚本改 nginx，就把 `deploy/nginx.conf.template` 里的 `__DOMAIN__`、`__WEB_ROOT__`、`__API_BASE__` 三个占位符替换后，粘贴到站点的配置文件里。
