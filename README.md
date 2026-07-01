# 🌸 鱼小鳄の个人博客

一个基于 Node.js + Express + 原生前端的个人博客系统，具有樱花主题、动态背景、OC 角色互动等特色功能。

## ✨ 功能特性

### 页面功能
- 🌸 **全屏 Hero 区域**：动态背景、OC 角色展示、时间段切换（早晨/下午/夜晚/自动）
- 🎨 **樱花飘落效果**：Canvas 实现的动态樱花动画
- 📝 **文章列表**：支持标签、搜索、分类展示
- 💬 **评论系统**：访客评论、管理员审核删除
- 🎵 **音乐播放器**：支持歌词同步显示
- 🖼️ **图库展示**：瀑布流图片/视频画廊
- 📞 **联系表单**：邮件发送功能（需配置 SMTP）

### 交互体验
- 🎭 **深浅主题切换**：跟随系统设置或手动切换
- 📱 **响应式设计**：适配桌面端和移动端
- ⚡ **加载动画**：优雅的页面加载过渡效果
- 🔔 **Toast 提示**：操作反馈通知

### 管理后台（API）
- 🔐 **管理员登录**：JWT 令牌认证
- 📄 **文章管理**：创建、编辑、删除文章
- 🗑️ **评论管理**：查看、删除评论
- 📤 **文件上传**：图片、视频、音乐上传
- 🎶 **音乐管理**：上传、删除音乐及歌词

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| 前端 | HTML5 / CSS3 / JavaScript (ES6+) |
| 后端 | Node.js / Express |
| 数据库 | JSON 文件存储（轻量级） |
| 认证 | JWT |
| 安全 | Helmet / Rate Limiting |
| 文件上传 | Multer |

## 📦 安装部署

### 环境要求
- Node.js ≥ 16.0.0
- npm / yarn

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/your-username/your-blog.git
cd blog
```

2. **安装依赖**
```bash
cd server
npm install
```

3. **配置环境变量**

复制 `server/.env` 文件并修改：
```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：
```env
# 管理员账号（请务必修改！）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password

# JWT 密钥（请替换为随机长字符串）
JWT_SECRET=your-secret-key

# 服务端口
PORT=3000

# 上传文件大小限制（MB）
MAX_FILE_SIZE=10
```

4. **启动服务**
```bash
npm start
```

访问 `http://localhost:3000` 即可查看博客。

### 生产部署

#### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|webp|svg|css|js|mp3|mp4|webm)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 使用 systemd 守护进程

创建 `/etc/systemd/system/blog.service`：
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

启动并设置开机自启：
```bash
sudo systemctl daemon-reload
sudo systemctl start blog
sudo systemctl enable blog
```

## 📁 项目结构

```
blog/
├── css/                    # 样式文件
│   └── style.css           # 全局样式
├── data/                   # 数据目录（运行时生成）
│   ├── posts/              # 文章内容
│   ├── comments.json       # 评论数据
│   ├── contacts.json       # 联系表单数据
│   ├── gallery.json        # 图库数据
│   ├── music.json          # 音乐数据
│   └── settings.json       # 站点设置
├── js/                     # 前端脚本
│   ├── main.js             # 主逻辑
│   ├── bg-canvas.js        # 背景画布
│   ├── sakura.js           # 樱花效果
│   └── modal.js            # 模态框
├── server/                 # 后端服务
│   ├── db/                 # 数据库模块
│   │   └── init.js         # JSON 数据库初始化
│   ├── middleware/         # 中间件
│   │   └── auth.js         # JWT 认证中间件
│   ├── routes/             # API 路由
│   │   ├── auth.js         # 认证接口
│   │   ├── posts.js        # 文章接口
│   │   ├── comments.js     # 评论接口
│   │   ├── upload.js       # 上传接口
│   │   ├── music.js        # 音乐接口
│   │   └── contacts.js     # 联系接口
│   ├── uploads/            # 上传文件目录
│   ├── .env                # 环境变量
│   ├── package.json        # 依赖配置
│   └── server.js           # 服务入口
├── index.html              # 首页模板
├── post.html               # 文章详情模板
├── start.sh                # 启动脚本（Linux）
├── stop.sh                 # 停止脚本（Linux）
└── .gitignore              # Git 忽略配置
```

## 🔌 API 接口

### 认证接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/login` | 管理员登录 | 公开 |
| GET | `/api/auth/check` | 检查认证状态 | 管理员 |

### 文章接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/posts` | 获取所有文章 | 公开 |
| GET | `/api/posts/:id` | 获取单篇文章 | 公开 |
| POST | `/api/posts` | 创建文章 | 管理员 |
| PUT | `/api/posts/:id` | 更新文章 | 管理员 |
| DELETE | `/api/posts/:id` | 删除文章 | 管理员 |

### 评论接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/comments/:postId` | 获取文章评论 | 公开 |
| POST | `/api/comments/:postId` | 发表评论 | 公开（限流） |
| GET | `/api/comments/admin/all` | 查看所有评论 | 管理员 |
| DELETE | `/api/comments/admin/:id` | 删除单条评论 | 管理员 |
| DELETE | `/api/comments/admin/post/:postId` | 清空文章评论 | 管理员 |

### 上传接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/upload` | 上传文件 | 管理员 |
| GET | `/api/upload/gallery` | 获取图库列表 | 公开 |
| DELETE | `/api/upload/gallery/:id` | 删除图库项目 | 管理员 |
| GET | `/api/upload/settings` | 获取站点设置 | 公开 |
| PUT | `/api/upload/settings` | 更新站点设置 | 管理员 |

### 音乐接口

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/music` | 获取音乐列表 | 公开 |
| POST | `/api/music` | 上传音乐 | 管理员 |
| DELETE | `/api/music/:id` | 删除音乐 | 管理员 |

## 🚀 使用示例

### 登录获取 Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

返回：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "登录成功"
}
```

### 创建文章

```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "title": "我的第一篇博客",
    "content": "<p>Hello World!</p>",
    "tags": ["技术", "生活"]
  }'
```

### 上传图片

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer your-token" \
  -F "file=@/path/to/image.jpg"
```

## 🎨 主题自定义

### 修改颜色主题

编辑 `css/style.css`，修改 CSS 变量：
```css
:root {
  --pink-300: #f9a8d4;
  --pink-400: #f472b6;
  --pink-500: #ec4899;
  --pink-600: #db2777;
  --pink-700: #be185d;
}
```

### 修改站点信息

通过 API 更新或直接编辑 `data/settings.json`：
```json
{
  "site_title": "你的博客标题",
  "site_subtitle": "你的副标题",
  "avatar": "/uploads/gallery/your-avatar.jpg",
  "banner": "/uploads/gallery/your-banner.jpg"
}
```

### 修改 Hero 背景图

将图片放入 `server/uploads/hero/` 目录，支持以下文件名：
- `morning.webp` - 早晨背景
- `afternoon.webp` - 下午背景
- `night.webp` - 夜晚背景
- `oc.webp` - OC 角色图片

## 🔒 安全注意事项

1. **修改默认密码**：务必修改 `.env` 中的 `ADMIN_PASSWORD` 和 `JWT_SECRET`
2. **配置 CORS**：生产环境设置 `ALLOWED_ORIGINS` 限制允许的域名
3. **HTTPS**：生产环境使用 HTTPS 加密传输
4. **文件上传限制**：已限制文件类型和大小，勿随意修改
5. **定期备份**：定期备份 `data/` 和 `server/uploads/` 目录

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
