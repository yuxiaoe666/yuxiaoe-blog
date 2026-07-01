const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const musicDir = path.join(__dirname, '..', 'uploads', 'music');
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

function isPathSafe(baseDir, targetPath) {
    const resolved = path.resolve(targetPath);
    const base = path.resolve(baseDir);
    return resolved.startsWith(base);
}

function isSafeFilename(name) {
    return /^[a-f0-9-]+\.(mp3|wav|ogg|flac|m4a|aac|wma)$/i.test(name);
}

const storage = multer.diskStorage({
    destination: musicDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma'];
        if (!allowedExts.includes(ext)) {
            return cb(new Error('不支持的音频格式'));
        }
        cb(null, uuidv4() + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/aac', 'audio/x-ms-wma'];
        if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传音频文件'), false);
        }
    },
});

// 公开：获取音乐列表
router.get('/', (req, res) => {
    const items = db.getAllMusic();
    res.json(items.map(item => ({ ...item, url: '/uploads/music/' + item.filename })));
});

// 公开：获取单首歌曲（含歌词）
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const item = db.getMusicById(id);
    if (!item) return res.status(404).json({ error: '歌曲不存在' });
    res.json({ ...item, url: '/uploads/music/' + item.filename });
});

// 管理员：上传音乐
router.post('/', authMiddleware, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '请选择音频文件' });
    const title = (req.body.title || req.file.originalname.replace(/\.[^.]+$/, '')).trim();
    const artist = (req.body.artist || '未知歌手').trim();
    const item = db.addMusic({
        title,
        artist,
        filename: req.file.filename,
        original_name: req.file.originalname,
    });
    res.json({ ...item, url: '/uploads/music/' + item.filename });
});

// 管理员：删除音乐
router.delete('/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const item = db.getMusicById(id);
    if (!item) return res.status(404).json({ error: '歌曲不存在' });
    if (!isSafeFilename(item.filename)) return res.status(400).json({ error: '文件名不合法' });
    const filePath = path.join(musicDir, item.filename);
    if (!isPathSafe(musicDir, filePath)) return res.status(400).json({ error: '路径不合法' });
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.deleteMusic(id);
    res.json({ message: '歌曲已删除' });
});

// 管理员：更新歌词
router.put('/:id/lyrics', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const result = db.updateMusicLyrics(id, req.body.lyrics || '');
    if (!result) return res.status(404).json({ error: '歌曲不存在' });
    res.json({ message: '歌词已更新' });
});

module.exports = router;
