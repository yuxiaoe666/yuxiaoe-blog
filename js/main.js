(function () {
    'use strict';

    var API_BASE = '/api';

    function $(id) { return document.getElementById(id); }
    function $$(sel) { return document.querySelectorAll(sel); }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ==================== API ==================== */
    function apiGet(url) {
        return fetch(API_BASE + url).then(function (res) {
            if (!res.ok) throw new Error('请求失败');
            return res.json();
        });
    }

    /* ==================== Toast ==================== */
    var toastTimer;
    function showToast(msg) {
        var toast = $('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }

    /* ==================== 状态 ==================== */
    var state = {
        page: 'home',
        posts: [],
        postMeta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
        gallery: [],
        settings: {},
        filter: { search: '', tags: [], year: null }
    };

    /* ==================== 路由 ==================== */
    function parseHash() {
        var hash = window.location.hash.replace('#', '') || '/home';
        var parts = hash.split('/').filter(Boolean);
        return { page: parts[0] || 'home' };
    }

    function navigate(page) {
        window.location.hash = '/' + page;
    }

    function handleRoute() {
        var route = parseHash();
        state.page = route.page;

        // 切换到文章页时清空搜索框
        if (route.page !== 'posts') {
            var searchInput = $('postSearchInput');
            if (searchInput) searchInput.value = '';
        }

        $$('.nav-item').forEach(function (n) { n.classList.remove('active'); });
        $$('.nav-item[data-page="' + route.page + '"]').forEach(function (n) {
            n.classList.add('active');
        });

        $$('.content-panel').forEach(function (p) { p.classList.remove('active-panel'); });

        var panelId = 'panel-' + route.page;
        var panel = $(panelId);
        if (!panel) panel = $('panel-home');

        panel.classList.add('active-panel');
        panel.style.animation = 'none';
        panel.offsetHeight;
        panel.style.animation = '';

        $('mainContent').scrollTop = 0;

        if (route.page === 'home') updateStats();
        else if (route.page === 'posts') loadPosts();
        else if (route.page === 'archives') loadArchives();
        else if (route.page === 'gallery') loadGallery();
        else if (route.page === 'music') loadMusic();
    }

    /* ==================== 设置 ==================== */
    function fetchSettings() {
        return apiGet('/upload/settings').then(function (s) {
            state.settings = s || {};
            applyBanner();
            updateSidebarAvatar();
            return s;
        }).catch(function () {
            applyBanner();
            updateSidebarAvatar();
        });
    }

    function applyBanner() {
        var img = $('bannerImg');
        if (!img) return; // banner 可能被注释掉了（新 Hero 模式）
        var url = state.settings.banner || '';
        if (url) {
            img.style.backgroundImage = 'url(' + url + ')';
            img.classList.add('has-image');
        } else {
            img.style.backgroundImage = '';
            img.classList.remove('has-image');
        }
    }

    function updateSidebarAvatar() {
        var url = state.settings.avatar || '';
        // 侧边栏头像
        var container = $('sidebarAvatar');
        if (container) {
            if (url) {
                container.innerHTML = '<img src="' + url + '" alt="头像" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--pink-300);padding:2px;background:linear-gradient(135deg,var(--pink-200),var(--pink-400));">';
            } else {
                container.innerHTML = '<div class="avatar-placeholder">🌸</div>';
            }
        }
        // 顶栏头像
        var navAvatar = $('heroNavAvatar');
        if (navAvatar) {
            if (url) {
                navAvatar.innerHTML = '<img src="' + url + '" alt="头像" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.5);">';
            } else {
                navAvatar.innerHTML = '<div class="avatar-placeholder">🌸</div>';
            }
        }
    }

    /* ==================== 首页 ==================== */
    function updateStats() {
        var sb = $('statBlogs'), sp = $('statPhotos'), sc = $('statComments');
        if (sb) sb.textContent = state.posts.length;
        if (sp) sp.textContent = state.gallery.length;
        if (sc) {
            apiGet('/comments/count').then(function (data) {
                sc.textContent = data.count;
            }).catch(function () {
                sc.textContent = '0';
            });
        }
    }

    /* ==================== 文章列表 ==================== */
    function fetchPosts(page) {
        var params = page ? '?page=' + page : '';
        return apiGet('/posts' + params).then(function (data) {
            state.posts = data.posts || data;
            state.postMeta = {
                page: data.page || 1,
                limit: data.limit || 10,
                total: data.total || state.posts.length,
                totalPages: data.totalPages || 1,
                hasNext: data.hasNext || false,
                hasPrev: data.hasPrev || false,
            };
            return state.posts;
        }).catch(function () {
            state.posts = [];
            state.postMeta = { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
            return [];
        });
    }

    function loadPosts() {
        fetchPosts().then(function () {
            renderPosts();
            buildFilterBar();
            updateStats();
        });
    }

    function buildFilterBar() {
        // 收集所有标签（去重 + 排序）
        var tagSet = {};
        var yearSet = {};
        state.posts.forEach(function (post) {
            var tags = Array.isArray(post.tags) ? post.tags : [];
            tags.forEach(function (t) { if (t) tagSet[t] = (tagSet[t] || 0) + 1; });
            var y = new Date(post.date).getFullYear();
            if (y) yearSet[y] = true;
        });

        var bar = $('postFilterBar');
        if (!bar) return;

        var tags = Object.keys(tagSet).sort(function (a, b) { return tagSet[b] - tagSet[a]; });
        var years = Object.keys(yearSet).sort().reverse();
        var hasFilters = tags.length > 0 || years.length > 1;

        bar.style.display = hasFilters ? 'flex' : 'none';
        if (!hasFilters) return;

        // 标签按钮
        var tagsHtml = tags.map(function (t) {
            var isActive = state.filter.tags.indexOf(t) !== -1;
            return '<span class="filter-tag' + (isActive ? ' active' : '') + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '<sup> ' + tagSet[t] + '</sup></span>';
        }).join('');
        $('filterTags').innerHTML = tagsHtml || '<span style="color:#b89aa6;font-size:12px;">暂无标签</span>';

        // 年份按钮
        var yearsHtml = '<span class="filter-tag' + (state.filter.year === null ? ' active' : '') + '" data-year="">全部</span>';
        yearsHtml += years.map(function (y) {
            return '<span class="filter-tag' + (state.filter.year === Number(y) ? ' active' : '') + '" data-year="' + y + '">' + y + '</span>';
        }).join('');
        $('filterYears').innerHTML = yearsHtml;

        // 清除按钮
        var hasActive = state.filter.tags.length > 0 || state.filter.year !== null;
        $('filterClear').style.display = hasActive ? 'inline-block' : 'none';

        // 事件委托
        $('filterTags').onclick = function (e) {
            var el = e.target.closest('.filter-tag');
            if (!el) return;
            var tag = el.getAttribute('data-tag');
            var idx = state.filter.tags.indexOf(tag);
            if (idx === -1) {
                state.filter.tags.push(tag);
            } else {
                state.filter.tags.splice(idx, 1);
            }
            applyFilterAndRender();
        };

        $('filterYears').onclick = function (e) {
            var el = e.target.closest('.filter-tag');
            if (!el) return;
            var y = el.getAttribute('data-year');
            state.filter.year = y === '' ? null : Number(y);
            applyFilterAndRender();
        };

        $('filterClear').onclick = function () {
            state.filter.tags = [];
            state.filter.year = null;
            $('postSearchInput').value = '';
            state.filter.search = '';
            applyFilterAndRender();
        };
    }

    function applyFilterAndRender() {
        renderPosts();
        buildFilterBar();
    }

    function renderPosts() {
        var list = $('blogList');
        var empty = $('blogEmpty');
        var countEl = $('postSearchCount');
        if (!list) return;
        if (state.posts.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (countEl) countEl.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';

        var f = state.filter;
        var filtered = state.posts;

        // 文字搜索
        if (f.search && f.search.trim()) {
            var q = f.search.trim().toLowerCase();
            filtered = filtered.filter(function (post) {
                if (post.title.toLowerCase().indexOf(q) !== -1) return true;
                var tags = Array.isArray(post.tags) ? post.tags : [];
                return tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
            });
        }

        // 标签筛选（多选 AND）
        if (f.tags.length > 0) {
            filtered = filtered.filter(function (post) {
                var tags = Array.isArray(post.tags) ? post.tags : [];
                return f.tags.every(function (ft) { return tags.indexOf(ft) !== -1; });
            });
        }

        // 年份筛选
        if (f.year !== null) {
            filtered = filtered.filter(function (post) {
                return new Date(post.date).getFullYear() === f.year;
            });
        }

        // 搜索计数
        var hasAnyFilter = (f.search && f.search.trim()) || f.tags.length > 0 || f.year !== null;
        if (countEl) {
            if (hasAnyFilter && filtered.length !== state.posts.length) {
                countEl.textContent = '找到 ' + filtered.length + ' / ' + state.posts.length + ' 篇';
                countEl.style.display = 'inline';
            } else {
                countEl.style.display = 'none';
            }
        }

        if (filtered.length === 0) {
            list.innerHTML = '<div class="card" style="text-align:center;color:#b89aa6;padding:28px;">🔍 没有找到匹配的文章</div>';
            return;
        }

        var html = '';
        filtered.forEach(function (post) {
            var d = new Date(post.date);
            var cc = post.commentCount || 0;
            var tags = Array.isArray(post.tags) ? post.tags : [];
            var tagsHtml = tags.map(function (t) { return '<span class="blog-tag">#' + escapeHtml(t) + '</span>'; }).join('');

            html += '<a href="/post/' + post.id + '" class="blog-item" style="text-decoration:none;color:inherit;">' +
                '<div class="blog-date"><div class="day">' + d.getDate() + '</div><div class="month">' + (d.getMonth() + 1) + '月</div></div>' +
                '<div class="blog-info">' +
                '<h3>' + escapeHtml(post.title) + '</h3>' +
                '<div class="blog-tags">' + tagsHtml + '</div>' +
                '<div style="font-size:11px;color:#b89aa6;margin-top:4px;">💬 ' + cc + ' 条评论 · 📅 ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日</div>' +
                '</div>' +
                '</a>';
        });
        list.innerHTML = html;

        // 重新触发渐显动画
        setTimeout(function () {
            var items = document.querySelectorAll('#blogList .blog-item');
            items.forEach(function (el, i) {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                    el.style.transitionDelay = (i * 0.06) + 's';
                }
            });
            observeNewElements();
        }, 50);

        renderPagination();
    }

    function renderPagination() {
        var container = $('postPagination');
        if (!container) return;
        
        var meta = state.postMeta;
        if (meta.totalPages <= 1) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        var html = '';
        
        if (meta.hasPrev) {
            html += '<button class="pagination-btn" data-page="' + (meta.page - 1) + '">←</button>';
        } else {
            html += '<span class="pagination-btn disabled">←</span>';
        }
        
        for (var i = 1; i <= meta.totalPages; i++) {
            if (i === meta.page) {
                html += '<span class="pagination-btn active">' + i + '</span>';
            } else {
                html += '<button class="pagination-btn" data-page="' + i + '">' + i + '</button>';
            }
        }
        
        if (meta.hasNext) {
            html += '<button class="pagination-btn" data-page="' + (meta.page + 1) + '">→</button>';
        } else {
            html += '<span class="pagination-btn disabled">→</span>';
        }
        
        container.innerHTML = html;
        
        container.onclick = function (e) {
            var btn = e.target.closest('.pagination-btn:not(.disabled):not(.active)');
            if (!btn) return;
            var page = parseInt(btn.getAttribute('data-page'));
            if (!isNaN(page)) {
                fetchPosts(page).then(function () {
                    renderPosts();
                    buildFilterBar();
                });
            }
        };
    }

    /* ==================== 归档 ==================== */
    function loadArchives() {
        fetchPosts().then(function () {
            renderArchives();
        });
    }

    function renderArchives() {
        var container = $('archivesTimeline');
        if (!container) return;
        
        if (state.posts.length === 0) {
            container.innerHTML = '<div style="color:#b89aa6;padding:20px;text-align:center;">📝 还没有文章</div>';
            return;
        }
        
        var grouped = {};
        state.posts.forEach(function (post) {
            var year = new Date(post.date).getFullYear();
            var month = new Date(post.date).getMonth() + 1;
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][month]) grouped[year][month] = [];
            grouped[year][month].push(post);
        });
        
        var years = Object.keys(grouped).sort(function (a, b) { return b - a; });
        var html = '';
        
        years.forEach(function (year) {
            var months = Object.keys(grouped[year]).sort(function (a, b) { return b - a; });
            html += '<div class="archive-year">' + year + '年</div>';
            html += '<div class="archive-months">';
            months.forEach(function (month) {
                var posts = grouped[year][month];
                html += '<div class="archive-month">';
                html += '<div class="month-header">' + month + '月 <span class="month-count">' + posts.length + '</span></div>';
                html += '<ul class="month-posts">';
                posts.forEach(function (post) {
                    var day = new Date(post.date).getDate();
                    var tags = Array.isArray(post.tags) ? post.tags : [];
                    html += '<li><a href="/post/' + post.id + '" style="text-decoration:none;color:inherit;"><span class="post-day">' + day + '</span><span class="post-title">' + escapeHtml(post.title) + '</span></a></li>';
                });
                html += '</ul></div>';
            });
            html += '</div>';
        });
        
        container.innerHTML = html;
    }

    /* ==================== 相册 ==================== */
    function fetchGallery() {
        return apiGet('/upload/gallery').then(function (items) {
            state.gallery = items;
            return items;
        }).catch(function () { return []; });
    }

    function loadGallery() {
        fetchGallery().then(function () {
            renderGallery();
            updateStats();
        });
    }

    function renderGallery() {
        var grid = $('galleryGrid');
        if (!grid) return;
        if (state.gallery.length === 0) {
            grid.innerHTML = '<div style="color:#b89aa6;padding:20px;text-align:center;">🌸 相册还没有内容</div>';
            return;
        }
        var html = '';
        state.gallery.forEach(function (item) {
            var isVideo = item.type === 'video';
            html += '<div class="gallery-item" data-lightbox-url="' + item.url + '" data-lightbox-type="' + (item.type || 'image') + '">' +
                (isVideo
                    ? '<video src="' + item.url + '" preload="metadata"></video><span class="video-icon">▶</span>'
                    : '<img src="' + item.url + '" alt="照片" loading="lazy">') +
                '</div>';
        });
        grid.innerHTML = html;
    }

    function openLightbox(url, type) {
        var container = $('lightboxMedia');
        container.innerHTML = '';
        if (type === 'video') {
            var v = document.createElement('video');
            v.src = url;
            v.controls = true;
            v.autoplay = true;
            v.style.cssText = 'max-width:88vw;max-height:88vh;border-radius:14px;';
            v.onclick = function (e) { e.stopPropagation(); };
            container.appendChild(v);
        } else {
            var img = document.createElement('img');
            img.src = url;
            img.alt = '预览';
            container.appendChild(img);
        }
        $('lightbox').classList.add('show');
    }

    function closeLightbox() {
        $('lightbox').classList.remove('show');
        $('lightboxMedia').innerHTML = '';
    }

    /* ==================== 音乐播放器 ==================== */
    var musicState = {
        list: [],
        currentIndex: -1,
        isPlaying: false,
        mode: 'loop',
        lyricsLines: [],
        currentLyricIndex: -1,
    };

    function fetchMusic() {
        return apiGet('/music').then(function (items) {
            musicState.list = items;
            return items;
        }).catch(function () { return []; });
    }

    function loadMusic() {
        fetchMusic().then(function () {
            renderMusicList();
        });
    }

    function renderMusicList() {
        var listEl = $('musicList');
        if (!listEl) return;
        if (musicState.list.length === 0) {
            listEl.innerHTML = '<div style="color:#b89aa6;padding:12px;text-align:center;">🎵 还没有音乐，等待上传</div>';
            return;
        }
        var html = '';
        musicState.list.forEach(function (item, index) {
            var cls = 'music-item';
            if (musicState.currentIndex === index) cls += ' active';
            if (musicState.currentIndex === index && musicState.isPlaying) cls += ' music-item-playing';
            html += '<div class="' + cls + '" data-index="' + index + '">' +
                '<div class="music-item-num">' + (index + 1) + '</div>' +
                '<div class="music-item-body">' +
                '<div class="music-item-title">' + escapeHtml(item.title) + '</div>' +
                '<div class="music-item-artist">' + escapeHtml(item.artist) + '</div>' +
                '</div>' +
                '</div>';
        });
        listEl.innerHTML = html;
    }

    function playByIndex(index) {
        if (index < 0 || index >= musicState.list.length) return;
        musicState.currentIndex = index;
        var audio = $('audioPlayer');
        var item = musicState.list[index];
        audio.src = item.url;
        audio.load();
        audio.play().catch(function () {});
        musicState.isPlaying = true;
        updatePlayerUI(item);
        renderMusicList();
        loadLyrics(item);
    }

    function togglePlay() {
        var audio = $('audioPlayer');
        if (musicState.currentIndex === -1 && musicState.list.length > 0) {
            playByIndex(0);
            return;
        }
        if (musicState.currentIndex === -1) return;
        if (audio.paused) {
            audio.play().catch(function () {});
            musicState.isPlaying = true;
        } else {
            audio.pause();
            musicState.isPlaying = false;
        }
        updatePlayBtn();
        renderMusicList();
    }

    function playNext() {
        if (musicState.list.length === 0) return;
        var next;
        if (musicState.mode === 'shuffle') {
            next = Math.floor(Math.random() * musicState.list.length);
        } else {
            next = (musicState.currentIndex + 1) % musicState.list.length;
        }
        playByIndex(next);
    }

    function playPrev() {
        if (musicState.list.length === 0) return;
        var prev = musicState.currentIndex - 1;
        if (prev < 0) prev = musicState.list.length - 1;
        playByIndex(prev);
    }

    function toggleMode() {
        var modes = ['loop', 'shuffle', 'single'];
        var icons = ['🔁', '🔀', '🔂'];
        var currentIdx = modes.indexOf(musicState.mode);
        var nextIdx = (currentIdx + 1) % modes.length;
        musicState.mode = modes[nextIdx];
        $('musicMode').textContent = icons[nextIdx];
        showToast('播放模式：' + ({ loop: '列表循环', shuffle: '随机播放', single: '单曲循环' })[musicState.mode]);
    }

    function updatePlayerUI(item) {
        $('musicTitle').textContent = item.title;
        $('musicArtist').textContent = item.artist;
        $('musicCurrentTime').textContent = '00:00';
        $('musicDuration').textContent = '--:--';
        $('musicProgressFill').style.width = '0%';
        updatePlayBtn();
    }

    function updatePlayBtn() {
        var btn = $('musicPlay');
        if (musicState.isPlaying) {
            btn.textContent = '⏸';
            btn.classList.add('playing');
        } else {
            btn.textContent = '▶';
            btn.classList.remove('playing');
        }
    }

    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function loadLyrics(item) {
        var lyricsEl = $('musicLyrics');
        if (!lyricsEl) return;
        if (!item.lyrics || !item.lyrics.trim()) {
            lyricsEl.innerHTML = '<p style="color:#b89aa6;text-align:center;padding:20px 0;">🎶 纯音乐，暂无歌词</p>';
            musicState.lyricsLines = [];
            return;
        }
        var raw = item.lyrics;
        var lines = [];
        var regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
        var match;
        while ((match = regex.exec(raw)) !== null) {
            var min = parseInt(match[1]);
            var sec = parseInt(match[2]);
            var ms = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3]);
            var time = min * 60 + sec + ms / 1000;
            var text = match[4].trim();
            if (text) lines.push({ time: time, text: text });
        }
        lines.sort(function (a, b) { return a.time - b.time; });
        musicState.lyricsLines = lines;
        musicState.currentLyricIndex = -1;
        renderLyrics(lines);
    }

    function renderLyrics(lines) {
        var el = $('musicLyrics');
        if (!el) return;
        if (lines.length === 0) {
            el.innerHTML = '<p style="color:#b89aa6;text-align:center;padding:20px 0;">🎵 暂无歌词</p>';
            return;
        }
        var html = '';
        lines.forEach(function (line, i) {
            html += '<p class="lyric-line" data-lyric-index="' + i + '">' + escapeHtml(line.text) + '</p>';
        });
        el.innerHTML = html;
    }

    function syncLyrics(currentTime) {
        var lines = musicState.lyricsLines;
        if (lines.length === 0) return;
        var activeIdx = -1;
        for (var i = lines.length - 1; i >= 0; i--) {
            if (currentTime >= lines[i].time) {
                activeIdx = i;
                break;
            }
        }
        if (activeIdx === musicState.currentLyricIndex) return;
        musicState.currentLyricIndex = activeIdx;
        var allLines = document.querySelectorAll('.lyric-line');
        allLines.forEach(function (l, i) {
            l.classList.toggle('active', i === activeIdx);
        });
        if (activeIdx >= 0) {
            var target = allLines[activeIdx];
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    function initMusicPlayer() {
        var audio = $('audioPlayer');
        if (!audio) return;

        audio.addEventListener('loadedmetadata', function () {
            $('musicDuration').textContent = formatTime(audio.duration);
        });

        audio.addEventListener('timeupdate', function () {
            if (audio.duration) {
                var pct = (audio.currentTime / audio.duration) * 100;
                $('musicProgressFill').style.width = pct + '%';
                $('musicCurrentTime').textContent = formatTime(audio.currentTime);
                syncLyrics(audio.currentTime);
            }
        });

        audio.addEventListener('ended', function () {
            if (musicState.mode === 'single') {
                audio.currentTime = 0;
                audio.play().catch(function () {});
            } else {
                playNext();
            }
        });

        audio.addEventListener('play', function () {
            musicState.isPlaying = true;
            updatePlayBtn();
            renderMusicList();
        });

        audio.addEventListener('pause', function () {
            musicState.isPlaying = false;
            updatePlayBtn();
            renderMusicList();
        });

        audio.addEventListener('error', function () {
            showToast('音频加载失败');
            musicState.isPlaying = false;
            updatePlayBtn();
        });

        $('musicPlay').addEventListener('click', togglePlay);
        $('musicNext').addEventListener('click', playNext);
        $('musicPrev').addEventListener('click', playPrev);
        $('musicMode').addEventListener('click', toggleMode);
        $('musicVolume').addEventListener('input', function () {
            audio.volume = this.value / 100;
        });
        audio.volume = 0.7;

        $('musicProgressBar').addEventListener('click', function (e) {
            if (!audio.duration) return;
            var rect = this.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pct * audio.duration;
        });

        $('musicList').addEventListener('click', function (e) {
            var item = e.target.closest('.music-item');
            if (!item) return;
            var idx = parseInt(item.getAttribute('data-index'));
            if (!isNaN(idx)) playByIndex(idx);
        });

        fetchMusic().then(function () { renderMusicList(); });
    }

    /* ==================== 联系表单 ==================== */
    function sendContactMsg() {
        var name = $('contactName');
        var msg = $('contactMsg');
        var email = $('contactEmail');
        if (!name || !msg) return;
        var nameVal = name.value.trim();
        var msgVal = msg.value.trim();
        if (!nameVal) { showToast('请填写名字'); return; }
        if (!msgVal) { showToast('请填写留言'); return; }

        fetch(API_BASE + '/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: nameVal, email: (email ? email.value.trim() : ''), message: msgVal }),
        }).then(function (r) {
            if (!r.ok) return r.json().then(function (d) { throw new Error(d.error || '发送失败'); });
            return r.json();
        }).then(function () {
            name.value = '';
            if (email) email.value = '';
            msg.value = '';
            showToast('💌 留言已发送');
        }).catch(function (err) {
            showToast(err.message || '发送失败，请稍后再试');
        });
    }

    /* ==================== 事件绑定 ==================== */
    function bindEvents() {
        $$('.nav-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                var page = this.getAttribute('data-page');
                if (page) navigate(page);
            });
        });

        $$('.hero-actions .btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var t = this.getAttribute('data-goto');
                if (t) navigate(t);
            });
        });

        var sendBtn = $('sendMsgBtn');
        if (sendBtn) sendBtn.addEventListener('click', sendContactMsg);

        var closeBtn = $('lightboxClose');
        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

        $('lightbox').addEventListener('click', function (e) {
            if (e.target === this) closeLightbox();
        });

        // 文章链接：拦截点击，用遮罩过渡后跳转
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[href^="/post/"]');
            if (!link) return;
            var href = link.getAttribute('href');
            if (!href || href === '#') return;
            if (link.hostname && link.hostname !== location.hostname) return;
            if (link.target === '_blank') return;
            e.preventDefault();
            var overlay = $('pageTransition');
            if (overlay) overlay.classList.add('active');
            setTimeout(function () {
                location.href = href;
            }, 300);
        });

        document.addEventListener('click', function (e) {
            var item = e.target.closest('.gallery-item');
            if (!item) return;
            var url = item.getAttribute('data-lightbox-url');
            if (url) openLightbox(url, item.getAttribute('data-lightbox-type') || 'image');
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeLightbox();
        });

        window.addEventListener('hashchange', handleRoute);

        // 文章搜索：300ms 防抖
        var searchTimer = null;
        var searchInput = $('postSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                var val = this.value;
                state.filter.search = val;
                if (searchTimer) clearTimeout(searchTimer);
                searchTimer = setTimeout(function () {
                    applyFilterAndRender();
                }, 300);
            });
        }
    }

        /* ==================== 全局暴露 ==================== */
        window.Blog = {
            openLightbox: openLightbox,
            closeLightbox: closeLightbox,
        };

    /* ==================== Hero 全屏背景 ==================== */
    var heroPeriod = localStorage.getItem('blog_theme') || 'auto'; // 'auto' | 'morning' | 'afternoon' | 'night'

    function getTimePeriod() {
        var hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        return 'night';
    }

    function getEffectivePeriod() {
        return heroPeriod === 'auto' ? getTimePeriod() : heroPeriod;
    }

    function applyHeroBg(period) {
        var heroBg = $('heroBgLayer');
        var heroOc = $('heroOcLayer');
        var heroFull = $('heroFullscreen');
        if (!heroBg || !heroFull) return;

        // 更新 night 类和 body 深色模式
        if (period === 'night') {
            heroFull.classList.add('night');
            document.body.classList.add('dark-mode');
        } else {
            heroFull.classList.remove('night');
            document.body.classList.remove('dark-mode');
        }

        // CSS 渐变 fallback
        heroBg.className = 'hero-bg-layer ' + period;

        // 尝试加载背景图
        var bgExts = ['.webp', '.jpg', '.png'];
        var ocExts = ['.webp', '.png', '.jpg'];

        var bgLoaded = false;
        var ocLoaded = false;
        var ocNotAvailable = false;
        var loaderBar = $('loaderBar');

        // 暴露给 initHero 中的 checkLoaderDone 使用
        window._heroBgLoaded = false;
        window._heroOcReady = false;

        function updateLoader() {
            if (!loaderBar) return;
            var pct = 0;
            if (bgLoaded) { pct += 50; window._heroBgLoaded = true; }
            if (ocLoaded || ocNotAvailable) { pct += 40; window._heroOcReady = true; }
            loaderBar.style.width = Math.min(pct, 90) + '%';
        }

        function tryLoadBg(index) {
            if (index >= bgExts.length) { bgLoaded = true; updateLoader(); return; }
            var url = '/uploads/hero/' + period + bgExts[index];
            var img = new Image();
            img.onload = function () {
                heroBg.style.backgroundImage = 'url(' + url + ')';
                heroBg.classList.remove('morning', 'afternoon', 'night');
                bgLoaded = true;
                updateLoader();
            };
            img.onerror = function () { tryLoadBg(index + 1); };
            img.src = url;
        }

        function tryLoadOc(index) {
            if (index >= ocExts.length) { ocNotAvailable = true; heroOc.classList.add('hidden'); updateLoader(); return; }
            var url = '/uploads/hero/oc' + ocExts[index];
            var img = new Image();
            img.onload = function () {
                heroOc.style.backgroundImage = 'url(' + url + ')';
                ocLoaded = true;
                updateLoader();
            };
            img.onerror = function () { tryLoadOc(index + 1); };
            img.src = url;
        }

        tryLoadBg(0);
        tryLoadOc(0);
    }

    function switchHeroPeriod(period) {
        heroPeriod = period;
        localStorage.setItem('blog_theme', period);

        // 更新按钮 active 状态
        var buttons = document.querySelectorAll('.period-btn');
        buttons.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-period') === period);
        });

        applyHeroBg(getEffectivePeriod());
    }

    function initHero() {
        var heroBg = $('heroBgLayer');
        var heroOc = $('heroOcLayer');
        var heroOcWrap = $('heroOcWrapper');
        var heroFull = $('heroFullscreen');
        var scrollHint = $('heroScrollHint');
        if (!heroBg || !heroFull) return;

        applyHeroBg(getEffectivePeriod());

        // 定时检查图片是否加载完成，然后关闭开场动画
        var loadStart = Date.now();
        var minWait = 1000; // 最少 1s 展示动画
        var maxWait = 8000; // 最多等 8s 强制关闭

        function checkLoaderDone() {
            var loader = $('loaderScreen');
            var bar = $('loaderBar');
            if (!loader) return;

            // 背景图加载状态（由 applyHeroBg 中的闭包设置）
            var ready = window._heroBgLoaded && window._heroOcReady;
            var elapsed = Date.now() - loadStart;

            if ((ready && elapsed >= minWait) || elapsed >= maxWait) {
                // 进度条拉满
                if (bar) bar.style.width = '100%';
                setTimeout(function () {
                    loader.classList.add('hide');
                    setTimeout(function () {
                        if (loader.parentNode) loader.parentNode.removeChild(loader);
                    }, 700);
                }, 250);
            } else {
                setTimeout(checkLoaderDone, 150);
            }
        }

        checkLoaderDone();

        // 初始化按钮状态（恢复 localStorage 中的选择）
        var buttons = document.querySelectorAll('.period-btn');
        buttons.forEach(function (btn) {
            btn.classList.toggle('active', btn.getAttribute('data-period') === heroPeriod);
        });

        // 时间段切换按钮
        var toggle = $('heroPeriodToggle');
        if (toggle) {
            toggle.addEventListener('click', function (e) {
                var btn = e.target.closest('.period-btn');
                if (!btn) return;
                switchHeroPeriod(btn.getAttribute('data-period'));
            });
        }

        // 滚动时：视差背景 + 渐隐提示 + 渐隐 Hero
        var ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var scrollY = window.pageYOffset || document.documentElement.scrollTop;
                var vh = window.innerHeight;

                // 背景层从底部向上滑动（视差）
                if (heroBg) {
                    heroBg.style.transform = 'translateY(-' + (scrollY * 0.35) + 'px)';
                }
                // OC 图从底部向上滑动 + 浮动（移动包裹层）
                if (heroOcWrap) {
                    var floatY = Math.sin(Date.now() / 1200) * 8;
                    heroOcWrap.style.transform = 'translateY(-' + (scrollY * 0.2 + floatY) + 'px)';
                }

                // 滚动提示渐隐
                if (scrollHint) {
                    if (scrollY > vh * 0.15) {
                        scrollHint.classList.add('fade');
                    } else {
                        scrollHint.classList.remove('fade');
                    }
                }

                // Hero 整体渐隐（内容覆盖越多越透明）
                var opacity = Math.max(0, 1 - scrollY / (vh * 0.8));
                heroFull.style.opacity = opacity;

                ticking = false;
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ==================== OC 对话气泡 ==================== */
    var speechMessages = [
        '✨ 欢迎来到我的小世界喵！Ciallo～(∠・ω< )⌒☆',
        '📖 要来读读我写了些什么吗喵？虽然我还有好几篇博客没写完呢喵......',
        '🎸 电吉他好难喵，不过慢慢来，总能学会的喵！',
        '⚗️ 嘤嘤嘤~我不想写实验报告喵！',
        '🌸 粉色的樱花真好看喵~有人想和我去看吗喵？',
        '💻 我一个学化学的怎么学了这么多计算机喵？（并非）',
        '🌙 熬夜写博客中......明天怎么还要上课喵？',
        '🐱 好想养一只猫娘啊喵~',
        '🎮 有人和我一起打游戏吗喵？',
        '☕ 想喝奶茶，但我觉得我应该控糖了喵（再不控糖就太糖了）',
        '🎵 最近在听什么歌呀喵？',
        '💡 我又有好多想法，什么时候才能全部弄完呢喵？',
        '🔬 化学实验室也是化学味道浓郁喵（）',
        '📝 woc，论文还没读喵（既然你都看到这了，就别忘了叫本喵滚去读论文）',
        '🌍 世界很大，我想去看看喵',
        '🍰 甜食是程序员的能量来源喵（我要控糖喵！）',
        '🎨 画画和编程，都是创作呀喵！虽然我都不是很擅长，但我会努力的喵！',
        '🔥 不敬月亮敬自己！',
        '💕 感谢你来我的博客做客喵~',
        '🌐 写博客最大的动力，就是“万一能帮到谁呢”喵~',
    ];

    var speechTimer = null;
    var lastSpeechIndex = -1;
    var speechDebounce = 0;

    function randomSpeech() {
        var idx;
        do {
            idx = Math.floor(Math.random() * speechMessages.length);
        } while (idx === lastSpeechIndex && speechMessages.length > 1);
        lastSpeechIndex = idx;
        return speechMessages[idx];
    }

    function updateSpeechBubble() {
        var bubble = $('heroSpeechBubble');
        if (!bubble) return;

        var now = Date.now();
        if (now - speechDebounce < 500) return;
        speechDebounce = now;

        // 移除旧内容，触发重新创建
        bubble.innerHTML = '';

        // 重新创建 inner
        var inner = document.createElement('div');
        inner.className = 'bubble-inner';
        inner.textContent = randomSpeech();
        bubble.appendChild(inner);

        // 强制回流后播放动画
        bubble.classList.remove('show', 'pop');
        void bubble.offsetWidth;
        bubble.classList.add('show', 'pop');
    }

    function startSpeechTimer() {
        stopSpeechTimer();
        speechTimer = setInterval(updateSpeechBubble, 6000 + Math.random() * 4000);
    }

    function stopSpeechTimer() {
        if (speechTimer) { clearInterval(speechTimer); speechTimer = null; }
    }

    function initSpeechBubble() {
        var bubble = $('heroSpeechBubble');
        if (!bubble) return;

        // 初始显示
        updateSpeechBubble();
        startSpeechTimer();

        // 点击切换
        bubble.addEventListener('click', function () {
            updateSpeechBubble();
            startSpeechTimer(); // 重置计时器
        });
    }

    /* ==================== 滚动渐显动画 ==================== */
    function initScrollReveal() {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

        // 初始元素
        document.querySelectorAll('.blog-item, .gallery-item, .card, .hobby-badge, .about-section').forEach(function (el) {
            el.classList.add('reveal');
            observer.observe(el);
        });

        // 动态添加的元素也需要观察
        window._revealObserver = observer;
    }

    function observeNewElements() {
        var observer = window._revealObserver;
        if (!observer) return;
        document.querySelectorAll('.blog-item.reveal, .gallery-item.reveal').forEach(function (el) {
            if (el.dataset.revealed) return;
            el.dataset.revealed = '1';
            observer.observe(el);
        });
    }

    var origRenderGallery = renderGallery;
    renderGallery = function () {
        origRenderGallery();
        setTimeout(function () {
            var items = document.querySelectorAll('#galleryGrid .gallery-item');
            items.forEach(function (el, i) {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                    el.style.transitionDelay = (i * 0.04) + 's';
                }
            });
            observeNewElements();
        }, 50);
    };

    /* ==================== 回到顶部 ==================== */
    function initBackToTop() {
        var btn = $('backToTop');
        if (!btn) return;

        var ticking = false;
        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                btn.classList.toggle('show', window.pageYOffset > 400);
                ticking = false;
            });
        }, { passive: true });

        btn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ==================== 页面切换过渡 ==================== */
    function pageTransition(callback) {
        var overlay = $('pageTransition');
        if (!overlay) { callback(); return; }

        overlay.classList.add('active');
        setTimeout(function () {
            callback();
            setTimeout(function () {
                overlay.classList.remove('active');
            }, 100);
        }, 300);
    }

    // 拦截导航点击，加入过渡效果
    var origHandleRoute = handleRoute;
    handleRoute = function () {
        var route = parseHash();
        if (route.page === state.page) return; // 没变化不触发
        pageTransition(function () {
            origHandleRoute();
        });
    };

    /* ==================== 初始化 ==================== */
    function init() {
        initHero();
        initSpeechBubble();
        initScrollReveal();
        initBackToTop();
        bindEvents();
        applyBanner();
        updateSidebarAvatar();
        initMusicPlayer();

        fetchSettings().then(function () {
            return Promise.all([fetchPosts(), fetchGallery()]);
        }).then(function () {
            renderPosts();
            renderGallery();
            updateStats();
        }).catch(function () {});

        handleRoute();
    }

    init();
})();
