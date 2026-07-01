const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const POSTS_DIR = path.join(DATA_DIR, 'posts');
const POSTS_INDEX = path.join(POSTS_DIR, 'posts.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const GALLERY_FILE = path.join(DATA_DIR, 'gallery.json');
const MUSIC_FILE = path.join(DATA_DIR, 'music.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

function safeRead(filePath, defaultVal) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (e) { /* ignore */ }
    return defaultVal;
}

function safeWrite(filePath, data) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, filePath);
}

let posts = safeRead(POSTS_INDEX, []);
let comments = safeRead(COMMENTS_FILE, []);
let gallery = safeRead(GALLERY_FILE, []);
let music = safeRead(MUSIC_FILE, []);
let contacts = safeRead(CONTACTS_FILE, []);
let settings = safeRead(SETTINGS_FILE, {});

const defaultSettings = {
    banner: '',
    avatar: '',
    bg_type: 'color',
    bg_value: '#ffe0f0',
};
Object.entries(defaultSettings).forEach(([k, v]) => {
    if (!(k in settings)) settings[k] = v;
});
safeWrite(SETTINGS_FILE, settings);

if (posts.length === 0) {
    const now = new Date().toISOString().slice(0, 10);
    posts.push({
        id: 1, title: '欢迎来到我的博客',
        date: now, tags: ['生活', '随笔'],
    });
    safeWrite(POSTS_INDEX, posts);
}

let nextPostId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
let nextCommentId = comments.length > 0 ? Math.max(...comments.map(c => c.id)) + 1 : 1;
let nextGalleryId = gallery.length > 0 ? Math.max(...gallery.map(g => g.id)) + 1 : 1;
let nextMusicId = music.length > 0 ? Math.max(...music.map(m => m.id)) + 1 : 1;
let nextContactId = contacts.length > 0 ? Math.max(...contacts.map(c => c.id)) + 1 : 1;

function readPostHtml(id) {
    const filePath = path.join(POSTS_DIR, id + '.html');
    try {
        if (fs.existsSync(filePath)) return fs.readFileSync(filePath, 'utf-8');
    } catch (e) { /* ignore */ }
    return '';
}

function writePostHtml(id, html) {
    const filePath = path.join(POSTS_DIR, id + '.html');
    fs.writeFileSync(filePath, html, 'utf-8');
}

module.exports = {
    // ========== 文章 ==========
    getAllPosts() {
        return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    getPostById(id) {
        const post = posts.find(p => p.id === id);
        if (!post) return null;
        return { ...post, html: readPostHtml(id) };
    },

    getPostHtml(id) {
        return readPostHtml(id);
    },

    createPost({ title, content, tags }) {
        const now = new Date().toISOString().slice(0, 10);
        const post = { id: nextPostId, title, date: now, tags: tags || [] };
        posts.push(post);
        safeWrite(POSTS_INDEX, posts);
        writePostHtml(nextPostId, content || '');
        nextPostId++;
        return { ...post, html: content || '' };
    },

    updatePost(id, fields) {
        const idx = posts.findIndex(p => p.id === id);
        if (idx === -1) return null;
        if (fields.title !== undefined) posts[idx].title = fields.title;
        if (fields.tags !== undefined) posts[idx].tags = fields.tags;
        if (fields.date !== undefined) posts[idx].date = fields.date;
        safeWrite(POSTS_INDEX, posts);
        if (fields.content !== undefined) writePostHtml(id, fields.content);
        return posts[idx];
    },

    deletePost(id) {
        const idx = posts.findIndex(p => p.id === id);
        if (idx === -1) return false;
        posts.splice(idx, 1);
        safeWrite(POSTS_INDEX, posts);
        const htmlPath = path.join(POSTS_DIR, id + '.html');
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
        const before = comments.length;
        comments = comments.filter(c => c.post_id !== id);
        if (comments.length !== before) safeWrite(COMMENTS_FILE, comments);
        return true;
    },

    // ========== 评论 ==========
    getAllComments() {
        return [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    getCommentsByPostId(postId) {
        return comments.filter(c => c.post_id === postId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },

    createComment({ post_id, author, content, image }) {
        const now = new Date().toISOString();
        const comment = { id: nextCommentId++, post_id, author, content, image: image || null, created_at: now };
        comments.push(comment);
        safeWrite(COMMENTS_FILE, comments);
        return comment;
    },

    deleteComment(id) {
        const idx = comments.findIndex(c => c.id === id);
        if (idx === -1) return false;
        const deleted = comments[idx];
        comments.splice(idx, 1);
        safeWrite(COMMENTS_FILE, comments);
        return deleted;
    },

    deleteCommentsByPostId(postId) {
        const before = comments.length;
        comments = comments.filter(c => c.post_id !== postId);
        if (comments.length !== before) {
            safeWrite(COMMENTS_FILE, comments);
            return before - comments.length;
        }
        return 0;
    },

    getCommentCount(postId) {
        return comments.filter(c => c.post_id === postId).length;
    },

    // ========== 图库 ==========
    getAllGallery() {
        return [...gallery].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    getGalleryById(id) {
        return gallery.find(g => g.id === id) || null;
    },

    addGalleryItem({ filename, original_name, type }) {
        const now = new Date().toISOString();
        const item = { id: nextGalleryId++, filename, original_name, type, created_at: now };
        gallery.push(item);
        if (gallery.length > 50) gallery.shift();
        safeWrite(GALLERY_FILE, gallery);
        return item;
    },

    deleteGalleryItem(id) {
        const idx = gallery.findIndex(g => g.id === id);
        if (idx === -1) return false;
        gallery.splice(idx, 1);
        safeWrite(GALLERY_FILE, gallery);
        return true;
    },

    // ========== 音乐 ==========
    getAllMusic() {
        return [...music].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    getMusicById(id) {
        return music.find(m => m.id === id) || null;
    },

    addMusic({ title, artist, filename, original_name }) {
        const now = new Date().toISOString();
        const item = { id: nextMusicId++, title: title || '未知歌曲', artist: artist || '未知歌手', filename, original_name, lyrics: '', created_at: now };
        music.push(item);
        safeWrite(MUSIC_FILE, music);
        return item;
    },

    deleteMusic(id) {
        const idx = music.findIndex(m => m.id === id);
        if (idx === -1) return false;
        music.splice(idx, 1);
        safeWrite(MUSIC_FILE, music);
        return true;
    },

    updateMusicLyrics(id, lyrics) {
        const item = music.find(m => m.id === id);
        if (!item) return false;
        item.lyrics = lyrics || '';
        safeWrite(MUSIC_FILE, music);
        return true;
    },

    // ========== 联系留言 ==========
    createContact({ name, email, message }) {
        const now = new Date().toISOString();
        const item = { id: nextContactId++, name, email: email || '', message, created_at: now };
        contacts.push(item);
        safeWrite(CONTACTS_FILE, contacts);
        return item;
    },

    getAllContacts() {
        return [...contacts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    deleteContact(id) {
        const idx = contacts.findIndex(c => c.id === id);
        if (idx === -1) return false;
        contacts.splice(idx, 1);
        safeWrite(CONTACTS_FILE, contacts);
        return true;
    },

    // ========== 设置 ==========
    getAllSettings() {
        return { ...settings };
    },

    updateSettings(updates) {
        const allowedKeys = ['banner', 'avatar', 'bg_type', 'bg_value', 'site_title', 'site_subtitle'];
        allowedKeys.forEach(key => {
            if (updates[key] !== undefined) settings[key] = String(updates[key]);
        });
        safeWrite(SETTINGS_FILE, settings);
        return { ...settings };
    },
};
