(function () {
    'use strict';

    // 一句话 / 心情池：可以随意增删，每句都会被随机展示
    var QUOTES = [
        '记录我那些不太起眼的日常',
        '今天也要做一只快乐的小鳄鱼呀',
        '世界很大，先从喜欢自己开始',
        '把日子过成自己喜欢的样子',
        '愿你的每一帧日常都闪着光',
        '在平凡里打捞闪闪发亮的碎片',
        '生活明朗，万物可爱',
        '正在努力做一个温柔又清醒的人',
        '偶尔摆烂，常常热爱',
        '山高路远，看世界也找自己',
        '保持好奇，保持可爱',
    ];

    function pick(list) {
        return list[Math.floor(Math.random() * list.length)];
    }

    // 读取已保存的心情：主页与文章页共用同一句，保证跳转衔接一致
    var saved = null;
    try { saved = localStorage.getItem('blog_quote'); } catch (e) { /* ignore */ }
    var current = saved || pick(QUOTES);
    try { localStorage.setItem('blog_quote', current); } catch (e) { /* ignore */ }

    function setQuote(text) {
        current = text;
        try { localStorage.setItem('blog_quote', current); } catch (e) { /* ignore */ }
    }

    function typeQuote(element, text) {
        if (!element) return;
        element.classList.remove('is-typing');
        element.textContent = '';
        element.classList.add('is-typing');
        var i = 0;
        function next() {
            if (i >= text.length) {
                element.classList.remove('is-typing');
                return;
            }
            element.textContent += text.charAt(i++);
            setTimeout(next, 45);
        }
        next();
    }

    function renderQuote() {
        if (subtitle) typeQuote(subtitle, current);
        if (quoteEl) quoteEl.textContent = '「' + current + '」';
    }

    // 1. hero 副标题：在 hero.js 打字机启动前替换，打字机会逐字打出这句心情
    var subtitle = document.querySelector('.hero-subtitle-text');
    if (subtitle) {
        subtitle.textContent = current;
    }

    // 2. 侧边栏底部「一句话心情」，点击换一句
    var quoteEl = document.getElementById('sidebarQuote');
    if (quoteEl) {
        quoteEl.textContent = '「' + current + '」';
        quoteEl.title = '点击换一句';
        quoteEl.addEventListener('click', function () {
            var next;
            do {
                next = pick(QUOTES);
            } while (next === current && QUOTES.length > 1);
            setQuote(next);
            renderQuote();
            // 重新触发弹跳动画
            quoteEl.classList.remove('quote-pop');
            void quoteEl.offsetWidth;
            quoteEl.classList.add('quote-pop');
        });
    }

    if (subtitle) {
        subtitle.addEventListener('click', function () {
            var next;
            do { next = pick(QUOTES); } while (next === current && QUOTES.length > 1);
            setQuote(next);
            renderQuote();
        });
    }

})();
