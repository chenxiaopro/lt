# 青葫三楼 · 宝塔全新安装保姆级教程

按「点哪里、填什么、看到什么」写。从上到下做，每做完一步再做下一步。

下面所有「你的域名」都换成自己的，例如 `bbs.abc.com`。
下面所有「服务器IP」都换成云服务器公网 IP，例如 `123.45.67.89`。

---

## 开始前准备 3 样东西

1. 一台已经安装好「宝塔面板」的 Linux 云服务器。
2. 一个域名，已经在域名后台把 **A 记录** 解析到这台服务器的公网 IP。解析生效大约 1～10 分钟。
3. 本安装包：`qinghu-sanlou-1.0.0.zip`（空库全新安装，没有演示账号）。

云服务器安全组 / 防火墙请放行 **80** 和 **443**。不要放行 3001。

---

## 第 1 步：登录宝塔面板

1. 浏览器打开：`http://服务器IP:8888`
2. 输入安装宝塔时给你的账号、密码。
3. 能看到左侧菜单（网站、软件商店、文件、终端）即登录成功。

---

## 第 2 步：安装 3 个软件

点左侧 **软件商店**，按下面 3 个名字分别搜索并安装。已安装的跳过。

1. **Nginx**
   搜索 `Nginx` → 点「安装」→ 选稳定版 → 等安装完成。
2. **Node.js版本管理器**
   搜索 `Node.js版本管理器` → 安装 → 打开设置 → **优先安装 22.x**。没有 22 就装 18.x。
   装好后把刚装的版本设为默认。
3. **PM2管理器**
   搜索 `PM2管理器` → 安装。

装完这 3 个，继续下一步。

**版本管理器里没有 20.x，或 20.x 点了装不上：**

1. 同一个设置页里，改装 **22.x**。有 22 就装 22。
2. 没有 22，就装 **18.x**。
3. 装好后把刚装的版本设为默认。
4. 打开宝塔 **终端**，输入下面两行，回车后应看到 `v18` 或 `v22` 开头的版本号：

```bash
node -v
npm -v
```

本程序支持 Node 18 / 20 / 22，不必死盯 20.x。

如果「Node.js版本管理器」整个搜不到、安装失败、或装完终端里 `node -v` 仍提示找不到命令，先跳过这个软件，去做第 3 步，然后看文末 **「附录：终端安装 Node」**。

---

## 第 3 步：安装编译工具（必须做，否则后端装不上）

后端数据库用到 `better-sqlite3`，需要系统能编译原生模块。

1. 宝塔左侧点 **终端**。
2. 整段复制下面命令，粘贴到终端，回车。

如果你的系统是 Debian / Ubuntu（宝塔多数是这个）：

```bash
# 安装编译工具，装完即可关掉终端
apt-get update
apt-get install -y build-essential python3
```

如果是 **CentOS 8 / Rocky / AlmaLinux**（yum / dnf）：

```bash
# 安装编译工具
yum install -y gcc-c++ make python3
```

如果是 **CentOS 7**（你现在这台就是 7.9），系统自带 gcc 4.8 太旧，必须装 gcc 7：

```bash
# CentOS 7 专用：安装 gcc 7
yum install -y centos-release-scl
yum install -y devtoolset-7-gcc devtoolset-7-gcc-c++ make python3
```

看到没有红色报错，就可以继续。

---

## 第 4 步：添加一个网站

1. 左侧点 **网站** → 右上角 **添加站点**。
2. 按下面填：
   - **域名**：填你的域名，例如 `bbs.abc.com`
   - **根目录**：先保持默认（例如 `/www/wwwroot/bbs.abc.com`），后面会改。
   - **PHP版本**：选 **纯静态**。
   - **数据库**：不创建。
   - **FTP**：不创建。
3. 点 **提交**。

提交成功后，网站列表里会出现你的域名。

---

## 第 5 步：上传安装包并解压

1. 左侧点 **文件**。
2. 进入目录：`/www/wwwroot/你的域名/`
   例如 `/www/wwwroot/bbs.abc.com/`
