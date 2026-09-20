(function () {
    'use strict';

    var Blog = window.Blog;

    function fetchPosts(page) {
        var params = page ? '?page=' + page : '';
        return Blog.apiGet('/posts' + params).then(function (data) {
            Blog.state.posts = data.posts || data;
            Blog.state.postMeta = {
                page: data.page || 1, limit: data.limit || 10,
                total: data.total || Blog.state.posts.length,
                totalPages: data.totalPages || 1,
                hasNext: data.hasNext || false,
                hasPrev: data.hasPrev || false,
            };
            return Blog.state.posts;
        }).catch(function () {
            Blog.state.posts = [];
            Blog.state.postMeta = { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
            return [];
        });
    }

    function buildFilterBar() {
        var tagSet = {};
        var yearSet = {};
        Blog.state.posts.forEach(function (post) {
            var tags = Array.isArray(post.tags) ? post.tags : [];
            tags.forEach(function (t) { if (t) tagSet[t] = (tagSet[t] || 0) + 1; });
            var y = new Date(post.date).getFullYear();
            if (y) yearSet[y] = true;
        });

        var bar = Blog.$('postFilterBar');
        if (!bar) return;

        var tags = Object.keys(tagSet).sort(function (a, b) { return tagSet[b] - tagSet[a]; });
        var years = Object.keys(yearSet).sort().reverse();
        var hasFilters = tags.length > 0 || years.length > 1;

        bar.style.display = hasFilters ? 'flex' : 'none';
        if (!hasFilters) return;

        var tagsHtml = tags.map(function (t) {
            var isActive = Blog.state.filter.tags.indexOf(t) !== -1;
            return '<span class="filter-tag' + (isActive ? ' active' : '') + '" data-tag="' + Blog.escapeHtml(t) + '">' + Blog.escapeHtml(t) + '<sup> ' + tagSet[t] + '</sup></span>';
        }).join('');
        Blog.$('filterTags').innerHTML = tagsHtml || '<span style="color:var(--text-muted);font-size:12px;">暂无标签</span>';

        var yearsHtml = '<span class="filter-tag' + (Blog.state.filter.year === null ? ' active' : '') + '" data-year="">全部</span>';
        yearsHtml += years.map(function (y) {
            return '<span class="filter-tag' + (Blog.state.filter.year === Number(y) ? ' active' : '') + '" data-year="' + y + '">' + y + '</span>';
        }).join('');
        Blog.$('filterYears').innerHTML = yearsHtml;

        var hasActive = Blog.state.filter.tags.length > 0 || Blog.state.filter.year !== null;
        Blog.$('filterClear').style.display = hasActive ? 'inline-block' : 'none';

        Blog.$('filterTags').onclick = function (e) {
            var el = e.target.closest('.filter-tag');
            if (!el) return;
            var tag = el.getAttribute('data-tag');
            var idx = Blog.state.filter.tags.indexOf(tag);
            if (idx === -1) Blog.state.filter.tags.push(tag);
            else Blog.state.filter.tags.splice(idx, 1);
            applyFilterAndRender();
        };

        Blog.$('filterYears').onclick = function (e) {
            var el = e.target.closest('.filter-tag');
            if (!el) return;
            var y = el.getAttribute('data-year');
            Blog.state.filter.year = y === '' ? null : Number(y);
            applyFilterAndRender();
        };

        Blog.$('filterClear').onclick = function () {
            Blog.state.filter.tags = [];
            Blog.state.filter.year = null;
            Blog.$('postSearchInput').value = '';
            Blog.state.filter.search = '';
            applyFilterAndRender();
        };
    }

    function applyFilterAndRender() {
        renderPosts();
        buildFilterBar();
    }

    function renderPosts() {
        var list = Blog.$('blogList');
        var empty = Blog.$('blogEmpty');
        var countEl = Blog.$('postSearchCount');
        if (!list) return;
        if (Blog.state.posts.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (countEl) countEl.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';

        var f = Blog.state.filter;
        var filtered = Blog.state.posts;

        if (f.search && f.search.trim()) {
            var q = f.search.trim().toLowerCase();
            filtered = filtered.filter(function (post) {
                if (post.title.toLowerCase().indexOf(q) !== -1) return true;
                var tags = Array.isArray(post.tags) ? post.tags : [];
                return tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; });
            });
        }
        if (f.tags.length > 0) {
            filtered = filtered.filter(function (post) {
                var tags = Array.isArray(post.tags) ? post.tags : [];
                return f.tags.every(function (ft) { return tags.indexOf(ft) !== -1; });
            });
        }
        if (f.year !== null) {
            filtered = filtered.filter(function (post) {
                return new Date(post.date).getFullYear() === f.year;
            });
        }

        var hasAnyFilter = (f.search && f.search.trim()) || f.tags.length > 0 || f.year !== null;
        if (countEl) {
            if (hasAnyFilter && filtered.length !== Blog.state.posts.length) {
                countEl.textContent = '找到 ' + filtered.length + ' / ' + Blog.state.posts.length + ' 篇';
                countEl.style.display = 'inline';
            } else {
                countEl.style.display = 'none';
            }
        }

        if (filtered.length === 0) {
            list.innerHTML = '<div class="card" style="text-align:center;color:var(--text-muted);padding:28px;">🔍 没有找到匹配的文章</div>';
            return;
        }

        var html = '';
        filtered.forEach(function (post) {
            var d = new Date(post.date);
            var cc = post.commentCount || 0;
            var tags = Array.isArray(post.tags) ? post.tags : [];
            var tagsHtml = tags.map(function (t) { return '<span class="blog-tag">#' + Blog.escapeHtml(t) + '</span>'; }).join('');

            html += '<a href="/post/' + post.id + '" class="blog-item" style="text-decoration:none;color:inherit;">' +
                '<div class="blog-date"><div class="day">' + d.getDate() + '</div><div class="month">' + (d.getMonth() + 1) + '月</div></div>' +
                '<div class="blog-info">' +
                '<h3>' + Blog.escapeHtml(post.title) + '</h3>' +
                '<div class="blog-tags">' + tagsHtml + '</div>' +
                '<div style="font-size:11px;color:var(--text-muted);margin-top:4px;">💬 ' + cc + ' 条评论 · 📅 ' + d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日</div>' +
                '</div></a>';
        });
        list.innerHTML = html;

        setTimeout(function () {
            var items = document.querySelectorAll('#blogList .blog-item');
            items.forEach(function (el, i) {
                if (!el.classList.contains('reveal')) {
                    el.classList.add('reveal');
                    el.style.transitionDelay = (i * 0.06) + 's';
                }
            });
            if (Blog.modules.scroll && Blog.modules.scroll.observeNewElements) {
                Blog.modules.scroll.observeNewElements();
            }
        }, 50);

        renderPagination();
    }

    function renderPagination() {
        var container = Blog.$('postPagination');
        if (!container) return;

        var meta = Blog.state.postMeta;
        if (meta.totalPages <= 1) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        var html = '';

        if (meta.hasPrev) html += '<button class="pagination-btn" data-page="' + (meta.page - 1) + '">←</button>';
        else html += '<span class="pagination-btn disabled">←</span>';

        for (var i = 1; i <= meta.totalPages; i++) {
            if (i === meta.page) html += '<span class="pagination-btn active">' + i + '</span>';
            else html += '<button class="pagination-btn" data-page="' + i + '">' + i + '</button>';
        }

        if (meta.hasNext) html += '<button class="pagination-btn" data-page="' + (meta.page + 1) + '">→</button>';
        else html += '<span class="pagination-btn disabled">→</span>';

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

    var searchBound = false;
    function bindSearch() {
        if (searchBound) return;
        searchBound = true;
        var searchTimer = null;
        var searchInput = Blog.$('postSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                Blog.state.filter.search = this.value;
                if (searchTimer) clearTimeout(searchTimer);
                searchTimer = setTimeout(function () { applyFilterAndRender(); }, 300);
            });
        }
    }

    function load() {
        bindSearch();
        fetchPosts().then(function () {
            renderPosts();
            buildFilterBar();
        });
    }

    Blog.pages.posts = { load: load, render: renderPosts, fetch: fetchPosts };
})();
