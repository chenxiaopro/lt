# 赤云音乐

移动端优先的网易云风格音乐站，数据来自 `http://music.cxovo.cn/`。

# 本地启动

```bash
# 安装依赖
npm install

# 启动前端开发服务
npm run dev
```

前端通过 `/api` 反向代理到 `http://music.cxovo.cn`，预览环境只暴露一个端口。

# 功能

- 发现页：Banner、每日推荐、推荐歌单、新歌、歌手、播客
- 排行榜、搜索（单曲 / 歌单 / 歌手）
- 歌单 / 专辑 / 歌手 / 播客详情
- 迷你播放条 + 全屏播放器、歌词、评论、红心收藏

# 宝塔服务器部署（Ubuntu 22.04）

```bash
# 上传并解压 chiyun-music-deploy.zip 后
cd chiyun-music
sudo bash deploy/install.sh music.example.com
```

脚本会把构建好的 `dist/` 部署到网站目录，并生成带 `/api` 反向代理和 SPA 回退的 nginx 配置。详见 `deploy/README.md`。
