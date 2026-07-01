const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const commentsDir = path.join(__dirname, '..', 'uploads', 'comments');
if (!fs.existsSync(commentsDir)) fs.mkdirSync(commentsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: commentsDir,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            return cb(new Error('不支持的文件类型'));
        }
        cb(null, uuidv4() + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('只允许上传图片文件'), false);
    },
});

// ========== 管理员评论管理 ==========

// 管理员：查看所有评论
router.get('/admin/all', authMiddleware, (req, res) => {
    const all = db.getAllComments();
    res.json(all);
});

// 管理员：删除单条评论
router.delete('/admin/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = db.deleteComment(id);
    if (!deleted) return res.status(404).json({ error: '评论不存在' });
    res.json({ message: '评论已删除', deleted });
});

// 管理员：清空某篇文章的所有评论
router.delete('/admin/post/:postId', authMiddleware, (req, res) => {
    const postId = parseInt(req.params.postId);
    const count = db.deleteCommentsByPostId(postId);
    res.json({ message: '已删除 ' + count + ' 条评论' });
});

// ========== 公开评论接口 ==========

// 公开：获取总评论数
router.get('/count', (req, res) => {
    const all = db.getAllComments();
    res.json({ count: all.length });
});

// 公开：获取某篇文章的评论
router.get('/:postId', (req, res) => {
    const comments = db.getCommentsByPostId(parseInt(req.params.postId));
    res.json(comments);
});

// 公开：发表评论
router.post('/:postId', upload.single('image'), (req, res) => {
    const postId = parseInt(req.params.postId);
    const post = db.getPostById(postId);
    if (!post) return res.status(404).json({ error: '文章不存在' });

    const author = (req.body.author || '匿名').trim().slice(0, 20) || '匿名';
    const content = (req.body.content || '').trim().slice(0, 500);
    if (!content && !req.file) return res.status(400).json({ error: '评论内容或图片不能同时为空' });

    const imagePath = req.file ? '/uploads/comments/' + req.file.filename : null;
    const comment = db.createComment({ post_id: postId, author, content, image: imagePath });
    res.status(201).json(comment);
});

module.exports = router;
