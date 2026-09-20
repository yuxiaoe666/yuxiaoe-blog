const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const galleryDir = path.join(uploadsDir, 'gallery');
const settingsDir = path.join(uploadsDir, 'settings');
const postsDir = path.join(uploadsDir, 'posts');

[galleryDir, settingsDir, postsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 上传目标：gallery（图库，默认）/ settings（站点素材）/ posts（文章正文配图，不进图库）
const UPLOAD_TARGETS = {
    gallery: { dir: galleryDir, urlPrefix: '/uploads/gallery/' },
    settings: { dir: settingsDir, urlPrefix: '/uploads/settings/' },
    posts: { dir: postsDir, urlPrefix: '/uploads/posts/' },
};

// multipart 的字段顺序决定 req.body 的可见性，前端务必把 type 放在 file 之前
function resolveTarget(req) {
    const raw = (req.body && req.body.type) || 'gallery';
    return UPLOAD_TARGETS[raw] || UPLOAD_TARGETS.gallery;
}

// 路径穿越检查
function isPathSafe(baseDir, targetPath) {
    const resolved = path.resolve(targetPath);
    const base = path.resolve(baseDir);
    return resolved.startsWith(base);
}

// 安全的文件名（只允许 uuid + 已知扩展名）
function isSafeFilename(name) {
    return /^[a-f0-9-]+\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(name);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, resolveTarget(req).dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm'];
        if (!allowedExts.includes(ext)) {
            return cb(new Error('不支持的文件类型'));
        }
        cb(null, uuidv4() + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
        if (allowed.includes(file.mimetype)) cb(null, true);
        else cb(new Error('不支持的文件类型'), false);
    },
});

// 管理员：上传文件
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择文件' });
    const target = resolveTarget(req);
    const type = Object.keys(UPLOAD_TARGETS).find(key => UPLOAD_TARGETS[key] === target) || 'gallery';
    const isVideo = req.file.mimetype.startsWith('video/');
    if (type === 'gallery') {
        db.addGalleryItem({ filename: req.file.filename, original_name: req.file.originalname, type: isVideo ? 'video' : 'image' });
    }
    const url = target.urlPrefix + req.file.filename;
    res.json({ url, filename: req.file.filename, originalName: req.file.originalname, type: isVideo ? 'video' : 'image', target: type });
});

// 公开：获取图库列表
router.get('/gallery', (req, res) => {
    const items = db.getAllGallery();
    res.json(items.map(item => ({ ...item, url: '/uploads/gallery/' + item.filename })));
});

// 管理员：删除图库项目
router.delete('/gallery/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const item = db.getGalleryById(id);
    if (!item) return res.status(404).json({ error: '文件不存在' });
    if (!isSafeFilename(item.filename)) return res.status(400).json({ error: '文件名不合法' });
    const filePath = path.join(galleryDir, item.filename);
    if (!isPathSafe(galleryDir, filePath)) return res.status(400).json({ error: '路径不合法' });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.deleteGalleryItem(id);
    res.json({ message: '文件已删除' });
});

// 公开：获取设置
router.get('/settings', (req, res) => {
    res.json(db.getAllSettings());
});

// 管理员：更新设置
router.put('/settings', authMiddleware, (req, res) => {
    const result = db.updateSettings(req.body);
    res.json(result);
});

module.exports = router;
