(function () {
    'use strict';

    // ★ 上线日期：请改成你博客真正上线的日子（格式 YYYY-MM-DD）
    var LAUNCH_DATE = '2026-05-23';

    // 1. 本站已运行 N 天
    var days = 0;
    var launch = new Date(LAUNCH_DATE + 'T00:00:00');
    days = Math.max(0, Math.floor((Date.now() - launch.getTime()) / 86400000));
    var daysEls = document.querySelectorAll('#siteDays, #heroSiteDays');
    if (daysEls.length) {
        daysEls.forEach(function (el) {
            if (el.id === 'heroSiteDays') el.textContent = days;
            else el.textContent = '🌱 已陪伴 ' + days + ' 天';
        });
    }

    // 2. 访客计数（同一设备每天只计一次）
    var visitorsEls = document.querySelectorAll('#siteVisitors, #heroSiteVisitors');
    if (!visitorsEls.length) return;

    var VISIT_DATE_KEY = 'blog_visitor_date';

    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function renderCount(n, animate) {
        var target = parseInt(n, 10) || 0;
        if (!animate) {
            visitorsEls.forEach(function (el) {
                el.textContent = el.id === 'heroSiteVisitors' ? target : '👀 第 ' + target + ' 位访客';
            });
            return;
        }
        // 数字滚动动画
        var from = 0;
        var duration = 900;
        var startTime = performance.now();
        function step(now) {
            var t = Math.min(1, (now - startTime) / duration);
            var eased = 1 - Math.pow(1 - t, 3);
            var val = Math.round(from + (target - from) * eased);
            visitorsEls.forEach(function (el) {
                el.textContent = el.id === 'heroSiteVisitors' ? val : '👀 第 ' + val + ' 位访客';
            });
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // 先读取当前计数
    fetch('/api/visitor')
        .then(function (r) { return r.json(); })
        .then(function (data) { renderCount(data.count, false); })
        .catch(function () {
            visitorsEls.forEach(function (el) {
                el.textContent = el.id === 'heroSiteVisitors' ? '?' : '👀 第 ? 位访客';
            });
        });

    // 当天首次访问才 +1
    try {
        var today = todayStr();
        if (localStorage.getItem(VISIT_DATE_KEY) !== today) {
            localStorage.setItem(VISIT_DATE_KEY, today);
            fetch('/api/visitor', { method: 'POST' })
                .then(function (r) { return r.json(); })
                .then(function (data) { renderCount(data.count, true); })
                .catch(function () { /* ignore */ });
        }
    } catch (e) { /* ignore */ }
})();
