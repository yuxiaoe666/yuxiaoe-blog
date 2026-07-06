const express = require('express');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 公开：获取所有文章列表（支持分页）
router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const posts = db.getAllPosts();
    const total = posts.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedPosts = posts.slice(start, end);
    
    const result = paginatedPosts.map(p => ({
        ...p,
        commentCount: db.getCommentCount(p.id),
    }));
    
    res.json({
        posts: result,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
    });
});

// 公开：获取单篇文章（含 HTML）
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const post = db.getPostById(id);
    if (!post) return res.status(404).json({ error: '文章不存在' });
    res.json({ ...post, commentCount: db.getCommentCount(id) });
});

// 管理员：创建文章
router.post('/', authMiddleware, (req, res) => {
    const { title, content, tags } = req.body;
    const titleStr = (title || '无题').trim().slice(0, 200);
    const contentStr = (content || '').trim();
    if (!contentStr) return res.status(400).json({ error: '文章内容不能为空' });
    const tagsArr = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [];
    const post = db.createPost({ title: titleStr, content: contentStr, tags: tagsArr });
    res.status(201).json(post);
});

// 管理员：更新文章
router.put('/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const post = db.updatePost(id, req.body);
    if (!post) return res.status(404).json({ error: '文章不存在' });
    res.json(post);
});

// 管理员：删除文章
router.delete('/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    if (!db.deletePost(id)) return res.status(404).json({ error: '文章不存在' });
    res.json({ message: '文章已删除' });
});

module.exports = router;
