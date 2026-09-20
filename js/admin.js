(function () {
    'use strict';

    var TOKEN_KEY = 'blog_admin_token';

    var state = {
        token: null,
        user: null,
        posts: [],
        comments: [],
        gallery: [],
        music: [],
        contacts: [],
        settings: {},
        visitorCount: 0,
        editingPostId: null,
        activeTab: 'overview'
    };

    /* ==================== 基础工具 ==================== */

    function $(id) { return document.getElementById(id); }

    function esc(value) {
        return String(value === undefined || value === null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function fmtTime(value) {
        if (!value) return '-';
        var d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
            ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    var toastTimer = null;
    function toast(message, kind) {
        var el = $('toast');
        if (!el) return;
        el.textContent = message;
        el.className = 'toast show' + (kind ? ' ' + kind : '');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.className = 'toast'; }, 2800);
    }

    /* ==================== 请求封装 ==================== */

    function request(method, url, body, options) {
        options = options || {};
        var headers = {};
        if (state.token && !options.public) headers.Authorization = 'Bearer ' + state.token;

        var init = { method: method, headers: headers, cache: 'no-store' };
        if (body instanceof FormData) {
            init.body = body;
        } else if (body !== undefined && body !== null) {
            headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(body);
        }

        return fetch(url, init).then(function (response) {
            var contentType = response.headers.get('content-type') || '';
            var parsed = contentType.indexOf('application/json') !== -1
                ? response.json().catch(function () { return null; })
                : response.text();

            return parsed.then(function (data) {
                if (response.status === 401 && !options.public) {
                    handleUnauthorized();
                    throw new Error('登录已过期，请重新登录');
                }
                if (!response.ok) {
                    var message = (data && data.error) ? data.error : ('请求失败（HTTP ' + response.status + '）');
                    var error = new Error(message);
                    error.status = response.status;
                    throw error;
                }
                return data;
            });
        });
    }

    function apiGet(path) { return request('GET', '/api' + path); }
    function apiSend(method, path, body) { return request(method, '/api' + path, body); }

    /* ==================== 登录 / 退出 ==================== */

    function setLoginError(message) {
        var el = $('loginError');
        if (!el) return;
        if (message) { el.textContent = message; el.hidden = false; }
        else { el.textContent = ''; el.hidden = true; }
    }

    function showLogin(message) {
        $('loginOverlay').hidden = false;
        $('adminShell').hidden = true;
        $('topbarUser').textContent = '未登录';
        setLoginError(message || '');
    }

    function handleUnauthorized() {
        state.token = null;
        state.user = null;
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
        showLogin('登录状态已失效，请重新登录');
    }

    function handleLoginSubmit(event) {
        event.preventDefault();
        var username = $('loginUsername').value.trim();
        var password = $('loginPassword').value;
        if (!username || !password) { setLoginError('请输入用户名和密码'); return; }

        var button = $('loginSubmit');
        button.disabled = true;
        button.textContent = '登录中…';
        setLoginError('');

        request('POST', '/api/auth/login', { username: username, password: password }, { public: true })
            .then(function (data) {
                state.token = data.token;
                try { localStorage.setItem(TOKEN_KEY, data.token); } catch (e) { /* ignore */ }
                $('loginPassword').value = '';
                return enterAdmin();
            })
            .catch(function (error) {
                setLoginError(error.message || '登录失败');
            })
            .then(function () {
                button.disabled = false;
                button.textContent = '🔓 登录';
            });
    }

    function enterAdmin() {
        return request('GET', '/api/auth/check')
            .then(function (data) {
                state.user = data.user || null;
                $('loginOverlay').hidden = true;
                $('adminShell').hidden = false;
                renderAuthInfo();
                return loadAll();
            })
            .catch(function (error) {
                showLogin(error.message || '登录校验失败');
                throw error;
            });
    }

    function logout() {
        state.token = null;
        state.user = null;
        try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
        showLogin('已退出登录');
        $('loginPassword').value = '';
    }

    /* ==================== 数据加载 ==================== */

    var loadErrors = [];

    function guard(name, promise, onSuccess) {
        return promise
            .then(function (data) { onSuccess(data); })
            .catch(function (error) {
                loadErrors.push(name + '：' + error.message);
            });
    }

    function loadPosts() {
        return guard('文章', apiGet('/posts?page=1&limit=1000'), function (data) {
            state.posts = (data && data.posts) || [];
        });
    }

    function loadComments() {
        return guard('评论', apiGet('/comments/admin/all'), function (data) {
            state.comments = Array.isArray(data) ? data : [];
        });
    }

    function loadGallery() {
        return guard('相册', apiGet('/upload/gallery'), function (data) {
            state.gallery = Array.isArray(data) ? data : [];
        });
    }

    function loadMusic() {
        return guard('音乐', apiGet('/music'), function (data) {
            state.music = Array.isArray(data) ? data : [];
        });
    }

    function loadContacts() {
        return guard('留言', apiGet('/contacts'), function (data) {
            state.contacts = Array.isArray(data) ? data : [];
        });
    }

    function loadSettings() {
        return guard('站点设置', apiGet('/upload/settings'), function (data) {
            state.settings = data || {};
        });
    }

    function loadVisitor() {
        return guard('访客', request('GET', '/api/visitor', null, { public: true }), function (data) {
            state.visitorCount = (data && data.count) || 0;
        });
    }

    function loadAll(options) {
        options = options || {};
        loadErrors = [];
        if (!options.silent) toast('数据加载中…');

        return Promise.all([loadPosts(), loadComments(), loadGallery(), loadMusic(), loadContacts(), loadSettings(), loadVisitor()])
            .then(function () {
                renderOverview();
                renderPosts();
                renderComments();
                renderGallery();
                renderMusic();
                renderContacts();
                renderSettings();

                if (loadErrors.length) {
                    toast('部分数据加载失败：' + loadErrors.join('；'), 'error');
                } else if (!options.silent) {
                    toast('数据已刷新', 'success');
                }
            });
    }

    /* ==================== 概览 ==================== */

    function renderOverview() {
        var stats = [
            { num: state.posts.length, label: '📝 文章' },
            { num: state.comments.length, label: '💬 评论' },
            { num: state.gallery.length, label: '🖼️ 相册' },
            { num: state.music.length, label: '🎵 音乐' },
            { num: state.contacts.length, label: '💌 留言' },
            { num: state.visitorCount, label: '👣 访客' }
        ];

        $('statGrid').innerHTML = stats.map(function (item) {
            return '<div class="stat-card"><div class="num">' + item.num + '</div><div class="lbl">' + item.label + '</div></div>';
        }).join('');

        var recent = state.posts.slice(0, 5);
        $('overviewPosts').innerHTML = recent.length
            ? recent.map(function (post) {
                return '<div class="row"><span>' + esc(post.title) + '</span>' +
                    '<small>#' + post.id + ' · ' + esc(post.date) + ' · 💬 ' + (post.commentCount || 0) + '</small></div>';
            }).join('')
            : '<div class="row"><span>还没有文章</span></div>';
    }

    function renderAuthInfo() {
        var user = state.user || {};
            $('topbarUser').textContent = user.username ? ('管理员 · ' + user.username) : '未登录';
            var rows = [
            ['用户名', user.username || '-'],
            ['角色', user.role || '-'],
            ['令牌有效期', '24 小时（过期后重新登录即可）'],
            ['当前时间', fmtTime(new Date().toISOString())]
        ];
        $('overviewAuth').innerHTML = rows.map(function (row) {
            return '<dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd>';
        }).join('');
    }

    /* ==================== 文章 ==================== */

    function postTitleById(id) {
        var found = state.posts.filter(function (p) { return p.id === id; })[0];
        return found ? found.title : ('文章 #' + id);
    }

    function renderPosts() {
        var keyword = ($('postFilterInput').value || '').trim().toLowerCase();
        var list = state.posts.filter(function (post) {
            if (!keyword) return true;
            var tags = (post.tags || []).join(' ');
            return (post.title || '').toLowerCase().indexOf(keyword) !== -1 ||
                tags.toLowerCase().indexOf(keyword) !== -1;
        });

        $('postCountBadge').textContent = state.posts.length;

        if (!list.length) {
            $('postTableBody').innerHTML = '<tr><td colspan="6" class="empty-cell">' +
                (state.posts.length ? '没有匹配的文章' : '还没有文章，点右上角「新建」写一篇吧') + '</td></tr>';
        } else {
            $('postTableBody').innerHTML = list.map(function (post) {
                var tags = (post.tags || []).map(function (tag) {
                    return '<span class="badge">#' + esc(tag) + '</span>';
                }).join(' ');
                return '<tr>' +
                    '<td>' + post.id + '</td>' +
                    '<td><div class="cell-clip">' + esc(post.title) + '</div></td>' +
                    '<td>' + esc(post.date) + '</td>' +
                    '<td>' + (tags || '<span class="hint">—</span>') + '</td>' +
                    '<td>' + (post.commentCount || 0) + '</td>' +
                    '<td class="actions"><span class="row-actions">' +
                    '<a class="btn btn-sm btn-outline" href="/post/' + post.id + '" target="_blank" rel="noopener">👁 查看</a>' +
                    '<button class="btn btn-sm btn-outline" type="button" data-action="edit-post" data-id="' + post.id + '">✏️ 编辑</button>' +
                    '<button class="btn btn-sm btn-danger-ghost" type="button" data-action="delete-post" data-id="' + post.id + '">🗑️</button>' +
                    '</span></td>' +
                    '</tr>';
            }).join('');
        }
    }

    function resetPostForm() {
        state.editingPostId = null;
        $('postEditorTitle').textContent = '新建文章';
        $('postTitle').value = '';
        $('postTags').value = '';
        $('postContent').value = '';
        $('postDate').value = todayStr();
        $('postDate').disabled = true;
        $('postEditorHint').textContent = '新建时日期由服务器自动取今天；保存成功后可再编辑修改日期。';
        $('postPreviewBox').hidden = true;
    }

    function editPost(id) {
        toast('正在读取文章…');
        apiGet('/posts/' + id)
            .then(function (post) {
                state.editingPostId = post.id;
                $('postEditorTitle').textContent = '编辑文章 #' + post.id;
                $('postTitle').value = post.title || '';
                $('postTags').value = (post.tags || []).join(', ');
                $('postContent').value = post.html || '';
                $('postDate').value = (post.date || '').slice(0, 10);
                $('postDate').disabled = false;
                $('postEditorHint').textContent = '编辑模式：标题 / 日期 / 标签 / 正文都会写回服务器。';
                $('postPreviewBox').hidden = true;
                selectTab('posts');
                $('postTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
                toast('已载入文章 #' + post.id, 'success');
            })
            .catch(function (error) { toast('读取失败：' + error.message, 'error'); });
    }

    function savePost() {
        var title = $('postTitle').value.trim();
        var content = $('postContent').value.trim();
        var tags = $('postTags').value.split(/[,，\s]+/).map(function (t) { return t.trim(); }).filter(Boolean);
        var date = $('postDate').value;

        if (!content) { toast('正文不能为空', 'error'); return; }
        if (!title) { toast('请填写标题', 'error'); return; }

        var payload = { title: title, content: content, tags: tags };
        var isEdit = state.editingPostId !== null;
        if (isEdit && date) payload.date = date;

        var button = $('btnPostSave');
        button.disabled = true;
        button.textContent = '保存中…';

        var call = isEdit ? apiSend('PUT', '/posts/' + state.editingPostId, payload) : apiSend('POST', '/posts', payload);
        call.then(function () {
            toast(isEdit ? '文章已更新' : '文章已创建', 'success');
            resetPostForm();
            return loadAll({ silent: true });
        }).catch(function (error) {
            toast('保存失败：' + error.message, 'error');
        }).then(function () {
            button.disabled = false;
            button.textContent = '💾 保存文章';
        });
    }

    function deletePost(id) {
        confirmAction('删除文章', '确定删除文章 #' + id + '「' + postTitleById(id) + '」吗？该文章的评论也会一并删除，此操作不可恢复。')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/posts/' + id).then(function () {
                    toast('文章已删除', 'success');
                    if (state.editingPostId === id) resetPostForm();
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('删除失败：' + error.message, 'error'); });
    }

    function togglePostPreview() {
        var box = $('postPreviewBox');
        if (!box.hidden) { box.hidden = true; return; }
        var html = $('postContent').value;
        var doc = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
            '<style>body{font-family:"Microsoft YaHei",sans-serif;line-height:1.8;padding:16px;color:#4a2c38;background:#fff}' +
            'img{max-width:100%}pre{background:#fff8fb;border-radius:8px;padding:10px;overflow:auto}</style></head><body>' + html + '</body></html>';
        $('postPreviewFrame').srcdoc = doc;
        box.hidden = false;
    }

    function uploadPostImage(file) {
        var form = new FormData();
        form.append('type', 'posts');
        form.append('file', file);
        toast('图片上传中…');
        apiSend('POST', '/upload', form)
            .then(function (data) {
                var textarea = $('postContent');
                var snippet = '<img src="' + data.url + '" alt="' + esc(data.originalName || '') + '">';
                var start = textarea.selectionStart === undefined ? textarea.value.length : textarea.selectionStart;
                textarea.value = textarea.value.slice(0, start) + snippet + textarea.value.slice(start);
                toast('图片已插入正文：' + data.url, 'success');
            })
            .catch(function (error) { toast('上传失败：' + error.message, 'error'); });
    }

    /* ==================== 评论 ==================== */

    function renderComments() {
        $('commentCountBadge').textContent = state.comments.length;

        if (!state.comments.length) {
            $('commentTableBody').innerHTML = '<tr><td colspan="6" class="empty-cell">暂无评论</td></tr>';
        } else {
            $('commentTableBody').innerHTML = state.comments.map(function (comment) {
                var image = comment.image
                    ? '<br><a href="' + esc(comment.image) + '" target="_blank" rel="noopener">🖼️ 查看图片</a>'
                    : '';
                return '<tr>' +
                    '<td>' + comment.id + '</td>' +
                    '<td><a href="/post/' + comment.post_id + '" target="_blank" rel="noopener">' + esc(postTitleById(comment.post_id)) + '</a></td>' +
                    '<td>' + esc(comment.author) + '</td>' +
                    '<td><div class="cell-clip">' + esc(comment.content) + image + '</div></td>' +
                    '<td>' + esc(fmtTime(comment.created_at)) + '</td>' +
                    '<td class="actions"><button class="btn btn-sm btn-danger-ghost" type="button" data-action="delete-comment" data-id="' + comment.id + '">🗑️ 删除</button></td>' +
                    '</tr>';
            }).join('');
        }

        var select = $('commentClearSelect');
        var postIds = {};
        state.comments.forEach(function (comment) { postIds[comment.post_id] = true; });
        var options = Object.keys(postIds).map(Number).sort(function (a, b) { return b - a; }).map(function (id) {
            var count = state.comments.filter(function (c) { return c.post_id === id; }).length;
            return '<option value="' + id + '">#' + id + ' ' + esc(postTitleById(id)) + '（' + count + ' 条）</option>';
        });
        select.innerHTML = options.length ? options.join('') : '<option value="">暂无评论</option>';
    }

    function deleteComment(id) {
        confirmAction('删除评论', '确定删除评论 #' + id + ' 吗？')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/comments/admin/' + id).then(function () {
                    toast('评论已删除', 'success');
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('删除失败：' + error.message, 'error'); });
    }

    function clearPostComments() {
        var postId = $('commentClearSelect').value;
        if (!postId) { toast('没有可清空的评论', 'error'); return; }
        confirmAction('清空文章评论', '确定清空「' + postTitleById(Number(postId)) + '」下的全部评论吗？此操作不可恢复。')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/comments/admin/post/' + postId).then(function (data) {
                    toast((data && data.message) || '已清空', 'success');
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('清空失败：' + error.message, 'error'); });
    }

    /* ==================== 相册 ==================== */

    function renderGallery() {
        $('galleryCountBadge').textContent = state.gallery.length;

        if (!state.gallery.length) {
            $('galleryAdminGrid').innerHTML = '<div class="hint">图库还是空的，先上传一张图片吧。</div>';
            return;
        }

        $('galleryAdminGrid').innerHTML = state.gallery.map(function (item) {
            var preview = item.type === 'video'
                ? '<video class="gallery-thumb" src="' + esc(item.url) + '" muted playsinline preload="metadata"></video>'
                : '<img class="gallery-thumb" src="' + esc(item.url) + '" alt="' + esc(item.original_name || '') + '" loading="lazy">';
            return '<div class="gallery-item">' + preview +
                '<div class="gallery-meta">' +
                '<div class="name">#' + item.id + ' · ' + esc(item.original_name || item.filename) + '</div>' +
                '<div class="name hint">' + esc(fmtTime(item.created_at)) + '</div>' +
                '<div class="act">' +
                '<a class="btn btn-sm btn-outline" href="' + esc(item.url) + '" target="_blank" rel="noopener">打开</a>' +
                '<button class="btn btn-sm btn-danger-ghost" type="button" data-action="delete-gallery" data-id="' + item.id + '">🗑️ 删除</button>' +
                '</div></div></div>';
        }).join('');
    }

    function uploadGalleryFile(file) {
        var form = new FormData();
        form.append('type', 'gallery');
        form.append('file', file);
        toast('上传中…');
        apiSend('POST', '/upload', form)
            .then(function (data) {
                toast('上传成功：' + data.url, 'success');
                return loadAll({ silent: true });
            })
            .catch(function (error) { toast('上传失败：' + error.message, 'error'); });
    }

    function deleteGalleryItem(id) {
        confirmAction('删除图库项目', '确定删除 #' + id + ' 吗？服务器上的文件也会被删除。')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/upload/gallery/' + id).then(function () {
                    toast('已删除', 'success');
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('删除失败：' + error.message, 'error'); });
    }

    /* ==================== 音乐 ==================== */

    function renderMusic() {
        $('musicCountBadge').textContent = state.music.length;

        if (!state.music.length) {
            $('musicAdminList').innerHTML = '<div class="hint">曲库还是空的，上传一首歌试试。</div>';
            return;
        }

        $('musicAdminList').innerHTML = state.music.map(function (item) {
            var lyricsText = (item.lyrics || '').trim();
            var lyricsState = lyricsText
                ? '<span class="status status-ok">已配置歌词</span>'
                : '<span class="hint">暂无歌词</span>';
            return '<div class="music-row">' +
                '<div class="info"><strong>#' + item.id + ' ' + esc(item.title) + '</strong>' +
                '<small>' + esc(item.artist) + ' · ' + esc(item.filename) + '</small>' +
                '<small>' + lyricsState + ' · ' + esc(fmtTime(item.created_at)) + '</small></div>' +
                '<audio controls preload="none" src="' + esc(item.url) + '"></audio>' +
                '<div class="actions">' +
                '<button class="btn btn-sm btn-outline" type="button" data-action="edit-lyrics" data-id="' + item.id + '">🎼 歌词</button>' +
                '<a class="btn btn-sm btn-outline" href="' + esc(item.url) + '" target="_blank" rel="noopener">⬇️ 试听</a>' +
                '<button class="btn btn-sm btn-danger-ghost" type="button" data-action="delete-music" data-id="' + item.id + '">🗑️ 删除</button>' +
                '</div></div>';
        }).join('');
    }

    function uploadMusicFile(file) {
        var form = new FormData();
        form.append('title', $('musicTitleInput').value.trim());
        form.append('artist', $('musicArtistInput').value.trim());
        form.append('file', file);
        toast('音乐上传中，请稍候…');
        apiSend('POST', '/music', form)
            .then(function (data) {
                toast('已上传：' + data.title, 'success');
                $('musicTitleInput').value = '';
                $('musicArtistInput').value = '';
                return loadAll({ silent: true });
            })
            .catch(function (error) { toast('上传失败：' + error.message, 'error'); });
    }

    function deleteMusic(id) {
        confirmAction('删除歌曲', '确定删除歌曲 #' + id + ' 吗？服务器上的音频文件也会被删除。')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/music/' + id).then(function () {
                    toast('歌曲已删除', 'success');
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('删除失败：' + error.message, 'error'); });
    }

    var lyricsEditingId = null;

    function openLyricsEditor(id) {
        var item = state.music.filter(function (m) { return m.id === id; })[0];
        if (!item) return;
        lyricsEditingId = id;
        $('lyricsModalTitle').textContent = '编辑歌词 · ' + item.title;
        $('lyricsTextarea').value = item.lyrics || '';
        $('lyricsModal').hidden = false;
    }

    function closeLyricsEditor() {
        lyricsEditingId = null;
        $('lyricsModal').hidden = true;
    }

    function saveLyrics() {
        if (lyricsEditingId === null) return;
        var lyrics = $('lyricsTextarea').value;
        apiSend('PUT', '/music/' + lyricsEditingId + '/lyrics', { lyrics: lyrics })
            .then(function () {
                toast('歌词已保存', 'success');
                closeLyricsEditor();
                return loadAll({ silent: true });
            })
            .catch(function (error) { toast('保存失败：' + error.message, 'error'); });
    }

    /* ==================== 留言 ==================== */

    function renderContacts() {
        $('contactCountBadge').textContent = state.contacts.length;

        if (!state.contacts.length) {
            $('contactTableBody').innerHTML = '<tr><td colspan="6" class="empty-cell">暂无留言</td></tr>';
            return;
        }

        $('contactTableBody').innerHTML = state.contacts.map(function (item) {
            return '<tr>' +
                '<td>' + item.id + '</td>' +
                '<td>' + esc(item.name) + '</td>' +
                '<td>' + (item.email ? '<a href="mailto:' + esc(item.email) + '">' + esc(item.email) + '</a>' : '<span class="hint">—</span>') + '</td>' +
                '<td><div class="cell-clip">' + esc(item.message) + '</div></td>' +
                '<td>' + esc(fmtTime(item.created_at)) + '</td>' +
                '<td class="actions"><button class="btn btn-sm btn-danger-ghost" type="button" data-action="delete-contact" data-id="' + item.id + '">🗑️ 删除</button></td>' +
                '</tr>';
        }).join('');
    }

    function deleteContact(id) {
        confirmAction('删除留言', '确定删除留言 #' + id + ' 吗？')
            .then(function (ok) {
                if (!ok) return;
                return apiSend('DELETE', '/contacts/' + id).then(function () {
                    toast('留言已删除', 'success');
                    return loadAll({ silent: true });
                });
            })
            .catch(function (error) { toast('删除失败：' + error.message, 'error'); });
    }

    /* ==================== 站点设置 ==================== */

    function renderSettings() {
        var s = state.settings || {};
        $('setSiteTitle').value = s.site_title || '';
        $('setSiteSubtitle').value = s.site_subtitle || '';
        $('setAvatar').value = s.avatar || '';
        $('setBanner').value = s.banner || '';
        $('setBgType').value = s.bg_type || 'color';
        $('setBgValue').value = s.bg_value || '';
        $('settingsRaw').textContent = JSON.stringify(s, null, 2);
    }

    function saveSettings() {
        var payload = {
            site_title: $('setSiteTitle').value.trim(),
            site_subtitle: $('setSiteSubtitle').value.trim(),
            avatar: $('setAvatar').value.trim(),
            banner: $('setBanner').value.trim(),
            bg_type: $('setBgType').value,
            bg_value: $('setBgValue').value.trim()
        };

        var button = $('btnSettingsSave');
        button.disabled = true;
        button.textContent = '保存中…';
        apiSend('PUT', '/upload/settings', payload)
            .then(function (data) {
                state.settings = data || {};
                renderSettings();
                toast('设置已保存，刷新前台页面即可看到效果', 'success');
            })
            .catch(function (error) { toast('保存失败：' + error.message, 'error'); })
            .then(function () {
                button.disabled = false;
                button.textContent = '💾 保存设置';
            });
    }

    function uploadSettingImage(input, targetId, label) {
        var file = input.files && input.files[0];
        if (!file) return;
        var form = new FormData();
        form.append('type', 'settings');
        form.append('file', file);
        toast(label + '上传中…');
        apiSend('POST', '/upload', form)
            .then(function (data) {
                $(targetId).value = data.url;
                toast(label + '已上传，记得点「保存设置」', 'success');
            })
            .catch(function (error) { toast('上传失败：' + error.message, 'error'); })
            .then(function () { input.value = ''; });
    }

    /* ==================== 接口自检 ==================== */

    function healthChecks() {
        var firstPost = state.posts.length ? state.posts[state.posts.length - 1].id : 1;
        return [
            { name: '站点设置读取', method: 'GET', url: '/api/upload/settings' },
            { name: '文章列表（分页）', method: 'GET', url: '/api/posts?page=1&limit=1' },
            { name: '文章详情', method: 'GET', url: '/api/posts/' + firstPost },
            { name: '评论总数', method: 'GET', url: '/api/comments/count' },
            { name: '图库列表', method: 'GET', url: '/api/upload/gallery' },
            { name: '音乐列表', method: 'GET', url: '/api/music' },
            { name: '留言公开摘要', method: 'GET', url: '/api/contacts/public' },
            { name: '访客计数', method: 'GET', url: '/api/visitor' },
            { name: 'RSS 订阅', method: 'GET', url: '/rss.xml' },
            { name: '站点地图', method: 'GET', url: '/sitemap.xml' },
            { name: 'robots.txt', method: 'GET', url: '/robots.txt' },
            { name: '未知接口应返回 404', method: 'GET', url: '/api/not-exist', expect: 404 },
            { name: '登录状态校验（需登录）', method: 'GET', url: '/api/auth/check', auth: true },
            { name: '评论管理列表（需登录）', method: 'GET', url: '/api/comments/admin/all', auth: true },
            { name: '留言管理列表（需登录）', method: 'GET', url: '/api/contacts', auth: true },
            { name: '未带令牌应被拒绝', method: 'GET', url: '/api/contacts', expect: 401 }
        ];
    }

    function mediaChecks() {
        var list = state.music.map(function (item) {
            return { kind: '🎵 音乐', name: item.title, url: item.url };
        });
        state.gallery.forEach(function (item) {
            list.push({ kind: item.type === 'video' ? '🎬 视频' : '🖼️ 图片', name: item.original_name || item.filename, url: item.url });
        });
        ['avatar', 'banner'].forEach(function (key) {
            var url = state.settings[key];
            if (url) list.push({ kind: key === 'avatar' ? '🙂 头像' : '🏞️ 横幅', name: url, url: url });
        });
        ['morning', 'afternoon', 'night'].forEach(function (period) {
            ['sakura', 'snow'].forEach(function (weather) {
                var url = '/uploads/hero/' + weather + '-' + period + '.webp';
                list.push({ kind: '🌸 Hero 背景', name: weather + '-' + period + '.webp', url: url });
            });
        });
        list.push({ kind: '🐊 OC 立绘', name: 'oc.webp', url: '/uploads/hero/oc.webp' });
        return list;
    }

    function probe(check) {
        var started = performance.now();
        var headers = {};
        if (check.auth && state.token) headers.Authorization = 'Bearer ' + state.token;
        var expected = check.expect || 200;

        return fetch(check.url, { method: check.method || 'GET', headers: headers, cache: 'no-store' })
            .then(function (response) {
                var ms = Math.round(performance.now() - started);
                var ok = response.status === expected;
                return { ok: ok, status: response.status, ms: ms, note: ok ? '通过' : ('期望 ' + expected) };
            })
            .catch(function (error) {
                return { ok: false, status: 0, ms: Math.round(performance.now() - started), note: error.message };
            });
    }

    function probeMedia(item) {
        var started = performance.now();
        return fetch(item.url, { method: 'HEAD', cache: 'no-store' })
            .then(function (response) {
                var ms = Math.round(performance.now() - started);
                var type = response.headers.get('content-type') || '';
                if (!response.ok) return { ok: false, status: response.status, note: '文件不存在或无法访问' };
                if (type.indexOf('text/html') !== -1) return { ok: false, status: response.status, note: '返回了网页而不是媒体文件' };
                return { ok: true, status: response.status, note: type.split(';')[0] + ' · ' + ms + 'ms' };
            })
            .catch(function (error) {
                return { ok: false, status: 0, note: error.message };
            });
    }

    function statusCell(result) {
        var cls = result.ok ? 'status-ok' : 'status-fail';
        var text = result.ok ? '✅ ' + result.status : '❌ ' + (result.status || 'ERR');
        return '<span class="status ' + cls + '">' + text + '</span>';
    }

    function runHealthCheck() {
        var button = $('btnRunHealth');
        button.disabled = true;
        button.textContent = '检查中…';

        var rows = [];
        var checks = healthChecks();
        var media = mediaChecks();

        $('healthTableBody').innerHTML = '<tr><td colspan="6" class="empty-cell">检查进行中…</td></tr>';
        $('mediaTableBody').innerHTML = '<tr><td colspan="4" class="empty-cell">检查进行中…</td></tr>';
        $('healthSummary').textContent = '正在依次请求接口与媒体文件…';

        var chain = Promise.resolve();
        checks.forEach(function (check) {
            chain = chain.then(function () {
                return probe(check).then(function (result) {
                    result.name = check.name;
                    result.method = check.method || 'GET';
                    result.url = check.url;
                    rows.push(result);
                    renderHealthRows(rows, checks.length);
                });
            });
        });

        var mediaRows = [];
        media.forEach(function (item) {
            chain = chain.then(function () {
                return probeMedia(item).then(function (result) {
                    result.kind = item.kind;
                    result.name = item.name;
                    result.url = item.url;
                    mediaRows.push(result);
                    renderMediaRows(mediaRows, media.length);
                });
            });
        });

        chain.then(function () {
            var failedApis = rows.filter(function (r) { return !r.ok; }).length;
            var failedMedia = mediaRows.filter(function (r) { return !r.ok; }).length;
            $('healthSummary').textContent = '接口 ' + rows.length + ' 项，失败 ' + failedApis + ' 项；媒体 ' +
                mediaRows.length + ' 项，失败 ' + failedMedia + ' 项。' +
                (failedMedia ? ' 失败项通常是文件被删除或尚未上传。' : '');
            toast(failedApis + failedMedia === 0 ? '自检全部通过 🎉' : ('自检发现问题：接口 ' + failedApis + ' 项，媒体 ' + failedMedia + ' 项'),
                failedApis + failedMedia === 0 ? 'success' : 'error');
        }).catch(function (error) {
            toast('自检异常：' + error.message, 'error');
        }).then(function () {
            button.disabled = false;
            button.textContent = '▶ 开始自检';
        });
    }

    function renderHealthRows(rows, total) {
        $('healthTableBody').innerHTML = rows.map(function (row) {
            return '<tr><td>' + esc(row.name) + '</td><td>' + row.method + '</td><td><code>' + esc(row.url) + '</code></td>' +
                '<td>' + statusCell(row) + '</td><td>' + row.ms + 'ms</td><td>' + esc(row.note) + '</td></tr>';
        }).join('') + (rows.length < total ? '<tr><td colspan="6" class="empty-cell">继续检查中…（' + rows.length + '/' + total + '）</td></tr>' : '');
    }

    function renderMediaRows(rows, total) {
        $('mediaTableBody').innerHTML = rows.map(function (row) {
            return '<tr><td>' + esc(row.kind) + '</td><td>' + esc(row.name) + '</td><td><code>' + esc(row.url) + '</code></td>' +
                '<td>' + statusCell(row) + ' <span class="hint">' + esc(row.note) + '</span></td></tr>';
        }).join('') + (rows.length < total ? '<tr><td colspan="4" class="empty-cell">继续检查中…（' + rows.length + '/' + total + '）</td></tr>' : '');
    }

    /* ==================== 确认弹窗 ==================== */

    var confirmResolve = null;

    function confirmAction(title, message) {
        return new Promise(function (resolve) {
            confirmResolve = resolve;
            $('confirmTitle').textContent = title;
            $('confirmMessage').textContent = message;
            $('confirmModal').hidden = false;
            $('btnConfirmOk').focus();
        });
    }

    function settleConfirm(result) {
        $('confirmModal').hidden = true;
        var resolve = confirmResolve;
        confirmResolve = null;
        if (resolve) resolve(result);
    }

    /* ==================== 标签页 ==================== */

    function selectTab(tab) {
        state.activeTab = tab;
        Array.prototype.forEach.call(document.querySelectorAll('.nav-btn'), function (button) {
            button.classList.toggle('active', button.getAttribute('data-tab') === tab);
        });
        Array.prototype.forEach.call(document.querySelectorAll('.tab-panel'), function (panel) {
            panel.classList.toggle('active', panel.id === 'tab-' + tab);
        });
    }

    /* ==================== 事件绑定 ==================== */

    function bindEvents() {
        $('loginForm').addEventListener('submit', handleLoginSubmit);
        $('btnLogout').addEventListener('click', logout);
        $('btnReload').addEventListener('click', function () { loadAll(); });

        $('adminNav').addEventListener('click', function (event) {
            var button = event.target.closest('.nav-btn');
            if (button) selectTab(button.getAttribute('data-tab'));
        });

        document.addEventListener('click', function (event) {
            var goto = event.target.closest('[data-goto-tab]');
            if (goto) { selectTab(goto.getAttribute('data-goto-tab')); return; }

            var actionButton = event.target.closest('[data-action]');
            if (!actionButton) return;
            var action = actionButton.getAttribute('data-action');
            var id = Number(actionButton.getAttribute('data-id'));

            if (action === 'edit-post') editPost(id);
            else if (action === 'delete-post') deletePost(id);
            else if (action === 'delete-comment') deleteComment(id);
            else if (action === 'delete-gallery') deleteGalleryItem(id);
            else if (action === 'delete-music') deleteMusic(id);
            else if (action === 'edit-lyrics') openLyricsEditor(id);
            else if (action === 'delete-contact') deleteContact(id);
        });

        $('btnPostNew').addEventListener('click', resetPostForm);
        $('btnPostReset').addEventListener('click', function () { resetPostForm(); toast('表单已清空'); });
        $('btnPostSave').addEventListener('click', savePost);
        $('btnPostPreview').addEventListener('click', togglePostPreview);
        $('postFilterInput').addEventListener('input', renderPosts);
        $('postImageInput').addEventListener('change', function () {
            if (this.files && this.files[0]) uploadPostImage(this.files[0]);
            this.value = '';
        });

        $('btnCommentClear').addEventListener('click', clearPostComments);

        $('galleryFileInput').addEventListener('change', function () {
            if (this.files && this.files[0]) uploadGalleryFile(this.files[0]);
            this.value = '';
        });

        $('musicFileInput').addEventListener('change', function () {
            if (this.files && this.files[0]) uploadMusicFile(this.files[0]);
            this.value = '';
        });

        $('btnLyricsSave').addEventListener('click', saveLyrics);
        $('btnLyricsCancel').addEventListener('click', closeLyricsEditor);
        $('lyricsModalClose').addEventListener('click', closeLyricsEditor);

        $('btnSettingsSave').addEventListener('click', saveSettings);
        $('btnSettingsReload').addEventListener('click', function () {
            loadSettings().then(function () { renderSettings(); toast('已重新读取'); });
        });
        $('avatarUploadInput').addEventListener('change', function () { uploadSettingImage(this, 'setAvatar', '头像'); });
        $('bannerUploadInput').addEventListener('change', function () { uploadSettingImage(this, 'setBanner', '横幅图'); });

        $('btnRunHealth').addEventListener('click', runHealthCheck);

        $('btnConfirmOk').addEventListener('click', function () { settleConfirm(true); });
        $('btnConfirmCancel').addEventListener('click', function () { settleConfirm(false); });
        $('confirmClose').addEventListener('click', function () { settleConfirm(false); });

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            if (!$('lyricsModal').hidden) closeLyricsEditor();
            else if (!$('confirmModal').hidden) settleConfirm(false);
        });
    }

    /* ==================== 启动 ==================== */

    function init() {
        bindEvents();
        resetPostForm();
        selectTab('overview');

        var saved = null;
        try { saved = localStorage.getItem(TOKEN_KEY); } catch (e) { /* ignore */ }

        if (!saved) { showLogin(''); return; }

        state.token = saved;
        toast('正在校验登录状态…');
        enterAdmin().catch(function () { /* 已在 showLogin 中提示 */ });
    }

    init();
})();
