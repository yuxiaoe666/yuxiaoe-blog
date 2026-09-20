(function () {
    'use strict';

    var Blog = window.Blog;

    function renderArchives() {
        var container = Blog.$('archivesTimeline');
        if (!container) return;

        if (Blog.state.posts.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">📝 还没有文章</div>';
            return;
        }

        var grouped = {};
        Blog.state.posts.forEach(function (post) {
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
                    html += '<li><a href="/post/' + post.id + '" style="text-decoration:none;color:inherit;"><span class="post-day">' + day + '</span><span class="post-title">' + Blog.escapeHtml(post.title) + '</span></a></li>';
                });
                html += '</ul></div>';
            });
            html += '</div>';
        });

        container.innerHTML = html;
    }

    function load() {
        // 如果文章数据已加载，直接渲染
        if (Blog.state.posts.length > 0) {
            renderArchives();
            return;
        }
        // 否则先拉取
        Blog.apiGet('/posts').then(function (data) {
            Blog.state.posts = data.posts || data;
            renderArchives();
        }).catch(function () { Blog.state.posts = []; renderArchives(); });
    }

    Blog.pages.archives = { load: load };
})();