3. 点上方 **上传**，把电脑上的 `qinghu-sanlou-1.0.0.zip` 传上去。等上传 100%。
4. 在文件列表里找到这个 zip，**右键 → 解压** → 确定。
5. 解压后会出现文件夹 `qinghu-sanlou`。点进去，你会看到：
   - `backend`
   - `frontend`
   - `deploy`
   - `INSTALL-BAOTA.md`
   - `一键安装.sh`
   - `README.md`
6. **把这些内容移到上一层**（很重要，不要少这一步）：
   - 在 `qinghu-sanlou` 文件夹里，全选上面这些文件和文件夹。
   - 点「剪切」。
   - 点路径栏回到 `/www/wwwroot/你的域名/`。
   - 点「粘贴」。
   - 空的 `qinghu-sanlou` 文件夹可以右键删除。zip 也可以删。

完成后，`/www/wwwroot/你的域名/` 里应直接能看到 `backend` 和 `frontend` 两个文件夹。

---

## 第 6 步：改网站根目录，指向前端产物

前端已经构建好了，网站根目录必须指向 `frontend/dist`。

1. 左侧 **网站** → 找到你的域名 → 点 **设置**（或根目录那一列的文件夹图标）。
2. 找到 **网站目录** / **根目录**。
3. 改成：

```text
/www/wwwroot/你的域名/frontend/dist
```

例如：`/www/wwwroot/bbs.abc.com/frontend/dist`

4. 保存。

运行目录保持默认即可。

---

## 第 7 步：一键安装后端（推荐）

1. 左侧点 **终端**。
2. 把下面 2 行整段复制粘贴，**先把路径里的域名换成你的**，再回车：

```bash
# 进入网站目录并执行一键安装
cd /www/wwwroot/你的域名
bash 一键安装.sh
```

例如：

```bash
cd /www/wwwroot/bbs.abc.com
bash 一键安装.sh
```

3. 等待出现「后端已启动」。
4. 自检：浏览器打开 `http://服务器IP:3001/api/health`
   - 能看到带 `"ok":true` 的一串字，说明后端活了。
   - 如果打不开，先不要慌，看本页最后「常见问题」。很多情况下 3001 本机可访问、外网打不开是正常的（本来就不该对外开放 3001）。

在宝塔终端里再验证一次：

```bash
# 本机检查后端是否启动成功
curl http://127.0.0.1:3001/api/health
```

看到 `"ok":true` 即可。

---

## 第 8 步：如果一键脚本提示没有 PM2，用图形界面启动

多数情况第 7 步已经启动成功，本步可跳过。

### 方法 A：宝塔 Node 项目

1. 左侧 **网站** → 上方或左侧找到 **Node项目**。
2. 点 **添加 Node 项目**，按下面填：
   - **项目目录**：`/www/wwwroot/你的域名/backend`
   - **启动文件**：`server.js`
   - **项目端口**：`3001`
   - **运行方式 / 模式**：选 **Fork**（不要选 Cluster）
   - **包管理器**：npm
3. 提交 / 启动。
4. 状态变成「运行中」即成功。

### 方法 B：PM2 管理器

1. 软件商店打开 **PM2管理器**。
2. 添加项目：
   - 项目路径：`/www/wwwroot/你的域名/backend`
   - 启动文件：`server.js`
   - 名称：`qinghu-api`
3. 启动后状态为 online。

---

## 第 9 步：改 Nginx 配置（让网页能找到接口）

这一步是新手最容易漏的。不改的话，页面能打开，但登录、发帖会失败。

1. 左侧 **网站** → 你的域名 → **设置** → **配置文件**。
2. 你会看到一大段 `server { ... }`。
3. **不要整份覆盖。** 只改/加下面这几处（域名、路径换成你的）：

把 `root` 那一行改成：

```nginx
root /www/wwwroot/你的域名/frontend/dist;
```

把 `index` 保持：

```nginx
index index.html;
```

在 `server { }` 里面、其他 `location` 附近，加入（如果已经有同名 location 就改成下面这样）：

```nginx
client_max_body_size 16m;

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
    alias /www/wwwroot/你的域名/backend/uploads/;
    expires 30d;
    access_log off;
}

location / {
    try_files $uri $uri/ /index.html;
}
```

4. 点 **保存**。宝塔会自动重载 Nginx。

完整对照文件在安装包里：`deploy/baota-nginx.conf`。那份是「整份示例」，真正改的时候仍建议只改你面板里已有配置，**保留宝塔自动生成的 SSL 证书那两行**。

