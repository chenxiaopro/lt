# 青葫三楼

玩机与游戏互助社区论坛，对标葫芦侠三楼的社区玩法：版块、楼层回复、签到葫芦、等级头衔、关注流、排行与兑换。

安装包：`qinghu-sanlou-1.0.34.zip`。线上环境推荐 **Ubuntu 22.04 LTS 64 位** + 宝塔 + Node 22。更细的点选说明见 `INSTALL-BAOTA.md`。本版在 1.0.32 基础上为手机端补齐 Discuz 经典能力：修复付费帖附件泄漏：未解锁用户看不到付费帖的图片与视频（接口返回占位计数，解锁后可见），并优化整体响应（列表卡片 memo 化减少重渲染、后端启动自预热消除首访延迟）。演示数据重播脚本继续保留：安装包仍按空库交付，本地或演示站需要样例内容时执行 `node backend/reseed-demo.js`，脚本会先备份数据库，再重建演示账号与帖子，保留站长和已有真实内容。付费帖子、帖子红包、视频上传播放、列表查询优化和手机端修复继续保留。

## 本地启动

安装依赖：

```bash
cd backend && npm install
cd ../frontend && npm install
```

同时启动 API 与前端：

```bash
bash start.sh
```

前端默认 http://localhost:5173 ，接口走 `/api` 反向代理到 3001。

## 演示数据

安装包默认是空库，不创建演示账号。需要本地预览或演示站样例内容时，停掉后端再执行：

```bash
cd backend
node reseed-demo.js
```

脚本会先把数据库备份到 `backend/data/backups/`，然后删除旧的演示账号和演示帖，重新生成一批带当前时间的演示内容。站长账号、真实版块和真实帖子会保留。重新启动后端后生效。

## 帖子红包

在「发到三楼」选择「红包」，填写总额、个数和祝福语。发布时从发帖人葫芦余额扣除总额，楼友可在帖子详情领取，每人限领一次，不能领自己的红包。红包 24 小时内领完即止，到期未领完的葫芦自动退回发帖人。删除帖子进入回收站不影响已领记录，彻底删除或删除版块时剩余金额退回。

## 付费帖子

在「发到三楼」选择「付费」，正文作为免费试读，另外填写解锁价格和付费内容。读者在帖子详情支付葫芦后立即解锁，每人只需购买一次；楼主和版主可以直接查看。付款直接转入发帖人余额，购买记录和到账通知自动生成。付费内容不会出现在信息流摘要、搜索和分享卡片中。

## 去水印

登录后从消息页顶部「去水印」进入 `/parse`，粘贴抖音、快手等分享内容。成功按后台「每次解析扣葫芦」扣费（默认 1，可设 0）。站长在后台「去水印」登记远程接口（地址带 `url=`，slug 填平台或 `*`）；未配接口时抖音、快手走内置适配。下载走登录态代理。

## 三楼电台

搜歌优先走自建 [NeteaseCloudMusicApiEnhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)。接口说明见 https://neteasecloudmusicapienhanced.js.org/ ，填本机根地址，例如 `http://127.0.0.1:3000`。

网站根目录执行（能直接看到 `backend` 和 `frontend`）：

```bash
# 只写本机地址，最快
cd /www/wwwroot/你的域名
bash 安装电台接口.sh

# 给电台接口一个专属域名，脚本自动反代并申请证书
cd /www/wwwroot/你的域名
bash 安装电台接口.sh music.cxovo.cn
```

不带域名时，脚本把 `YY_API` 写成 `http://127.0.0.1:3000`。带域名时，脚本自动写 Nginx 反代、用 acme.sh 申请 Let's Encrypt 证书，再把 `YY_API` 写成 `https://music.cxovo.cn`。域名要已经解析到本机公网 IP。不带参数运行时也会提示输入域名，直接回车即跳过。

脚本有 Docker 就拉 `moefurina/ncm-api`，否则用 Node 22 + PM2。装好后写入 `backend/.env` 的 `YY_API`，并同步站务后台。留空 `YY_API` 则只用 iTunes 预览源。本机端口不用放行；配了域名要放行 80 和 443。

自建接口能搜到歌，但只有约 30 秒时，是网易云没给完整音源，青葫退回了 iTunes 预览。到站务后台总览 →「三楼电台」填网易云登录 Cookie（`MUSIC_U=...`，浏览器登录 music.163.com 后从开发者工具请求头复制），保存后即可听整首。会员/独家版权曲仍可能没有地址。

消息页小应用「赤云」是完整网易云风格播放器。解压覆盖后执行 `bash 一键安装.sh` 即可，接口走已有的 `/api` 反代（`/api/chiyun`），沿用 `YY_API` / `YY_COOKIE`。

## 全新服务器安装

系统选 **Ubuntu 22.04 LTS 64 位**。配置建议 2 核 4G、40GB 以上硬盘、公网 IP。官方 Node 18/22 能直接跑，宝塔也支持。

