# 🌸 鱼小鳄の个人博客

一个基于 **Node.js + Express + 原生前端（无框架、无构建步骤）** 的个人博客系统：樱花主题、动态 Hero 背景、OC 角色互动、音乐播放器（LRC 歌词同步）、图库、留言板，以及一个开箱即用的**可视化管理面板**。所有数据以 JSON 文件存储，零数据库依赖，`git clone` 后三条命令即可跑起来。

- 博客前台：`http://localhost:3000/`
- 管理面板：`http://localhost:3000/admin.html`（首页左下角的 ⚙️ 图标也能进入）

---

## ✨ 功能特性

### 前台

| 模块 | 说明 |
|------|------|
| 全屏 Hero | 樱花 / 飘雪两套主题 × 早晨 / 下午 / 夜晚三个时段，按本地时间自动切换；带 OC 立绘互动 |
| 文章 | 列表、标签、搜索、归档；`/post/:id` 服务端渲染，自带 OG / SEO 标签 |
| 代码高亮 | 本地内置 highlight.js（`js/vendor/`），不依赖 CDN |
| 评论 | 访客评论，支持贴图；管理员可删除单条或清空某篇文章的评论 |
| 音乐播放器 | 播放上传的音频，LRC 歌词逐行高亮滚动 |
| 图库 | 图片 / 视频瀑布流展示 |
| 留言板 | 访客留言，侧边栏展示最近留言摘要（不暴露邮箱） |
| 氛围特效 | 樱花飘落、雪花、点击粒子、滚动渐显、卡片倾斜、彩蛋 |
| 体验 | 深浅主题（跟随系统或手动）、响应式布局、加载动画、Toast 提示 |

### 管理面板 `/admin.html`

| 页签 | 能做什么 |
|------|----------|
| 📊 概览 | 文章数 / 评论数 / 图片数 / 音乐数 / 访客数、最近文章、当前登录信息 |
| 📝 文章 | 新建、编辑、删除文章；HTML 内容实时预览；插入正文配图（存在 `uploads/posts/`，不混入图库） |
| 💬 评论 | 查看全部评论（含所属文章）、删除单条、清空某篇文章的评论 |
| 🖼️ 相册 | 上传图片 / 视频、删除图库项目 |
| 🎵 音乐 | 上传音频（填标题与歌手）、在线试听、编辑 LRC 歌词、删除 |
| 💌 留言 | 查看留言（含邮箱）、删除 |
| 🎨 站点设置 | 站点标题 / 副标题、头像、横幅图、背景类型与颜色；支持直接上传替换头像与横幅 |
| 🩺 接口自检 | 一键依次请求全部 16 个 API 并对**每一个已上传的媒体文件**做 HEAD 探测，逐行给出状态码与耗时 |

---

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 前端 | HTML5 / CSS3 / 原生 JavaScript（ES5+ 语法，无框架、无打包） |
| 后端 | Node.js（≥ 16）、Express 4 |
| 数据 | JSON 文件存储（`data/`） |
| 认证 | JWT（`jsonwebtoken`）+ bcrypt 密码哈希（`bcryptjs`） |
| 安全 | Helmet（CSP）、express-rate-limit、CORS 白名单 |
| 文件上传 | Multer |

---

## 🚀 快速开始

### 环境要求

- Node.js ≥ 16.0.0
- npm

### 1. 克隆项目

```bash
git clone https://github.com/yuxiaoe666/yuxiaoe-blog.git
cd yuxiaoe-blog        # 目录名以实际仓库为准
```

### 2. 安装依赖

```bash
cd server
npm install
```

### 3. 配置环境变量

Windows：

```powershell
Copy-Item .env.example .env
```

Linux / macOS：

```bash
cp .env.example .env
```

生成管理员密码哈希（**注意用单引号**，避免 shell 解释 `$`）：

```bash
node -e "require('bcryptjs').hash('你的密码', 10).then(h => console.log(h))"
```

生成 JWT 密钥：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

编辑 `server/.env`：

```env
# 管理员用户名
ADMIN_USERNAME=admin

# 管理员密码的 bcrypt 哈希（不是明文！）
ADMIN_PASSWORD_HASH=$2a$10$..........

# JWT 密钥：必填，长度 ≥ 16，缺失或过短服务会拒绝启动
JWT_SECRET=......................

# 服务端口
PORT=3000

# 允许的跨域来源（可选，逗号分隔；不填表示允许全部，生产环境建议填写）
# ALLOWED_ORIGINS=https://your-domain.com
```

