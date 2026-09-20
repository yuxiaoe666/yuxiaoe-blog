(function () {
    'use strict';

    var Blog = window.Blog;

    /* ==================== 数据 ==================== */
    function fetchGallery() {
        return Blog.apiGet('/upload/gallery').then(function (items) {
            Blog.state.gallery = items;
            return items;
        }).catch(function () { return []; });
    }

    function renderGallery() {
        var grid = Blog.$('galleryGrid');
        if (!grid) return;
        if (Blog.state.gallery.length === 0) {
            grid.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">🌸 相册还没有内容</div>';
            return;
        }
        var html = '';
        Blog.state.gallery.forEach(function (item) {
            var isVideo = item.type === 'video';
            html += '<div class="gallery-item" data-lightbox-url="' + item.url + '" data-lightbox-type="' + (item.type || 'image') + '">' +
                (isVideo
                    ? '<video src="' + item.url + '" preload="metadata"></video><span class="video-icon">▶</span>'
                    : '<img src="' + item.url + '" alt="照片" loading="lazy">') +
                '</div>';
        });
        grid.innerHTML = html;

        // 触发渐显
        setTimeout(function () {
            var items = document.querySelectorAll('#galleryGrid .gallery-item');
            items.forEach(function (el, i) {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                    el.style.transitionDelay = (i * 0.04) + 's';
                }
            });
            if (Blog.modules.scroll && Blog.modules.scroll.observeNewElements) {
                Blog.modules.scroll.observeNewElements();
            }
        }, 50);
    }

    /* ==================== \u706f\u7bb1 ==================== */
    var lightboxIndex = -1;

    function mediaList() {
        return (Blog.state.gallery || []).filter(function (item) {
            return item && item.url;
        });
    }

    function preloadNeighbours(list) {
        if (list.length < 2) return;
        [lightboxIndex + 1, lightboxIndex - 1].forEach(function (i) {
            var item = list[(i + list.length) % list.length];
            if (!item || item.type === 'video') return;
            var img = new Image();
            img.src = item.url;
        });
    }

    function updateLightboxChrome(total) {
        var counter = Blog.$('lightboxCounter');
        if (counter) counter.textContent = total > 1 ? (lightboxIndex + 1) + ' / ' + total : '';
        var showNav = total > 1;
        ['lightboxPrev', 'lightboxNext'].forEach(function (id) {
            var btn = Blog.$(id);
            if (btn) btn.style.display = showNav ? '' : 'none';
        });
    }

    function showSlide(index) {
        var list = mediaList();
        if (!list.length) return;
        lightboxIndex = ((index % list.length) + list.length) % list.length;
        var item = list[lightboxIndex];
        var container = Blog.$('lightboxMedia');
        if (!container) return;
        container.innerHTML = '';
        if (item.type === 'video') {
            var v = document.createElement('video');
            v.src = item.url;
            v.controls = true;
            v.autoplay = true;
            v.style.cssText = 'max-width:88vw;max-height:88vh;border-radius:14px;';
            v.onclick = function (e) { e.stopPropagation(); };
            container.appendChild(v);
        } else {
            var img = document.createElement('img');
            img.src = item.url;
            img.alt = '\u9884\u89c8';
            container.appendChild(img);
            preloadNeighbours(list);
        }
        updateLightboxChrome(list.length);
    }

    function stepSlide(delta) {
        if (lightboxIndex < 0) return;
        showSlide(lightboxIndex + delta);
    }

    function openLightbox(index) {
        var box = Blog.$('lightbox');
        if (!box) return;
        document.body.classList.add('lightbox-open');
        box.classList.add('show');
        showSlide(index);
    }

    function closeLightbox() {
        var box = Blog.$('lightbox');
        if (!box) return;
        box.classList.remove('show');
        document.body.classList.remove('lightbox-open');
        var container = Blog.$('lightboxMedia');
        if (container) container.innerHTML = '';
        lightboxIndex = -1;
    }

    /* ==================== 事件绑定 ==================== */
    var eventsBound = false;
    function bindGalleryEvents() {
        if (eventsBound) return;
        eventsBound = true;

        var box = Blog.$('lightbox');
        if (!box) return;

        var closeBtn = Blog.$('lightboxClose');
        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

        var prevBtn = Blog.$('lightboxPrev');
        if (prevBtn) prevBtn.addEventListener('click', function () { stepSlide(-1); });

        var nextBtn = Blog.$('lightboxNext');
        if (nextBtn) nextBtn.addEventListener('click', function () { stepSlide(1); });

        box.addEventListener('click', function (e) {
            if (e.target === this) closeLightbox();
        });

        document.addEventListener('click', function (e) {
            var item = e.target && e.target.closest ? e.target.closest('.gallery-item') : null;
            if (!item) return;
            var url = item.getAttribute('data-lightbox-url');
            if (!url) return;
            var list = mediaList();
            var index = 0;
            for (var i = 0; i < list.length; i++) {
                if (list[i].url === url) { index = i; break; }
            }
            openLightbox(index);
        });

        document.addEventListener('keydown', function (e) {
            if (lightboxIndex < 0) return;
            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowLeft') stepSlide(-1);
            else if (e.key === 'ArrowRight') stepSlide(1);
        });

        /* \u89e6\u5c4f\u5de6\u53f3\u6ed1\u52a8\u7ffb\u9875 */
        var startX = 0;
        var startY = 0;
        var tracking = false;
        box.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            tracking = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        box.addEventListener('touchend', function (e) {
            if (!tracking || !e.changedTouches.length) return;
            tracking = false;
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                stepSlide(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    /* ==================== 加载 ==================== */
    function load() {
        bindGalleryEvents();
        if (Blog.state.gallery.length > 0) {
            renderGallery();
            return;
        }
        fetchGallery().then(function () { renderGallery(); });
    }

    Blog.pages.gallery = { load: load };
})();