下面「你的域名」换成自己的，例如 `app.cxovo.cn`。

### 1. 重装系统

1. 登录云厂商控制台，给这台机器做一次快照（有旧数据再做）。
2. 重装 / 更换系统镜像，选 **Ubuntu 22.04 LTS 64bit**。
3. 设好 root 密码，等开机。
4. 安全组入站放行：`22`（SSH）、`80`（网站）、`443`（HTTPS）、`8888`（宝塔）。`3001` 只给本机 Nginx 反代用，安全组里不用开。
5. 域名后台把 A 记录指到这台公网 IP。

### 2. 装宝塔

SSH 用 root 登录后执行：

```bash
# 下载并安装宝塔面板（Ubuntu）
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh
sudo bash install.sh ed8484bec
```

提示输入 `y` 后回车，等 2～10 分钟。结束时终端会打印外网面板地址、用户名、密码，立刻抄下来。浏览器打开 `http://服务器IP:8888/安全入口` 登录。

### 3. 宝塔里装 3 个软件

软件商店分别搜索安装：

1. **Nginx**（稳定版）
2. **Node.js版本管理器** → 安装 **22.x**，设为默认
3. **PM2管理器**

终端执行：

```bash
# 确认 Node 版本，应是 v22 开头
node -v
npm -v

# 编译 better-sqlite3 需要的工具
apt-get update
apt-get install -y build-essential python3
```

### 4. 添加网站并上传程序

1. 网站 → 添加站点：域名填你的域名；PHP 选 **纯静态**；数据库、FTP 都不创建。
2. 文件 → 进入 `/www/wwwroot/你的域名/`，上传 `qinghu-sanlou-1.0.34.zip`，右键解压。
3. 若多出一层 `qinghu-sanlou` 文件夹，把里面的 `backend`、`frontend`、`一键安装.sh` 等全部剪切到 `/www/wwwroot/你的域名/`。这个目录必须直接能看到 `backend` 和 `frontend`。
4. 网站设置 → 网站目录改成：

```text
/www/wwwroot/你的域名/frontend/dist
```

这个目录里应有 `index.html`。

### 5. 启动后端

```bash
# 进入网站目录并安装、启动后端
cd /www/wwwroot/你的域名
bash 一键安装.sh
```

看到「后端已启动」后，本机检查：

```bash
curl http://127.0.0.1:3001/api/health
```

应返回带 `"ok":true` 的 JSON。

脚本若提示没有 PM2：网站 → Node项目 → 添加，项目目录填 `.../backend`，启动文件 `server.js`，端口 `3001`，模式 **Fork**。

SQLite 只能单进程读写，PM2 用 `fork`、实例数 `1`。

### 6. 改 Nginx

网站 → 你的域名 → **设置** → **配置文件**。把里面整段删掉，粘贴下面这一整份，点 **保存**。

这是按 `app.cxovo.cn` 写好的，域名不同就把文中 `app.cxovo.cn` 全部替换成自己的。

```nginx
server
{
    listen 80;
    listen 443 ssl;
    http2 on;
    server_name app.cxovo.cn;
    index index.html index.php index.htm default.php default.htm default.html;
    root /www/wwwroot/app.cxovo.cn/frontend/dist;
    client_max_body_size 100m;
    client_body_timeout 300s;

    #CERT-APPLY-CHECK--START
    include /www/server/panel/vhost/nginx/well-known/app.cxovo.cn.conf;
    #CERT-APPLY-CHECK--END
    include /www/server/panel/vhost/nginx/extension/app.cxovo.cn/*.conf;

    #SSL-START SSL相关配置，请勿删除或修改下一行带注释的404规则
    #error_page 404/404.html;
    #HTTP_TO_HTTPS_START
    set $isRedcert 1;
    if ($server_port != 443) {
        set $isRedcert 2;
    }
    if ( $uri ~ /\.well-known/ ) {
        set $isRedcert 1;
    }
    if ($isRedcert != 1) {
        rewrite ^(/.*)$ https://$host$1 permanent;
    }
    #HTTP_TO_HTTPS_END
    ssl_certificate    /www/server/panel/vhost/cert/app.cxovo.cn/fullchain.pem;
    ssl_certificate_key    /www/server/panel/vhost/cert/app.cxovo.cn/privkey.pem;
    ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;
    ssl_ciphers EECDH+CHACHA20:EECDH+CHACHA20-draft:EECDH+AES128:RSA+AES128:EECDH+AES256:RSA+AES256:EECDH+3DES:RSA+3DES:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_tickets on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000";
    error_page 497  https://$host$request_uri;
    #SSL-END

    include enable-php-00.conf;
    include /www/server/panel/vhost/rewrite/app.cxovo.cn.conf;

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location ^~ /uploads/ {
        alias /www/wwwroot/app.cxovo.cn/backend/uploads/;
        expires 30d;
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* (\.user.ini|\.htaccess|\.htpasswd|\.env.*|\.project|\.bashrc|\.bash_profile|\.bash_logout|\.DS_Store|\.gitignore|\.gitattributes|LICENSE|README\.md|CLAUDE\.md|CHANGELOG\.md|CHANGELOG|CONTRIBUTING\.md|TODO\.md|FAQ\.md|composer\.json|composer\.lock|package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|\.\w+~|\.swp|\.swo|\.bak(up)?|\.old|\.tmp|\.temp|\.log|\.sql(\.gz)?|docker-compose\.yml|docker\.env|Dockerfile|\.csproj|\.sln|Cargo\.toml|Cargo\.lock|go\.mod|go\.sum|phpunit\.xml|phpunit\.xml|pom\.xml|build\.gradl|pyproject\.toml|requirements\.txt|application(-\w+)?\.(ya?ml|properties))$
    {
        return 404;
    }

    location ~* /(\.git|\.svn|\.bzr|\.vscode|\.claude|\.idea|\.ssh|\.github|\.npm|\.yarn|\.pnpm|\.cache|\.husky|\.turbo|\.next|\.nuxt|node_modules|runtime)/ {
        return 404;
    }

    location ~ \.well-known{
        allow all;
    }

    if ( $uri ~ "^/\.well-known/.*\.(php|jsp|py|js|css|lua|ts|go|zip|tar\.gz|rar|7z|sql|bak)$" ) {
        return 403;
    }

    location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$
    {
        expires      30d;
        error_log /dev/null;
        access_log /dev/null;
    }

    location ~ .*\.(js|css)?$
    {
        expires      12h;
        error_log /dev/null;
        access_log /dev/null;
    }
    access_log  /www/wwwlogs/app.cxovo.cn.log;
    error_log  /www/wwwlogs/app.cxovo.cn.error.log;
}
```