> 提示：`dotenv` **不会覆盖已存在的系统环境变量**。如果你用 systemd / Docker / PM2 注入了同名变量，以注入值为准。

### 4. 启动

```bash
npm start          # 等价于 node server.js
```

访问 <http://localhost:3000>，管理面板在 <http://localhost:3000/admin.html>。

Linux 服务器上也可以用根目录的脚本：

```bash
./start.sh         # 自动切换到脚本所在目录的 server/ 后启动
./stop.sh          # 停止
```

---

## 🔐 管理面板使用说明

### 1. 登录

1. 打开 `/admin.html`；
2. 用户名填 `server/.env` 里的 `ADMIN_USERNAME`，密码填你生成 `ADMIN_PASSWORD_HASH` 时使用的**明文密码**；
3. 登录成功后 token 保存在浏览器 `localStorage` 的 `blog_admin_token`，有效期 **24 小时**，过期或后端密钥变更后会自动回到登录页；
4. 右上角「退出登录」可立即清除 token。

### 2. 典型操作流程

- **发一篇文章**：`📝 文章` → `＋ 新建文章` → 填标题 / 日期 / 标签 → 在内容框写 HTML → `👁 预览` 确认 → `💾 保存`。
  文章正文会写入 `data/posts/<id>.html`，索引写入 `data/posts/posts.json`。
- **插一张配图**：编辑文章时在 `🖼 正文配图` 处选图，上传成功后图片地址会自动插入内容框光标处，文件存放在 `server/uploads/posts/`。
- **加一张相册图**：`🖼️ 相册` → `选择文件上传`，上传的文件会出现在前台图库（`server/uploads/gallery/`）。
- **加一首歌**：`🎵 音乐` → 填标题与歌手 → 选择音频文件 → 上传，随后可点击 `歌词` 粘贴 LRC 文本，列表内可直接试听。
- **改站点信息**：`🎨 站点设置` → 修改标题 / 副标题 / 头像 / 横幅 → `保存设置`。头像和横幅也可以直接上传文件。
- **确认一切正常**：`🩺 接口自检` → `▶ 开始自检`。它会检查全部接口（含「未登录应被拒绝」的负向用例）与全部媒体文件，逐行显示结果；只有整体全部通过时才会弹出「自检全部通过 🎉」。

### 3. 面板的边界

- 面板**只做管理**，不能改代码、不能配 SMTP、不能改 `.env`。
- 面板本身**没有额外的二次验证**，安全性完全依赖管理员密码 + JWT 密钥。生产环境请务必：
  - 使用 HTTPS；
  - 不要在公共电脑上勾选保存密码 / 长期不退出；
  - （可选）在 Nginx 层给 `/admin.html` 再加一道 Basic Auth 或 IP 白名单。
- 忘记密码：重新执行上面的 bcrypt 命令，把新哈希填回 `server/.env` 的 `ADMIN_PASSWORD_HASH`，重启服务即可（不需要改用户名）。

### 4. 「管理员权限」到底是什么？

本项目的权限模型只有一层：

> **带 `Authorization: Bearer <token>` 的请求 = 管理员请求。**

`token` 由 `POST /api/auth/login` 用 `.env` 里的账号密码换取，再由 `server/middleware/auth.js` 校验。所有写操作（发文章、删评论、上传文件、改设置……）都只是这类受保护的 HTTP 接口——没有面板时，你只能用 `curl` 或接口调试工具调用它们；现在 `/admin.html` 把同样的接口包成了可视化界面。也就是说：

- 博客前台（`/`、`/post/:id`、`/api/posts` 等）**完全公开**；
- 后台接口在**未带 token 时统一返回 401**；
- 不存在「注册」入口，管理员账号是 `server/.env` 里的固定账号。

---

## 🔌 API 接口

统一前缀 `/api`，请求与响应均为 JSON（上传接口是 `multipart/form-data`）。
「权限」列中 **公开** = 无需认证，**管理员** = 需要 `Authorization: Bearer <token>`。

