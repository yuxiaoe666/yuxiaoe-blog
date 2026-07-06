const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '$2a$10$stdepfQkEEf.O5scoC46je38/iDSC6AkloX1HWY6FyH57qFtshuHy';
const JWT_SECRET = process.env.JWT_SECRET || 'blog_jwt_secret_2026';

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '请输入用户名和密码' });
        }
        if (username !== ADMIN_USERNAME) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const isPasswordValid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, message: '登录成功' });
    } catch (e) {
        console.error('Login error:', e.message);
        res.status(500).json({ error: '服务器内部错误: ' + e.message });
    }
});

router.get('/check', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        res.json({ authenticated: true, user: decoded });
    } catch (e) {
        res.status(401).json({ error: '认证令牌无效或已过期' });
    }
});

module.exports = router;
