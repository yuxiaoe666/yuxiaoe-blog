(function () {
    'use strict';

    var Blog = window.Blog;

    function updateStats() {
        var sb = Blog.$('statBlogs'), sp = Blog.$('statPhotos'), sc = Blog.$('statComments');
        if (sb) sb.textContent = Blog.state.posts.length;
        if (sp) sp.textContent = Blog.state.gallery.length;
        if (sc) {
            Blog.apiGet('/comments/count').then(function (data) {
                sc.textContent = data.count;
            }).catch(function () {
                sc.textContent = '0';
            });
        }
    }

    function load() {
        // 首页：加载文章和图库数据用于统计
        Promise.all([
            Blog.apiGet('/posts').then(function (data) {
                Blog.state.posts = data.posts || data;
                Blog.state.postMeta = {
                    page: data.page || 1, limit: data.limit || 10,
                    total: data.total || Blog.state.posts.length,
                    totalPages: data.totalPages || 1,
                    hasNext: data.hasNext || false,
                    hasPrev: data.hasPrev || false,
                };
            }).catch(function () { Blog.state.posts = []; }),
            Blog.apiGet('/upload/gallery').then(function (items) {
                Blog.state.gallery = items;
            }).catch(function () { Blog.state.gallery = []; })
        ]).then(function () {
            updateStats();
        }).catch(function () { updateStats(); });
    }

    Blog.pages.home = { load: load };
})();