### 认证

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/login` | 登录，返回 `{ token }`（24h 有效） | 公开 |
| GET | `/api/auth/check` | 校验 token，返回 `{ authenticated, user }` | 管理员 |

### 文章

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/posts?page=1&limit=10` | 文章列表（分页，含 `commentCount`，**不含正文**） | 公开 |
| GET | `/api/posts/:id` | 单篇文章（含 `html` 正文） | 公开 |
| POST | `/api/posts` | 新建文章，body：`{ title, content, tags[] }`（日期取当天） | 管理员 |
| PUT | `/api/posts/:id` | 更新文章，body：`{ title, content, tags[], date }` | 管理员 |
| DELETE | `/api/posts/:id` | 删除文章（同时清理该文章的 HTML 文件与评论） | 管理员 |

### 评论

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/comments/count` | 全站评论总数 | 公开 |
| GET | `/api/comments/:postId` | 某篇文章的评论 | 公开 |
| POST | `/api/comments/:postId` | 发表评论，`multipart`：`author`、`content`、可选 `image` | 公开（20 次 / 10 分钟） |
| GET | `/api/comments/admin/all` | 全部评论（含所属文章标题） | 管理员 |
| DELETE | `/api/comments/admin/:id` | 删除单条评论 | 管理员 |
| DELETE | `/api/comments/admin/post/:postId` | 清空某篇文章的评论 | 管理员 |

### 上传 / 图库 / 站点设置

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/upload` | 上传文件。`multipart` 字段：`type`（`gallery` / `settings` / `posts`，默认 `gallery`）+ `file` | 管理员（50 次 / 10 分钟） |
| GET | `/api/upload/gallery` | 图库列表（每项含 `url`） | 公开 |
| DELETE | `/api/upload/gallery/:id` | 删除图库项目（同时删除磁盘文件） | 管理员 |
| GET | `/api/upload/settings` | 读取站点设置 | 公开 |
| PUT | `/api/upload/settings` | 更新站点设置，仅接受 `banner`、`avatar`、`bg_type`、`bg_value`、`site_title`、`site_subtitle` | 管理员 |

> ⚠️ `type` 字段必须排在 `file` **之前**，否则 Multer 先解析到文件、读不到 `type`，会被当作 `gallery` 处理。

### 音乐

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/music` | 音乐列表（每项含 `url`：`/uploads/music/<文件>`） | 公开 |
| GET | `/api/music/:id` | 单首歌曲（含 `lyrics`） | 公开 |
| POST | `/api/music` | 上传音乐，`multipart`：`title`、`artist`、`file` | 管理员 |
| PUT | `/api/music/:id/lyrics` | 更新歌词，body：`{ lyrics: "[00:01.50]第一句\n[00:05.20]第二句" }` | 管理员 |
| DELETE | `/api/music/:id` | 删除音乐（同时删除磁盘文件） | 管理员 |

### 留言 / 访客 / 站点

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/contacts` | 提交留言，body：`{ name, email?, message }` | 公开（10 次 / 10 分钟） |
| GET | `/api/contacts/public?limit=5` | 最近留言摘要（**不含邮箱**） | 公开 |
| GET | `/api/contacts` | 全部留言（含邮箱） | 管理员 |
| DELETE | `/api/contacts/:id` | 删除留言 | 管理员 |
| GET | `/api/visitor` | 读取访客计数 | 公开 |
| POST | `/api/visitor` | 访客计数 +1，返回最新计数 | 公开 |
| GET | `/rss.xml` | RSS 订阅源 | 公开 |
| GET | `/sitemap.xml` | 站点地图（按文章列表生成） | 公开 |
| GET | `/robots.txt` | 爬虫规则 | 公开 |
| GET | `/post/:id` | 文章详情页（服务端渲染） | 公开 |
| GET | `/404` | 404 页面 | 公开 |

未匹配的 `/api/*` 返回 `404 {"error":"接口不存在"}`；未匹配的其他路径返回 404 页面（不做软 404）。
`/server`、`/data`、`/.env`、`/.git`、`/node_modules` 等敏感路径一律返回 404。

### 限流与体积限制

