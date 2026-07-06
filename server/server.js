const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('./db/init');
const db = require('./db/init');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const uploadRoutes = require('./routes/upload');
const musicRoutes = require('./routes/music');
const contactRoutes = require('./routes/contacts');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, 'uploads');
const commentsDir = path.join(uploadsDir, 'comments');
const galleryDir = path.join(uploadsDir, 'gallery');
const settingsDir = path.join(uploadsDir, 'settings');
const musicDir = path.join(uploadsDir, 'music');
const heroDir = path.join(uploadsDir, 'hero');

[uploadsDir, commentsDir, galleryDir, settingsDir, musicDir, heroDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const STATIC_DIR = path.join(__dirname, '..');
const TEMPLATE_FILE = path.join(STATIC_DIR, 'post.html');

/* ==================== 安全头 ==================== */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: ["'self'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

/* ==================== CORS ==================== */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
    : true;

app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
}));

/* ==================== 信任代理（Cloudflare + Nginx） ==================== */
app.set('trust proxy', 1);

/* ==================== 全局速率限制 ==================== */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' },
});
app.use(globalLimiter);

/* ==================== 严格速率限制 ==================== */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '登录尝试过多，请15分钟后再试' },
});

const commentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '评论发送过于频繁，请稍后再试' },
});

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'API 请求过于频繁，请稍后再试' },
});

/* ==================== 请求体限制 ==================== */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

/* ==================== 输入清洗 ==================== */
function sanitizeInput(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeInput);
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            cleaned[key] = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        } else if (typeof value === 'object' && value !== null) {
            cleaned[key] = sanitizeInput(value);
        } else {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

app.use('/api', (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeInput(req.body);
    }
    next();
});

/* ==================== 路径穿越检查 ==================== */
function isPathSafe(baseDir, targetPath) {
    const resolved = path.resolve(targetPath);
    const base = path.resolve(baseDir);
    return resolved.startsWith(base) && !resolved.includes('..');
}

/* ==================== 静态文件 ==================== */
app.use('/uploads', express.static(uploadsDir, {
    maxAge: '30d',
    setHeaders: (res, filePath) => {
        if (!isPathSafe(uploadsDir, filePath)) {
            res.status(403).end();
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000');
        }
    },
}));

