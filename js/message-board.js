(function () {
    'use strict';

    var pageList = document.getElementById('messageBoardList');
    var contactCount = document.getElementById('contactCount');
    var contactLatest = document.getElementById('contactLatest');
    var pageForm = document.getElementById('messageBoardForm');
    var form = pageForm;

    /* 防刷屏：同一浏览器每 60 秒只能留言一次 */
    var COOLDOWN_MS = 60000;
    var COOLDOWN_KEY = 'blog.lastMessageAt';
    var cooldownTimer = null;

    function escapeHtml(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char];
        });
    }

    function formatDate(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '';
        return (date.getMonth() + 1) + '/' + date.getDate();
    }

    function formatRecent(value) {
        var date = new Date(value);
        if (isNaN(date.getTime())) return '刚刚';
        var diffMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
        if (diffMinutes < 5) return '刚刚';
        if (diffMinutes < 60) return diffMinutes + '分前';
        var diffHours = Math.round(diffMinutes / 60);
        if (diffHours < 24) return diffHours + '小时前';
        var diffDays = Math.round(diffHours / 24);
        if (diffDays < 30) return diffDays + '天前';
        return (date.getMonth() + 1) + '/' + date.getDate();
    }

    function renderPage(messages) {
        if (!pageList) return;
        if (!messages || !messages.length) {
            pageList.innerHTML = '<div class="message-board-item"><p>还没有留言，先作一个小小的纪念吧。</p></div>';
            return;
        }
        pageList.innerHTML = messages.map(function (item) {
            return '<article class="message-board-item">' +
                '<div class="message-board-item-header">' +
                '<strong>' + escapeHtml(item.name) + '</strong>' +
                '<time>' + formatDate(item.created_at) + '</time>' +
                '</div>' +
                '<p>' + escapeHtml(item.message) + '</p>' +
                '</article>';
        }).join('');
    }

    function updateStats(payload) {
        if (!payload) return;
        var messages = payload.items || [];
        if (contactCount) {
            contactCount.textContent = String(payload.total || messages.length || 0);
        }
        if (contactLatest) {
            var newest = messages[0] || null;
            contactLatest.textContent = newest ? formatRecent(newest.created_at) : '暂无';
        }
    }

    function cooldownLeft() {
        try {
            var last = Number(window.localStorage.getItem(COOLDOWN_KEY) || 0);
            var left = COOLDOWN_MS - (Date.now() - last);
            return left > 0 ? left : 0;
        } catch (e) {
            return 0;
        }
    }

    function markPosted() {
        try { window.localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch (e) { }
    }

    function submitButton() {
        return form ? form.querySelector('button[type="submit"]') : null;
    }

    function startCooldown() {
        var button = submitButton();
        if (!button) return;
        if (!button.dataset.label) button.dataset.label = button.textContent;
        var label = button.dataset.label;
        clearInterval(cooldownTimer);
        function tick() {
            var remain = cooldownLeft();
            if (remain <= 0) {
                clearInterval(cooldownTimer);
                button.disabled = false;
                button.textContent = label;
                return;
            }
            button.disabled = true;
            button.textContent = '冷却中 ' + Math.ceil(remain / 1000) + 's';
        }
        tick();
        if (cooldownLeft() > 0) cooldownTimer = setInterval(tick, 500);
    }

    function load() {
        fetch('/api/contacts/public?limit=20')
            .then(function (response) {
                if (!response.ok) throw new Error('留言加载失败');
                return response.json();
            })
            .then(function (payload) {
                var messages = Array.isArray(payload) ? payload :
                    (payload && Array.isArray(payload.items) ? payload.items : []);
                renderPage(messages);
                updateStats(Array.isArray(payload) ? {
                    total: messages.length,
                    items: messages
                } : (payload || { total: messages.length, items: messages }));
            })
            .catch(function () {
                if (pageList) {
                    pageList.innerHTML = '<div class="message-board-item"><p>留言暂时躲起来了，稍后再来看看吧～</p></div>';
                }
                if (contactCount) contactCount.textContent = '0';
                if (contactLatest) contactLatest.textContent = '暂无';
            });
    }

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();
            var left = cooldownLeft();
            if (left > 0) {
                if (window.Blog && window.Blog.showToast) {
                    window.Blog.showToast('留言太快啦，还需等 ' + Math.ceil(left / 1000) + ' 秒');
                }
                startCooldown();
                return;
            }

            var name = document.getElementById('messageBoardName');
            var message = document.getElementById('messageBoardText');
            if (!name || !message || !name.value.trim() || !message.value.trim()) return;

            var button = form.querySelector('button[type="submit"]');
            if (button) button.disabled = true;
            fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.value.trim(),
                    message: message.value.trim()
                })
            })
                .then(function (response) {
                    if (!response.ok) {
                        return response.json().then(function (data) {
                            throw new Error(data.error || '留言发送失败');
                        });
                    }
                    name.value = '';
                    message.value = '';
                    markPosted();
                    if (window.Blog && window.Blog.showToast) window.Blog.showToast('💬 留言已留下');
                    load();
                })
                .catch(function (error) {
                    if (window.Blog && window.Blog.showToast) window.Blog.showToast(error.message || '留言发送失败');
                })
                .then(function () {
                    if (cooldownLeft() > 0) {
                        startCooldown();
                    } else if (button) {
                        button.disabled = false;
                    }
                });
        });
    }

    if (window.Blog) {
        window.Blog.pages = window.Blog.pages || {};
        window.Blog.pages.contact = { load: load };
        startCooldown();
    } else {
        load();
    }
})();