---

## 第 10 步：申请 HTTPS 证书

1. 网站 → 你的域名 → **设置** → **SSL**。
2. 选 Let's Encrypt（宝塔叫「申请证书」/「Let's Encrypt」）。
3. 勾选你的域名 → 申请。
4. 申请成功后打开 **强制 HTTPS**。

如果申请失败，多半是域名还没解析到这台服务器，等解析生效再申请。

---

## 第 11 步：打开网站，走安装向导

1. 浏览器打开：`https://你的域名`
2. 会自动跳到 `/setup` 安装向导（类似 Discuz 的 install.php）。
3. 填写：
   - 社区名称
   - 社区简介（可空）
   - 站长用户名
   - 站长密码（请自己记住）
4. 提交。成功后进入首页。
5. 用刚才的站长账号登录，即可发帖、建版块、管用户。

这是空库全新安装，没有演示账号。

---

## 第 12 步：确认安装成功

逐项打勾：

- 打开 `https://你的域名` 能看到青葫三楼页面。
- 打开 `https://你的域名/api/health` 能看到 `"ok":true`。
- 安装向导只出现一次，装完再访问首页不再跳 `/setup`。
- 能登录、能发帖、能上传图片。

---

## 日常备份（建议每周一次）

只要拷这两处：

```text
/www/wwwroot/你的域名/backend/data/
/www/wwwroot/你的域名/backend/uploads/
```

`data` 里是论坛数据库，`uploads` 里是用户上传的图片。

---

## 常见问题

### 1. 执行 `bash 一键安装.sh` 报错，出现 node-gyp / better-sqlite3

第 3 步的编译工具没装。回到第 3 步执行 `apt-get install -y build-essential python3`，再重新运行一键安装。

### 2. 页面能打开，但登录、发帖转圈失败

Nginx 没反代 `/api`。回到第 9 步检查 `location /api/` 是否存在，保存后重载。

浏览器按 F12 →「网络」，看 `/api/...` 是不是 404 或 502。

- 404：location /api/ 没配，或网站根目录指错。
- 502：后端没启动。去 PM2 / Node项目 看是否 online，或终端执行：

```bash
# 查看后端是否在跑
pm2 status
pm2 logs qinghu-api
```

### 3. 刷新某个帖子页面变成 404

缺了这一段：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 4. 网站根目录填错，打开是宝塔默认欢迎页或空白

根目录必须是：

```text
/www/wwwroot/你的域名/frontend/dist
```

这个目录里应该能看到 `index.html`。如果没有 `index.html`，说明第 5 步解压/移动文件没做对。

### 5. 打开网站没有安装向导，直接进了论坛

说明数据库不是空的。本安装包默认是空库。如果你之前试过安装，需要停掉后端后删掉数据库再启动：

```bash
# 停后端、清空数据库后重新启动（会丢失已有帖子）
pm2 stop qinghu-api
cd /www/wwwroot/你的域名/backend
# 把 data 目录里的 forum.db 及相关文件移走备份即可，不要在生产误操作
pm2 start qinghu-api
```

更稳妥的做法：在宝塔「文件」里进入 `backend/data/`，把 `forum.db`、`forum.db-wal`、`forum.db-shm` 先剪切到别的备份目录，再重启 Node 项目。

### 6. 申请 SSL 失败

- 域名 A 记录是否已指向这台服务器 IP。
- 云服务器安全组是否放行 80。
- 先用 `http://你的域名` 能打开页面，再申请证书。

### 7. 上传图片失败

确认 Nginx 里有 `client_max_body_size 16m;`，并且 `backend/uploads` 目录存在、可写。一键安装会自动创建这个目录。

### 8. 端口 3001 要不要在宝塔安全里放行？

不要。3001 只给本机 Nginx 反代使用。对外只开 80 和 443。

---

## 以后改前端代码怎么更新？

本包已经带了构建好的 `frontend/dist`，日常使用不用再构建。

如果你改了 `frontend/src` 里的代码：

```bash
# 重新构建前端
cd /www/wwwroot/你的域名/frontend
npm install
npm run build
```

构建完成后 Nginx 会直接读新的 dist，一般不用重启。改了后端 js 则需要：

```bash
# 重启后端
pm2 restart qinghu-api
```

