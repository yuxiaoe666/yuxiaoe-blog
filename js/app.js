(function () {
    'use strict';

    /* ==================== 全局命名空间 ==================== */
    var Blog = window.Blog = window.Blog || {};
    Blog.modules = Blog.modules || {};
    Blog.pages = Blog.pages || {};

    /* ==================== DOM 工具 ==================== */
    Blog.$ = function (id) { return document.getElementById(id); };
    Blog.$$ = function (sel) { return document.querySelectorAll(sel); };

    /* ==================== HTML 转义 ==================== */
    Blog.escapeHtml = function (str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    /* ==================== Toast ==================== */
    var toastTimer;
    Blog.showToast = function (msg) {
        var toast = Blog.$('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
    };

    /* ==================== API 助手 ==================== */
    var API_BASE = '/api';
    Blog.apiGet = function (url) {
        return fetch(API_BASE + url).then(function (res) {
            if (!res.ok) throw new Error('请求失败');
            return res.json();
        });
    };

    Blog.apiPost = function (url, data) {
        return fetch(API_BASE + url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(function (res) {
            if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || '请求失败'); });
            return res.json();
        });
    };

    /* ==================== 全局状态 ==================== */
    Blog.state = {
        page: 'home',
        posts: [],
        postMeta: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
        gallery: [],
        settings: {},
        filter: { search: '', tags: [], year: null }
    };

    /* ==================== 设置 ==================== */
    Blog.fetchSettings = function () {
        return Blog.apiGet('/upload/settings').then(function (s) {
            Blog.state.settings = s || {};
            Blog.updateSidebarAvatar();
            return s;
        }).catch(function () {
            Blog.updateSidebarAvatar();
        });
    };

    Blog.updateSidebarAvatar = function () {
        var url = Blog.state.settings.avatar || '';
        var container = Blog.$('sidebarAvatar');
        if (container) {
            if (url) {
                container.innerHTML = '<img src="' + url + '" alt="头像" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--pink-300);padding:2px;background:linear-gradient(135deg,var(--pink-200),var(--pink-400));">';
            } else {
                container.innerHTML = '<div class="avatar-placeholder">🌸</div>';
            }
        }
        var navAvatar = Blog.$('heroNavAvatar');
        if (navAvatar) {
            if (url) {
                navAvatar.innerHTML = '<img src="' + url + '" alt="头像" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--glass-50);">';
            } else {
                navAvatar.innerHTML = '<div class="avatar-placeholder">🌸</div>';
            }
        }
    };

    /* ==================== 动态脚本加载 ==================== */
    Blog._loadedScripts = Blog._loadedScripts || {};
    Blog._scriptPromises = Blog._scriptPromises || {};
    Blog.loadScript = function (src) {
        if (Blog._scriptPromises[src]) return Blog._scriptPromises[src];
        var pending = new Promise(function (resolve, reject) {
            if (Blog._loadedScripts[src]) { resolve(); return; }
            var script = document.createElement('script');
            script.src = src;
            script.onload = function () {
                Blog._loadedScripts[src] = true;
                resolve();
            };
            script.onerror = function () {
                delete Blog._scriptPromises[src];
                reject(new Error('脚本加载失败: ' + src));
            };
            document.head.appendChild(script);
        });
        Blog._scriptPromises[src] = pending;
        return pending;
    };

    /* ==================== 路由 ==================== */
    Blog.parseHash = function () {
        var hash = window.location.hash.replace('#', '') || '/home';
        var parts = hash.split('/').filter(Boolean);
        return { page: parts[0] || 'home' };
    };

    Blog.navigate = function (page) {
        window.location.hash = '/' + page;
    };

    /* ==================== 页面过渡 ==================== */
    Blog.pageTransition = function (callback) {
        var overlay = Blog.$('pageTransition');
        if (!overlay) { callback(); return; }
        overlay.classList.add('active');
        setTimeout(function () {
            callback();
            setTimeout(function () {
                overlay.classList.remove('active');
            }, 100);
        }, 300);
    };

    /* ==================== \u4e3b\u9898\u88c5\u9970\uff08favicon / \u6a2a\u5e45\u6807\u8bb0\uff09 ==================== */
    Blog.syncThemeDecor = function () {
        var snow = document.body.classList.contains('snow-mode') || document.body.classList.contains('winter-mode');
        var emoji = snow ? '\u2744\ufe0f' : '\ud83c\udf38';
        var icon = document.querySelector('link[rel="icon"]');
        if (icon) {
            icon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>" + emoji + "</text></svg>";
        }
        var mark = Blog.$('bannerTitleMark');
        if (mark) mark.textContent = emoji;
    };

    function watchThemeDecor() {
        Blog.syncThemeDecor();
        if (typeof MutationObserver !== 'function') return;
        var last = document.body.className;
        new MutationObserver(function () {
            if (document.body.className === last) return;
            last = document.body.className;
            Blog.syncThemeDecor();
        }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    /* ==================== 视图过渡（View Transitions API） ==================== */
    Blog.prefersReducedMotion = function () {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    };

    Blog.withViewTransition = function (update) {
        if (typeof document.startViewTransition === 'function' && !Blog.prefersReducedMotion()) {
            try {
                document.startViewTransition(update);
                return;
            } catch (e) { /* fall through to plain update */ }
        }
        update();
    };

    /* ==================== 路由处理（按需加载） ==================== */
    var routeChanging = false;

    Blog.handleRoute = function () {
        if (routeChanging) return;
        var route = Blog.parseHash();
        var newPage = route.page;
        var oldPage = Blog.state.page;

        // 离开文章页时清空搜索框
        if (oldPage === 'posts' && newPage !== 'posts') {
            var searchInput = Blog.$('postSearchInput');
            if (searchInput) searchInput.value = '';
        }

        Blog.withViewTransition(function () {
            // 更新导航激活状态
            Blog.$$('.nav-item').forEach(function (n) { n.classList.remove('active'); });
            Blog.$$('.nav-item[data-page="' + newPage + '"]').forEach(function (n) {
                n.classList.add('active');
            });

            // 切换面板
            Blog.$$('.content-panel').forEach(function (p) { p.classList.remove('active-panel'); });
            var panelId = 'panel-' + newPage;
            var panel = Blog.$(panelId);
            if (!panel) panel = Blog.$('panel-home');
            panel.classList.add('active-panel');
            panel.style.animation = 'none';
            panel.offsetHeight;
            panel.style.animation = '';

            // 回到顶部
            var mainContent = Blog.$('mainContent');
            if (mainContent) mainContent.scrollTop = 0;
        });

        Blog.state.page = newPage;

        // 按需加载页面模块
        loadPageModule(newPage);
    };

    function loadPageModule(page) {
        var moduleMap = {
            'home': 'js/home.js',
            'posts': 'js/posts.js',
            'archives': 'js/archives.js',
            'gallery': 'js/gallery.js',
            'music': 'js/music.js',
            'contact': 'js/message-board.js'
        };

        var src = moduleMap[page];
        if (!src) return;

        // 加载并执行
        Blog.loadScript(src).then(function () {
            if (Blog.pages[page] && Blog.pages[page].load) {
                Blog.pages[page].load();
            }
        }).catch(function (err) {
            console.error('页面模块加载失败:', page, err);
        });
    }

    /* ==================== 核心事件绑定 ==================== */
    function bindCoreEvents() {
        // 导航点击
        Blog.$$('.nav-item').forEach(function (item) {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                var page = this.getAttribute('data-page');
                if (!page) return;
                Blog.pageTransition(function () { Blog.navigate(page); });
            });
        });

        // Hero 按钮
        Blog.$$('.hero-actions .btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var t = this.getAttribute('data-goto');
                if (t) Blog.pageTransition(function () { Blog.navigate(t); });
            });
        });

        // 哈希变化
        window.addEventListener('hashchange', Blog.handleRoute);

        // 文章链接拦截（过渡动画）
        document.addEventListener('click', function (e) {
            var link = e.target.closest('a[href^="/post/"]');
            if (!link) return;
            var href = link.getAttribute('href');
            if (!href || href === '#') return;
            if (link.hostname && link.hostname !== location.hostname) return;
            if (link.target === '_blank') return;
            e.preventDefault();
            var overlay = Blog.$('pageTransition');
            if (overlay) overlay.classList.add('active');
            setTimeout(function () { location.href = href; }, 300);
        });
    }

    /* ==================== 初始化 ==================== */
    function init() {
        bindCoreEvents();
        Blog.updateSidebarAvatar();
        watchThemeDecor();

        // 先加载设置，然后按需加载 Hero + Scroll（延迟，不阻塞首屏）
        Blog.fetchSettings().then(function () {
            // 加载 Hero 和滚动效果（可视区域相关，延时加载）
            setTimeout(function () {
                Blog.loadScript('js/hero.js').then(function () {
                    if (Blog.modules.hero) Blog.modules.hero.init();
                }).catch(function () {});
            }, 100);

            setTimeout(function () {
                Blog.loadScript('js/scroll.js').then(function () {
                    if (Blog.modules.scroll) Blog.modules.scroll.init();
                }).catch(function () {});
            }, 200);
        }).catch(function () {});

        // 首页模块直接加载
        Blog.loadScript('js/home.js').catch(function () {});
        Blog.handleRoute();
    }

    init();
})();
