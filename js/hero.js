(function () {
    'use strict';

    var Blog = window.Blog;

    /* ==================== Hero 状态 ==================== */
    function readThemeState() {
        var savedWeather = localStorage.getItem('blog_weather');
        var savedPeriod = localStorage.getItem('blog_period');
        var legacy = localStorage.getItem('blog_theme');

        if (!savedWeather) {
            savedWeather = legacy === 'winter' ? 'snow' : 'sakura';
        }
        if (!savedPeriod) {
            savedPeriod = legacy === 'night' || legacy === 'morning' || legacy === 'afternoon' ? legacy : 'auto';
        }
        return {
            weather: savedWeather === 'snow' ? 'snow' : 'sakura',
            period: ['morning', 'afternoon', 'night'].indexOf(savedPeriod) >= 0 ? savedPeriod : 'auto'
        };
    }

    var themeState = readThemeState();
    var speechTimer = null;
    var lastSpeechIndex = -1;
    var speechDebounce = 0;
    var floatAnimId = null;

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
        '🌐 写博客最大的动力，就是"万一能帮到谁呢"喵~',
    ];

    /* ==================== 时间段 ==================== */
    function getTimePeriod() {
        var hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        return 'night';
    }

    function getEffectiveTheme() {
        var period = themeState.period === 'auto' ? getTimePeriod() : themeState.period;
        return {
            weather: themeState.weather,
            light: period === 'night' ? 'dark' : 'light',
            period: period
        };
    }

    /* ==================== 背景 ==================== */
    function applyHeroBg(theme) {
        var heroBg = Blog.$('heroBgLayer');
        var heroOc = Blog.$('heroOcLayer');
        var heroFull = Blog.$('heroFullscreen');
        if (!heroBg || !heroFull) return;

        var weather = theme.weather;
        var light = theme.light;
        var imageKey = weather + '-' + theme.period;

        if (light === 'dark') {
            heroFull.classList.add('night');
            document.body.classList.add('dark-mode');
        } else {
            heroFull.classList.remove('night');
            document.body.classList.remove('dark-mode');
        }
        if (weather === 'snow') {
            document.body.classList.add('snow-mode', 'winter-mode');
        } else {
            document.body.classList.remove('snow-mode', 'winter-mode');
        }

        if (weather === 'snow') {
            if (Blog.snow) Blog.snow.start();
            if (Blog.sakura) Blog.sakura.stop();
        } else {
            if (Blog.snow) Blog.snow.stop();
            if (Blog.sakura) Blog.sakura.start();
        }

        heroBg.className = 'hero-bg-layer ' + imageKey;

        var bgExts = ['.webp', '.jpg', '.png'];
        var ocExts = ['.webp', '.png', '.jpg'];
        var bgLoaded = false;
        var ocLoaded = false;
        var ocNotAvailable = false;
        var loaderBar = Blog.$('loaderBar');

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
            var url = '/uploads/hero/' + imageKey + bgExts[index];
            var img = new Image();
            img.onload = function () {
                heroBg.style.backgroundImage = 'url(' + url + ')';
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

    function setThemeState(partial) {
        if (partial.weather) themeState.weather = partial.weather;
        if (partial.period) themeState.period = partial.period;

        localStorage.setItem('blog_weather', themeState.weather);
        localStorage.setItem('blog_period', themeState.period);
        // 兼容旧脚本和旧页面：保留一个可读的旧值
        localStorage.setItem('blog_theme', themeState.period === 'auto' ? (themeState.weather === 'snow' ? 'winter' : 'auto') : themeState.period);

        var effective = getEffectiveTheme();
        document.querySelectorAll('.period-btn').forEach(function (btn) {
            var period = btn.getAttribute('data-period');
            var active = period === 'auto'
                ? themeState.period === 'auto'
                : (period === 'snow' || period === 'sakura')
                    ? themeState.weather === period
                    : themeState.period === period;
            btn.classList.toggle('active', active);
        });
        applyHeroBg(effective);
    }

    function switchHeroPeriod(period) {
        if (period === 'auto') {
            setThemeState({ period: 'auto' });
        } else if (period === 'snow' || period === 'sakura') {
            setThemeState({ weather: period });
            return;
        } else {
            setThemeState({ period: period });
            return;
        }
    }

    /* ==================== OC 对话气泡 ==================== */
    function randomSpeech() {
        var idx;
        do {
            idx = Math.floor(Math.random() * speechMessages.length);
        } while (idx === lastSpeechIndex && speechMessages.length > 1);
        lastSpeechIndex = idx;
        return speechMessages[idx];
    }

    function updateSpeechBubble() {
        var bubble = Blog.$('heroSpeechBubble');
        if (!bubble) return;

        var now = Date.now();
        if (now - speechDebounce < 500) return;
        speechDebounce = now;

        bubble.innerHTML = '';
        var inner = document.createElement('div');
        inner.className = 'bubble-inner';
        inner.textContent = randomSpeech();
        bubble.appendChild(inner);

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
        var bubble = Blog.$('heroSpeechBubble');
        if (!bubble) return;
        updateSpeechBubble();
        startSpeechTimer();
        bubble.addEventListener('click', function () {
            updateSpeechBubble();
            startSpeechTimer();
        });
    }

    /* ==================== 滚动视差 ==================== */
    function initScrollParallax() {
        var heroOcWrap = Blog.$('heroOcWrapper');
        var heroFull = Blog.$('heroFullscreen');
        var scrollHint = Blog.$('heroScrollHint');
        var ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
                var scrollY = window.pageYOffset || document.documentElement.scrollTop;
                var vh = window.innerHeight;

                // 背景层的 transform 由 paintHeroTransforms 统一合成（滚动 + 鼠标视差）
                heroMotion.scrollY = scrollY;
                heroMotion.floatY = Math.sin(Date.now() / 1200) * 8;
                paintHeroTransforms();
                if (heroOcWrap) {
                    heroOcWrap.style.transform = 'translateY(-' + (scrollY * 0.2 + heroMotion.floatY) + 'px)';
                }
                if (scrollHint) {
                    if (scrollY > vh * 0.15) scrollHint.classList.add('fade');
                    else scrollHint.classList.remove('fade');
                }
                if (heroFull) {
                    heroFull.style.opacity = Math.max(0, 1 - scrollY / (vh * 0.8));
                }
                ticking = false;
            });
        }

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ==================== 加载动画 ==================== */
    function checkLoaderDone() {
        var loader = Blog.$('loaderScreen');
        var bar = Blog.$('loaderBar');
        if (!loader) return;

        var loadStart = Date.now();
        var minWait = 1000;
        var maxWait = 8000;

        function check() {
            var ready = window._heroBgLoaded && window._heroOcReady;
            var elapsed = Date.now() - loadStart;

            if ((ready && elapsed >= minWait) || elapsed >= maxWait) {
                if (bar) bar.style.width = '100%';
                initTyping();
                setTimeout(function () {
                    loader.classList.add('hide');
                    setTimeout(function () {
                        if (loader.parentNode) loader.parentNode.removeChild(loader);
                    }, 700);
                }, 250);
            } else {
                setTimeout(check, 150);
            }
        }
        check();
    }

    /* ==================== 副标题打字机 ==================== */
    var typedOnce = false;

    function initTyping() {
        if (typedOnce) return;
        var el = document.querySelector('.hero-subtitle-text');
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        typedOnce = true;
        var text = el.textContent.trim();
        el.textContent = '';

        var cursor = document.createElement('span');
        cursor.className = 'hero-subtitle-cursor';
        cursor.textContent = '▍';
        el.appendChild(cursor);

        var i = 0;
        function type() {
            if (i < text.length) {
                cursor.before(document.createTextNode(text.charAt(i)));
                i++;
                setTimeout(type, 80 + Math.random() * 80);
            }
        }
        type();
    }

    /* ==================== 鼠标视差 ==================== */
    // 背景层还要承担滚动视差，两处 transform 会互相覆盖，
    // 所以统一由 paintHeroTransforms 合成；OC 视差放在内层 heroOcLayer 上，互不干扰
    var heroMotion = {
        bgEl: null,
        ocEl: null,
        scrollY: 0,
        floatY: 0, // 滚动时 OC 容器的上下漂浮偏移
        bgX: 0, bgY: 0,
        ocX: 0, ocY: 0,
        targetBgX: 0, targetBgY: 0,
        targetOcX: 0, targetOcY: 0,
        rafId: null,
        active: false
    };
    // 背景最多 ±6px，OC 最多 ±10px，方向相反，形成前后景深
    var BG_PARALLAX_MAX = 6;
    var OC_PARALLAX_MAX = 10;
    var PARALLAX_EASE = 0.12;

    function paintHeroTransforms() {
        var state = heroMotion;
        var bgEl = state.bgEl || (state.bgEl = Blog.$('heroBgLayer'));
        var ocEl = state.ocEl || (state.ocEl = Blog.$('heroOcLayer'));
        if (bgEl) {
            bgEl.style.transform = 'translate3d(' + state.bgX.toFixed(2) + 'px, ' +
                (-state.scrollY * 0.35 + state.bgY).toFixed(2) + 'px, 0)';
        }
        if (ocEl) {
            ocEl.style.transform = 'translate3d(' + state.ocX.toFixed(2) + 'px, ' + state.ocY.toFixed(2) + 'px, 0)';
        }
    }

    // 减少动态效果 / 无 hover 设备（触屏） / 窄屏 都关掉
    function heroParallaxAllowed() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        if (window.matchMedia('(hover: none)').matches) return false;
        if (window.innerWidth <= 768) return false;
        return true;
    }

    function stepHeroParallax() {
        var state = heroMotion;
        state.rafId = null;
        state.bgX += (state.targetBgX - state.bgX) * PARALLAX_EASE;
        state.bgY += (state.targetBgY - state.bgY) * PARALLAX_EASE;
        state.ocX += (state.targetOcX - state.ocX) * PARALLAX_EASE;
        state.ocY += (state.targetOcY - state.ocY) * PARALLAX_EASE;
        paintHeroTransforms();
        // 差值足够小就停下，指针不动时不再跑 rAF
        if (Math.abs(state.targetBgX - state.bgX) > 0.05 || Math.abs(state.targetBgY - state.bgY) > 0.05 ||
            Math.abs(state.targetOcX - state.ocX) > 0.05 || Math.abs(state.targetOcY - state.ocY) > 0.05) {
            state.rafId = requestAnimationFrame(stepHeroParallax);
        }
    }

    function requestHeroParallax() {
        if (heroMotion.rafId === null) heroMotion.rafId = requestAnimationFrame(stepHeroParallax);
    }

    function initHeroParallax() {
        var heroFull = Blog.$('heroFullscreen');
        var heroOc = Blog.$('heroOcLayer');
        if (!heroFull || !heroOc) return;

        heroMotion.bgEl = Blog.$('heroBgLayer');
        heroMotion.ocEl = heroOc;

        function onMove(e) {
            if (!heroMotion.active) return;
            var rect = heroFull.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            var nx = (e.clientX - rect.left) / rect.width * 2 - 1;
            var ny = (e.clientY - rect.top) / rect.height * 2 - 1;
            nx = Math.max(-1, Math.min(1, nx));
            ny = Math.max(-1, Math.min(1, ny));
            heroMotion.targetBgX = nx * BG_PARALLAX_MAX;
            heroMotion.targetBgY = ny * BG_PARALLAX_MAX;
            // 与背景反向移动，才有层次感
            heroMotion.targetOcX = -nx * OC_PARALLAX_MAX;
            heroMotion.targetOcY = -ny * OC_PARALLAX_MAX;
            requestHeroParallax();
        }

        function resetTargets() {
            heroMotion.targetBgX = 0;
            heroMotion.targetBgY = 0;
            heroMotion.targetOcX = 0;
            heroMotion.targetOcY = 0;
        }

        function refresh() {
            heroMotion.active = heroParallaxAllowed();
            if (!heroMotion.active) {
                // 关掉时立即归零，不要留下偏移
                resetTargets();
                heroMotion.bgX = 0;
                heroMotion.bgY = 0;
                heroMotion.ocX = 0;
                heroMotion.ocY = 0;
                paintHeroTransforms();
            }
        }

        heroFull.addEventListener('mousemove', onMove, { passive: true });
        heroFull.addEventListener('mouseleave', function () {
            resetTargets();
            requestHeroParallax();
        });
        window.addEventListener('resize', refresh);
        window.addEventListener('orientationchange', refresh);
        var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        var hoverQuery = window.matchMedia('(hover: none)');
        if (reduceQuery.addEventListener) {
            reduceQuery.addEventListener('change', refresh);
            hoverQuery.addEventListener('change', refresh);
        } else if (reduceQuery.addListener) {
            reduceQuery.addListener(refresh);
            hoverQuery.addListener(refresh);
        }
        refresh();
    }

    /* ==================== 初始化 ==================== */
    function init() {
        var heroBg = Blog.$('heroBgLayer');
        var heroFull = Blog.$('heroFullscreen');
        if (!heroBg || !heroFull) return;

        applyHeroBg(getEffectiveTheme());
        initScrollParallax();
        initHeroParallax();
        initSpeechBubble();
        checkLoaderDone();

        // 初始化按钮状态
        setThemeState({});

        // 时间段切换
        var toggle = Blog.$('heroPeriodToggle');
        if (toggle) {
            toggle.addEventListener('click', function (e) {
                var btn = e.target.closest('.period-btn');
                if (!btn) return;
                switchHeroPeriod(btn.getAttribute('data-period'));
            });
        }
    }

    /* ==================== 注册模块 ==================== */
    Blog.modules.hero = { init: init, applyBg: applyHeroBg, switchPeriod: switchHeroPeriod };
})();
