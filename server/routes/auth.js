const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
// 不提供默认密码哈希：仓库里写死的哈希等于公开的后门
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

if (!ADMIN_PASSWORD_HASH) {
    console.warn('[警告] 未配置 ADMIN_PASSWORD_HASH，管理接口将无法登录，请在 server/.env 中设置。');
}

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '请输入用户名和密码' });
        }
        if (!ADMIN_PASSWORD_HASH) {
            return res.status(503).json({ error: '服务器未配置管理员密码（ADMIN_PASSWORD_HASH），请在 server/.env 中设置' });
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