---

## 附录：终端安装 Node（版本管理器没有 20.x 时用）

本程序能跑 **Node 18 / 20 / 22**。宝塔软件商店里没有 20.x 时，按下面顺序试。

### A. 版本管理器里改装 22 或 18

1. 软件商店 → 已安装 → 找到 **Node.js版本管理器** → 设置。
2. 版本列表里点 **22.x** 安装。没有 22 就装 **18.x**。
3. 把刚装的版本设为默认。
4. 终端执行：

```bash
node -v
npm -v
```

看到 `v22...` 或 `v18...` 就可以回去做第 7 步 `bash 一键安装.sh`。

有的宝塔把这个软件叫「Node版本管理器」，分类在「运行环境」里。

### B. 整个版本管理器装不上

用安装包自带的脚本，不经过软件商店。

1. 先完成第 3 步（编译工具）和第 5 步（zip 已解压到网站目录）。
2. 宝塔左侧点 **终端**，路径换成你的域名后整段粘贴：

```bash
# 用国内镜像安装 Node 22
cd /www/wwwroot/你的域名
bash 安装Node.sh
```

例如：

```bash
cd /www/wwwroot/bbs.abc.com
bash 安装Node.sh
```

3. 等到脚本打印 `node 版本：v22.14.0`。
4. 再执行：

```bash
bash 一键安装.sh
```

### C. 脚本也失败时，手动复制这 6 行

适用于 **CentOS 8 / Rocky / Ubuntu** 等较新系统（x86_64）。**CentOS 7 不要用这一段**，请看下面的 D。

```bash
# 下载 Node 22 官方二进制（淘宝镜像）
mkdir -p /www/server/nodejs
cd /tmp
wget -O node22.tar.gz https://npmmirror.com/mirrors/node/v22.14.0/node-v22.14.0-linux-x64.tar.gz
tar -xzf node22.tar.gz -C /www/server/nodejs
ln -sf /www/server/nodejs/node-v22.14.0-linux-x64/bin/node /usr/bin/node
ln -sf /www/server/nodejs/node-v22.14.0-linux-x64/bin/npm /usr/bin/npm
node -v
```

最后一行应输出 `v22.14.0`。然后再去网站目录执行 `bash 一键安装.sh`。

### D. CentOS 7.9 专用（你现在这台机器）

CentOS 7 的 glibc 是 2.17。宝塔软件商店里的 Node 20/22、以及 nodejs.org 官方安装包，在这台机器上会报 `GLIBC_2.27 not found`。按下面 4 段命令做。

先完成教程第 4、5 步：网站已添加，zip 已解压到 `/www/wwwroot/你的域名/`。

**第 1 段：装 gcc 7**

```bash
yum install -y centos-release-scl
yum install -y devtoolset-7-gcc devtoolset-7-gcc-c++ make python3
```

**第 2 段：装兼容 CentOS 7 的 Node 22**

把路径里的域名换成你的：

```bash
cd /www/wwwroot/你的域名
bash 安装Node.sh
```

脚本会自动下载 `node-v22.14.0-linux-x64-glibc-217`。结束后执行：

```bash
node -v
```

应显示 `v22.14.0`。

如果脚本失败，手动粘贴：

```bash
mkdir -p /www/server/nodejs
cd /tmp
wget -O node22.tar.gz https://unofficial-builds.nodejs.org/download/release/v22.14.0/node-v22.14.0-linux-x64-glibc-217.tar.gz
tar -xzf node22.tar.gz -C /www/server/nodejs
ln -sf /www/server/nodejs/node-v22.14.0-linux-x64-glibc-217/bin/node /usr/bin/node
ln -sf /www/server/nodejs/node-v22.14.0-linux-x64-glibc-217/bin/npm /usr/bin/npm
node -v
```

**第 3 段：安装并启动后端**

```bash
cd /www/wwwroot/你的域名
bash 一键安装.sh
```

自检：

```bash
curl http://127.0.0.1:3001/api/health
```

看到 `"ok":true` 后，回到教程第 6 步改网站根目录，再做第 9 步 Nginx。

长期更稳的做法是把系统换成 Rocky 9 / AlmaLinux 9 / Ubuntu 22.04。上面这套可以让 CentOS 7 先跑起来。
