# 青葫三楼

玩机与游戏互助社区论坛，对标葫芦侠三楼的社区玩法：版块、楼层回复、签到葫芦、等级头衔、关注流、排行与兑换。

安装包：`qinghu-sanlou-1.0.0.zip`。线上环境推荐 **Ubuntu 22.04 LTS 64 位** + 宝塔 + Node 22。更细的点选说明见 `INSTALL-BAOTA.md`。

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
2. 文件 → 进入 `/www/wwwroot/你的域名/`，上传 `qinghu-sanlou-1.0.0.zip`，右键解压。
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
    client_max_body_size 16m;

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
        proxy_read_timeout 60s;
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

1. 宝塔文件进入 `/www/wwwroot/你的域名/`，这里要直接能看到 `backend` 和 `frontend`。
2. 上传 `qinghu-sanlou-1.0.0.zip`，右键解压，选覆盖已有文件。
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