/* ==================== RSS 订阅 ==================== */
app.get('/rss.xml', (req, res) => {
    const posts = db.getAllPosts();
    const settings = db.getAllSettings();
    const siteTitle = settings.site_title || '鱼小鳄のBLOG';
    const siteSubtitle = settings.site_subtitle || '记录我那些不太起眼的日常';
    const baseUrl = req.protocol + '://' + req.get('host');

    const rssItems = posts.map(post => {
        const content = (post.html || '').replace(/<[^>]*>/g, '').substring(0, 500);
        const date = new Date(post.date).toISOString();
        return `
<item>
  <title>${escapeHtml(post.title)}</title>
  <link>${baseUrl}/post/${post.id}</link>
  <pubDate>${date}</pubDate>
  <description>${escapeHtml(content)}</description>
  ${Array.isArray(post.tags) && post.tags.length > 0 
    ? post.tags.map(tag => `<category>${escapeHtml(tag)}</category>`).join('\n') 
    : ''}
</item>`;
    }).join('\n');

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeHtml(siteTitle)}</title>
  <description>${escapeHtml(siteSubtitle)}</description>
  <link>${baseUrl}/</link>
  <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
  <language>zh-CN</language>
  ${rssItems}
</channel>
</rss>`;

    res.set('Content-Type', 'application/rss+xml');
    res.send(rssXml);
});

/* ==================== API 路由 ==================== */
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);

// 评论：GET 读取不受限流，仅 POST 发表受 commentLimiter 限制
app.post('/api/comments/:postId', commentLimiter);
app.use('/api/comments', commentRoutes);

app.use('/api/upload', apiLimiter);
app.use('/api/upload', uploadRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/contacts', contactRoutes);

/* ==================== 文章独立页面 ==================== */
app.get('/post/:id', (req, res) => {
    const id = parseInt(req.params.id);
    if (!Number.isInteger(id) || id < 1 || id > 999999) {
        return res.status(404).send('<h1>文章不存在</h1>');
    }
    const post = db.getPostById(id);
    if (!post) {
        return res.status(404).send('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>文章不存在</title><style>body{font-family:sans-serif;text-align:center;padding:80px 20px;background:#fff0f5;color:#b89aa6}a{color:#f082a0}</style></head><body><h1>🌸</h1><p>文章不存在</p><a href="/">← 返回首页</a></body></html>');
    }

    if (!fs.existsSync(TEMPLATE_FILE)) {
        return res.status(500).send('模板文件不存在');
    }

    let template = fs.readFileSync(TEMPLATE_FILE, 'utf-8');
    const settings = db.getAllSettings();

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    const d = new Date(post.date);
    const dateStr = d.getFullYear() + '年' + monthNames[d.getMonth()] + d.getDate() + '日';

    const tagsArr = Array.isArray(post.tags) ? post.tags : [];
    const tagsHtml = tagsArr.length > 0
        ? ' · ' + tagsArr.map(t => '<span class="blog-tag">#' + escapeHtml(t) + '</span>').join('')
        : '';

    const bannerUrl = settings.banner || '';
    const bannerClass = bannerUrl ? 'has-image' : '';

    const avatarHtml = settings.avatar
        ? '<img src="' + escapeHtml(settings.avatar) + '" alt="头像" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--pink-300);padding:2px;background:linear-gradient(135deg,var(--pink-200),var(--pink-400));">'
        : '<div class="avatar-placeholder">🌸</div>';
    const siteTitle = escapeHtml(settings.site_title || '鱼小鳄sugary');
    const siteSubtitle = escapeHtml(settings.site_subtitle || '记录我那些不太起眼的日常');

    const description = post.html ? post.html.replace(/<[^>]*>/g, '').substring(0, 150).trim() : siteSubtitle;
    const metaTags = tagsArr.join(', ');

    const { prev, next } = db.getPrevNextPosts(id);
    const prevHtml = prev 
        ? `<a href="/post/${prev.id}" class="post-nav-item prev" style="text-decoration:none;color:inherit;"><span class="nav-arrow">←</span><span class="nav-title">${escapeHtml(prev.title)}</span></a>`
        : '';
    const nextHtml = next
        ? `<a href="/post/${next.id}" class="post-nav-item next" style="text-decoration:none;color:inherit;"><span class="nav-title">${escapeHtml(next.title)}</span><span class="nav-arrow">→</span></a>`
        : '';

    const contentText = (post.html || '').replace(/<[^>]*>/g, '');
    const wordCount = contentText.length;
    const readTime = Math.ceil(wordCount / 400);

    template = template
        .replace(/{{TITLE}}/g, escapeHtml(post.title))
        .replace(/{{CONTENT}}/g, post.html || '')
        .replace(/{{DATE}}/g, dateStr)
        .replace(/{{TAGS}}/g, tagsHtml)
        .replace(/{{DESCRIPTION}}/g, escapeHtml(description))
        .replace(/{{META_TAGS}}/g, escapeHtml(metaTags))
        .replace(/{{POST_ID}}/g, String(id))
        .replace(/{{BANNER_URL}}/g, escapeHtml(bannerUrl))
        .replace(/{{BANNER_CLASS}}/g, bannerClass ? ' ' + escapeHtml(bannerClass) : '')
        .replace(/{{AVATAR_HTML}}/g, avatarHtml)
        .replace(/{{SITE_TITLE}}/g, siteTitle)
        .replace(/{{SITE_SUBTITLE}}/g, siteSubtitle)
        .replace(/{{PREV_POST}}/g, prevHtml)
        .replace(/{{NEXT_POST}}/g, nextHtml)
        .replace(/{{WORD_COUNT}}/g, wordCount)
        .replace(/{{READ_TIME}}/g, readTime);

    res.send(template);
});

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ==================== 隐藏敏感目录 ==================== */
app.use(['/server', '/server/*', '/data', '/data/*', '/.env', '/.git', '/.git/*', '/node_modules', '/node_modules/*'], (req, res) => {
    res.status(404).send('Not Found');
});

/* ==================== 前端静态文件 ==================== */
app.use(express.static(STATIC_DIR, {
    index: 'index.html',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    },
}));

/* ==================== 自定义 404 页面 ==================== */
app.get('/404', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌸 迷路了？ - 鱼小鳄のBLOG</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌸</text></svg>" type="image/svg+xml">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #fff0f5 0%, #ffe0f0 30%, #ffd6e8 60%, #ffe8f2 100%);
            font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            color: #4a2c38;
        }
        .not-found-container {
            text-align: center;
            padding: 40px 20px;
        }
        .emoji-404 {
            font-size: 120px;
            margin-bottom: 20px;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
        }
        .title-404 {
            font-size: 48px;
            font-weight: 700;
            color: #e85580;
            margin-bottom: 12px;
            letter-spacing: 4px;
        }
        .subtitle-404 {
            font-size: 18px;
            color: #b89aa6;
            margin-bottom: 30px;
        }
        .back-home {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #ff6695, #e85580);
            color: #fff;
            text-decoration: none;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(240, 130, 160, 0.4);
            transition: all 0.3s ease;
        }
        .back-home:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 36px rgba(240, 130, 160, 0.5);
        }
        .cherry-blossom {
            position: fixed;
            top: -10px;
            opacity: 0.6;
            animation: fall linear infinite;
            font-size: 20px;
        }
        @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
    </style>
</head>
<body>
    <div class="not-found-container">
        <div class="emoji-404">🌸</div>
        <div class="title-404">404</div>
        <div class="subtitle-404">哎呀，页面迷路了...</div>
        <a href="/" class="back-home">🏠 返回首页</a>
    </div>
    <script>
        for (var i = 0; i < 12; i++) {
            var sb = document.createElement('div');
            sb.className = 'cherry-blossom';
            sb.textContent = ['🌸', '✿', '❀'][Math.floor(Math.random() * 3)];
            sb.style.left = Math.random() * 100 + '%';
            sb.style.animationDuration = (5 + Math.random() * 5) + 's';
            sb.style.animationDelay = Math.random() * 5 + 's';
            document.body.appendChild(sb);
        }
    </script>
</body>
</html>`;
    res.status(404).send(html);
});

/* ==================== SPA fallback ==================== */
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(STATIC_DIR, 'index.html'), err => {
        if (err) res.status(404).send('页面不存在');
    });
});

/* ==================== API 404 ==================== */
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

/* ==================== 全局错误处理 ==================== */
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '文件大小超过限制' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ error: '上传字段名不正确' });
    }
    console.error('服务器错误:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
});

/* ==================== 启动 ==================== */
app.listen(PORT, () => {
    console.log('blog server is running');
    console.log('url: http://localhost:' + PORT);
    console.log('post url: /post/:id');
    console.log('api url: /api/*');
    console.log('security: helmet + rate-limit start');
});

module.exports = { isPathSafe };