| 范围 | 限制 |
|------|------|
| 全站（按 IP） | 300 次 / 15 分钟 |
| `POST /api/auth/login` | 10 次 / 15 分钟 |
| `POST /api/comments/:postId` | 20 次 / 10 分钟 |
| `POST /api/contacts` | 10 次 / 10 分钟 |
| `/api/upload` | 50 次 / 10 分钟 |
| JSON 请求体 | ≤ 2 MB |
| 图片 / 视频 | ≤ 10 MB，`jpg/jpeg/png/gif/webp/mp4/webm` |
| 音频 | ≤ 50 MB，`mp3/wav/ogg/flac/m4a/aac/wma` |
| 评论配图 | ≤ 10 MB，`jpg/jpeg/png/gif/webp` |

---

## 🧪 使用示例（curl）

### 登录并拿到 token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

返回：

```json
{ "token": "eyJhbGciOi...", "message": "登录成功" }
```

后续示例中的 `$TOKEN` 请替换成上面拿到的值：

```bash
TOKEN=eyJhbGciOi...
```

### 认证状态与文章

```bash
curl http://localhost:3000/api/auth/check -H "Authorization: Bearer $TOKEN"
curl "http://localhost:3000/api/posts?page=1&limit=5"

curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"我的第一篇博客","content":"<p>Hello World!</p>","tags":["技术","生活"]}'

curl -X PUT http://localhost:3000/api/posts/3 \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"改个标题","content":"<p>更新后的正文</p>","tags":["随笔"],"date":"2026-03-01"}'

curl -X DELETE http://localhost:3000/api/posts/3 -H "Authorization: Bearer $TOKEN"
```

### 上传文件（注意 `type` 在 `file` 之前）

```bash
# 进图库（默认）
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "type=gallery" -F "file=@/path/to/image.jpg"

# 站点素材（头像 / 横幅）
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "type=settings" -F "file=@/path/to/avatar.png"

# 文章正文配图（不进入图库）
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "type=posts" -F "file=@/path/to/inline.png"
```

返回：`{"url":"/uploads/gallery/xxxx.jpg","filename":"xxxx.jpg","originalName":"image.jpg","type":"image","target":"gallery"}`

### 音乐与歌词

```bash
curl -X POST http://localhost:3000/api/music \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=示例歌曲" -F "artist=示例歌手" -F "file=@/path/to/song.mp3"

curl -X PUT http://localhost:3000/api/music/1/lyrics \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"lyrics":"[00:01.50]第一句歌词\n[00:05.20]第二句歌词"}'

curl http://localhost:3000/api/music
curl -X DELETE http://localhost:3000/api/music/1 -H "Authorization: Bearer $TOKEN"
```

### 留言与设置

```bash
curl -X POST http://localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"访客","email":"me@example.com","message":"你好呀"}'

curl http://localhost:3000/api/contacts                -H "Authorization: Bearer $TOKEN"
curl -X DELETE http://localhost:3000/api/contacts/1    -H "Authorization: Bearer $TOKEN"

curl -X PUT http://localhost:3000/api/upload/settings \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"site_title":"鱼小鳄sugary","site_subtitle":"记录我那些不太起眼的日常","avatar":"/uploads/gallery/1.jpg"}'
```

### 部署后自检清单

```bash
curl -s -o /dev/null -w "首页 %{http_code}\n"       http://localhost:3000/
curl -s -o /dev/null -w "面板 %{http_code}\n"       http://localhost:3000/admin.html
curl -s -o /dev/null -w "RSS %{http_code}\n"        http://localhost:3000/rss.xml
curl -s -o /dev/null -w "敏感路径应 404 %{http_code}\n" http://localhost:3000/server/.env
curl -s http://localhost:3000/api/music | head -c 300      # 音乐应返回 url
curl -sI http://localhost:3000/uploads/music/xxx.mp3       # 媒体文件应 200
```

面板的 `🩺 接口自检` 页签会把上面这些检查一次做完，并且额外校验每一个媒体文件。

---

## 🎵 音乐与歌词说明

- 支持的格式：`mp3 / wav / ogg / flac / m4a / aac / wma`，单文件 ≤ 50 MB。
- 上传后文件落在 `server/uploads/music/`，文件名会被改写为 UUID，元数据写入 `data/music.json`。
- 前台播放器（`js/music.js`）按 `GET /api/music` 返回的顺序播放，支持点击进度条跳转与歌词逐行同步高亮。
- 歌词使用 **LRC** 格式，时间戳 `[mm:ss.xx]` 或 `[mm:ss.xxx]`，可多行、可重复标记：

  ```lrc
  [00:00.00]歌名 - 歌手
  [00:12.30]第一句歌词
  [00:16.85]第二句歌词
  ```

  没有时间戳的纯文本行会被当作普通文本处理，不会同步高亮。
