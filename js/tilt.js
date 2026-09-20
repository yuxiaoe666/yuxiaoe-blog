/* 卡片 3D 倾斜：鼠标悬停时跟随指针轻微旋转，仅在支持悬停的设备上启用 */
(function () {
    'use strict';

    if (!window.matchMedia('(hover: hover)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var SELECTOR = '.blog-item, .gallery-item, .stat-card';
    var MAX_TILT = 6; // 最大倾斜角度（度）
    var ticking = false;
    var current = null;

    function applyTilt(el, e) {
        var rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width;
        var py = (e.clientY - rect.top) / rect.height;
        var rx = (0.5 - py) * MAX_TILT * 2;
        var ry = (px - 0.5) * MAX_TILT * 2;
        el.classList.add('tilt-target');
        el.style.transform = 'perspective(700px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-2px)';
    }

    function resetTilt(el) {
        el.style.transform = '';
    }

    document.addEventListener('pointermove', function (e) {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            var target = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;
            if (target) {
                current = target;
                applyTilt(target, e);
            } else if (current) {
                resetTilt(current);
                current = null;
            }
            ticking = false;
        });
    }, { passive: true });

    document.addEventListener('pointerout', function (e) {
        if (current && !current.contains(e.relatedTarget)) {
            resetTilt(current);
            current = null;
        }
    });
})();
