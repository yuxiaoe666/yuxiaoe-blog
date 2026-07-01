const express = require('express');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const commentLimiter = require('express-rate-limit')({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '留言发送过于频繁，请稍后再试' },
});

router.post('/', commentLimiter, (req, res) => {
    const name = (req.body.name || '').trim().slice(0, 30);
    const email = (req.body.email || '').trim().slice(0, 100);
    const message = (req.body.message || '').trim().slice(0, 2000);

    if (!name) return res.status(400).json({ error: '请填写名字' });
    if (!message) return res.status(400).json({ error: '请填写留言内容' });

    const item = db.createContact({ name, email, message });
    res.status(201).json({ message: '留言已发送' });
});

router.get('/', authMiddleware, (req, res) => {
    res.json(db.getAllContacts());
});

router.delete('/:id', authMiddleware, (req, res) => {
    const id = parseInt(req.params.id);
    const result = db.deleteContact(id);
    if (!result) return res.status(404).json({ error: '留言不存在' });
    res.json({ message: '留言已删除' });
});

module.exports = router;