- 歌词为空时播放器只显示歌曲信息，不影响播放。
- 若面板 `🎵 音乐` 列表里的试听没有声音，先看 `🩺 接口自检` 的媒体检查结果：文件被删除或尚未上传会显示 ❌。

## 🖼️ 媒体目录与 Hero 背景

```
server/uploads/
├── gallery/     # 图库（图 + 视频）
├── settings/    # 头像、横幅等站点素材
├── posts/       # 文章正文配图
├── music/       # 音频
├── comments/    # 评论配图
└── hero/        # Hero 背景与 OC 立绘
```

Hero 背景按 `uploads/hero/<weather>-<period>.*` 命名查找（依次尝试 `.webp` → `.jpg` → `.png`）：

| 文件 | 用途 |
|------|------|
| `sakura-morning.*` / `sakura-afternoon.*` / `sakura-night.*` | 樱花主题的早晨 / 下午 / 夜晚背景 |
| `snow-morning.*` / `snow-afternoon.*` / `snow-night.*` | 飘雪主题的三个时段背景 |
| `oc.*`（`.webp` → `.png` → `.jpg`） | OC 立绘，缺失时自动隐藏 |

时段由浏览器本地时间自动判断，用户也可以在页面上手动切换。缺哪个文件就少哪张背景，不会报错。

## 🎨 主题自定义

### 改配色

编辑 `css/style.css` 顶部的 CSS 变量：

```css
:root {
  --pink-300: #f9a8d4;
  --pink-400: #f472b6;
  --pink-500: #ec4899;
  --pink-600: #db2777;
  --pink-700: #be185d;
}
```

管理面板的配色独立在 `css/admin.css`（前缀 `--a-*`），改前台样式不会影响面板。

### 改站点信息

优先用面板 `🎨 站点设置`，也可以直接改 `data/settings.json`：

```json
{
  "site_title": "你的博客标题",
  "site_subtitle": "你的副标题",
  "avatar": "/uploads/gallery/your-avatar.jpg",
  "banner": "/uploads/gallery/your-banner.jpg"
}
```

`banner`（分享卡片图）、`site_title`、`site_subtitle` 会注入首页与文章页的 OG / SEO 标签。设置里的 `bg_type`、`bg_value` 目前只是保留字段（面板可读写，前台暂未使用背景色配置）。

### 数据存储与备份

- 文章索引 `data/posts/posts.json` + 每篇正文 `data/posts/<id>.html`
- 运行时数据：`data/comments.json`、`data/contacts.json`、`data/gallery.json`、`data/music.json`、`data/settings.json`、`data/visitors.json`
- 备份 = 打包 `data/` 与 `server/uploads/` 两个目录即可。

---