保存后，浏览器打开 `https://app.cxovo.cn/api/health`，应看到 `"ok":true`。

### 覆盖更新（已装过）

这个 zip 根目录就是 `backend`、`frontend`，解压后直接盖住网站目录。

1. 宝塔文件进入 `/www/wwwroot/你的域名/`，这里要直接能看到 `backend` 和 `frontend`。不要解压到 `frontend/dist`。
2. 上传 `qinghu-sanlou-1.0.34.zip`，右键解压，选覆盖已有文件。解完执行：`grep 'const RELEASE' backend/server.js`，必须看到 `1.0.34`。
3. 打开网站设置 → 配置文件，把 `location /uploads/` 改成下面这段后保存：

```nginx
location ^~ /uploads/ {
    alias /www/wwwroot/app.cxovo.cn/backend/uploads/;
    expires 30d;
    access_log off;
}
```

域名不同就把路径里的 `app.cxovo.cn` 换成自己的。`location /api/` 也改成 `location ^~ /api/`，其它行不动。

4. 终端执行：

```bash
cd /www/wwwroot/你的域名
bash 一键安装.sh
```

`backend/data`（帖子账号）和 `backend/uploads`（已传图片）会留着。

覆盖只换文件，PM2 内存里还是旧代码。必须跑完 `bash 一键安装.sh`。打开 `https://你的域名/api/health`，JSON 里要有 `"release":"1.0.34"`。没有这行：号店、装扮、推荐、会员等新接口会全部显示「接口不存在」。

重要：如果之前用 `bash start.sh` 或手动 `node server.js` 起过后端，会在 3001 端口留下一个不归 PM2 管的旧进程。之后无论怎么覆盖、怎么重启 PM2，都还是旧代码在应答。新的 `一键安装.sh` 会先自动结束占用 3001 的旧进程再启动，执行完看末尾是否打印「后端 1.0.34 已生效」。

要做成空站：用站长登录 → 站务后台 → 总览 → 重置社区，确认词填 `全新社区`。版块、帖子、用户、幽灵版主都会清掉，只留下新站长账号。

### 7. 证书和建站

1. 网站设置 → SSL → Let's Encrypt → 申请 → 打开强制 HTTPS。
2. 浏览器打开 `https://你的域名`，进入 `/setup`。
3. 填社区名称、站长用户名、站长密码，提交。
4. 用这个站长账号登录发帖。

自检：`https://你的域名/api/health` 也能看到 `"ok":true`。

登录失败、发帖转圈：检查第 6 步 `/api/` 反代。打开页面是宝塔欢迎页：根目录还没指到 `frontend/dist`。

### 8. 备份

定期拷这两处：

```text
/www/wwwroot/你的域名/backend/data/
/www/wwwroot/你的域名/backend/uploads/
```

`data` 是论坛数据库，`uploads` 是用户上传的图片。

### 9. 改前端后重新构建

本包已带构建好的 `frontend/dist`，日常使用不用再构建。改了 `frontend/src` 之后：

```bash
cd /www/wwwroot/你的域名/frontend
npm install
npm run build
```

然后重启后端：

```bash
cd /www/wwwroot/你的域名/backend
npm install --omit=dev
pm2 restart qinghu-api
```
