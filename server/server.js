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
            scriptSrc: ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
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

    template = template
        .replace(/{{TITLE}}/g, escapeHtml(post.title))
        .replace(/{{CONTENT}}/g, post.html || '')
        .replace(/{{DATE}}/g, dateStr)
        .replace(/{{TAGS}}/g, tagsHtml)
        .replace(/{{POST_ID}}/g, String(id))
        .replace(/{{BANNER_URL}}/g, escapeHtml(bannerUrl))
        .replace(/{{BANNER_CLASS}}/g, bannerClass ? ' ' + escapeHtml(bannerClass) : '')
        .replace(/{{AVATAR_HTML}}/g, avatarHtml)
        .replace(/{{SITE_TITLE}}/g, siteTitle)
        .replace(/{{SITE_SUBTITLE}}/g, siteSubtitle);

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

/* ==================== SPA fallback ==================== */
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(STATIC_DIR, 'index.html'), err => {
        if (err) res.status(404).send('页面不存在');
    });
});

/* ==================== 404 ==================== */
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