## 📦 生产部署

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 支持音乐上传（默认 1m 会直接 413）
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # （可选）给管理面板再加一层保护
    # location = /admin.html {
    #     auth_basic "Admin";
    #     auth_basic_user_file /etc/nginx/.htpasswd;
    #     proxy_pass http://127.0.0.1:3000;
    # }
}
```

> 服务端已开启 `trust proxy`，限流按真实 IP 统计。

### systemd 守护进程

`/etc/systemd/system/blog.service`：

```ini
[Unit]
Description=Blog Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/blog/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now blog
```

### 目录权限

服务需要对 `data/` 与 `server/uploads/` 有写权限：

```bash
sudo chown -R www-data:www-data data server/uploads
```

---

## 🔒 安全说明

1. **`ADMIN_PASSWORD_HASH` 必须是 bcrypt 哈希**，不要写明文；本项目**不提供任何默认密码**，未配置时登录接口返回 `503`。
2. **`JWT_SECRET` 必须自己生成且保密**（≥ 16 位）。它一旦泄露，任何人都能自己签一个管理员 token；一旦更换，所有已登录会话立即失效。服务启动时若缺失会直接报错退出。
3. **不要把 `server/.env` 提交到仓库**（`.gitignore` 已排除）。
4. 历史上如果曾经的密码哈希 / JWT 密钥进过公开仓库，请**重新生成并替换**（等价于改密码 + 强制所有人重新登录）。
5. 生产环境用 HTTPS，并按需设置 `ALLOWED_ORIGINS` 限制跨域来源。
6. 上传文件已做类型白名单、大小限制与路径穿越校验；`/uploads` 是公开静态目录，请不要往里放敏感文件。
7. 敏感目录（`/server`、`/data`、`/.env`、`/node_modules`）已由中间件拦截为 404。
8. 建议定期备份 `data/` 与 `server/uploads/`。

---

## 📁 项目结构

```
个人博客/
├── admin.html                  # 管理面板页面 → /admin.html
├── index.html                  # 前台入口（hash 路由：#/home、#/posts、#/archives、#/gallery、#/music、#/contact）
├── post.html                   # 文章详情模板（服务端替换 {{...}} 占位符）
├── css/
│   ├── style.css               # 前台样式（含深浅主题）
│   └── admin.css               # 管理面板样式
├── js/
│   ├── admin.js                # 管理面板逻辑（登录、增删改查、接口自检）
│   ├── app.js                  # 前台核心：路由 / 请求封装 / 页面切换
│   ├── home.js posts.js archives.js gallery.js music.js message-board.js life.js mood.js
│   ├── hero.js sakura.js snow.js click-spark.js scroll.js tilt.js easter-egg.js modal.js
│   └── vendor/highlight.min.js # 代码高亮（本地内置）
├── data/
│   ├── posts/                  # posts.json 索引 + 每篇文章的 HTML（需要提交）
│   ├── comments.json           # 评论（运行时，已 gitignore）
│   ├── contacts.json           # 留言（运行时，已 gitignore）
│   ├── gallery.json            # 图库索引（运行时，已 gitignore）
│   ├── music.json              # 音乐索引（运行时，已 gitignore）
│   ├── settings.json           # 站点设置（运行时，已 gitignore）
│   └── visitors.json           # 访客计数（运行时，已 gitignore）
├── server/
│   ├── server.js               # 入口：中间件、静态资源、SEO、404、错误处理
│   ├── db/init.js              # JSON 数据读写
│   ├── middleware/auth.js      # JWT 校验 + 密钥校验
│   ├── routes/                 # auth / posts / comments / upload / music / contacts
│   ├── uploads/                # 用户上传的媒体（已 gitignore）
│   ├── .env.example            # 环境变量模板
│   └── package.json
├── start.sh / stop.sh          # Linux 启停脚本（自动定位脚本所在目录）
├── .gitignore
└── README.md
```

> `data/posts/` 会随仓库一起提交（你的文章就在里面）；`data/*.json` 与 `server/uploads/` 被忽略，克隆后是全新的空站点。如果连草稿目录也不希望公开，取消 `.gitignore` 里 `# data/posts/暂未写好/` 那行的注释。

---

## ❓ 常见问题

| 现象 | 原因 / 解决 |
|------|-------------|
| 启动即退出，日志提示 `JWT_SECRET` | `server/.env` 里 `JWT_SECRET` 为空或短于 16 位 |
| 登录返回 `503 服务器未配置管理员密码` | `ADMIN_PASSWORD_HASH` 为空，按上文重新生成 |
| 登录返回 `401 用户名或密码错误` | 用户名与 `ADMIN_USERNAME` 不一致，或密码与哈希不匹配 |
| 面板一直弹回登录页 | token 过期（24h）或 `JWT_SECRET` 换过，重新登录即可 |
| 上传返回 `400 上传字段名不正确` | 表单字段名必须是 `file`；用 curl 时确保 `type` 在 `-F "file=..."` 之前 |
| 上传返回 `413` | 超过大小限制，或 Nginx `client_max_body_size` 太小 |
| 克隆下来图库 / 音乐是空的 | `server/uploads/` 不进版本库，需要自己重新上传 |
| 面板打不开 404 | `admin.html` 必须位于项目根目录（静态根目录） |
| 图片上传成功但前台不显示 | 地址要以 `/uploads/...` 开头，且文件确实存在于对应目录 |
| 中文乱码 | 项目文件统一 UTF-8；Windows PowerShell 查看请加 `-Encoding UTF8` |

---

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。
