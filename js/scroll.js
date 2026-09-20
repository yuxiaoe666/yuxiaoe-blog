(function () {
    'use strict';

    var Blog = window.Blog;
    var revealObserver = null;

    /* ==================== 滚动渐显 ==================== */
    function initScrollReveal() {
        revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -30px 0px' });

        document.querySelectorAll('.blog-item, .gallery-item, .card, .hobby-badge, .about-section').forEach(function (el) {
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    }

    function observeNewElements() {
        if (!revealObserver) return;
        document.querySelectorAll('.blog-item.reveal, .gallery-item.reveal').forEach(function (el) {
            if (el.dataset.revealed) return;
            el.dataset.revealed = '1';
            revealObserver.observe(el);
        });
    }

    /* ==================== 回到顶部 ==================== */
    function initBackToTop() {
        var btn = Blog.$('backToTop');
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

    /* ==================== 初始化 ==================== */
    function init() {
        initScrollReveal();
        initBackToTop();
    }

    /* ==================== 注册模块 ==================== */
    Blog.modules.scroll = { init: init, observeNewElements: observeNewElements };
})();
