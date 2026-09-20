const jwt = require('jsonwebtoken');

// JWT 密钥只允许来自 .env：硬编码的默认密钥一旦随仓库公开，任何人都能伪造管理员令牌
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 16) {
    console.error('[配置错误] 请在 server/.env 中设置长度不少于 16 位的随机 JWT_SECRET，然后重新启动服务。');
    console.error('生成示例: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    process.exit(1);
}

function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: '认证令牌无效或已过期' });
    }
}

module.exports = { generateToken, authMiddleware, JWT_SECRET };
