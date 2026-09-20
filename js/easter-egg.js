/* 彩蛋合集：点击 Ciallo 下樱花雨 + 生日彩蛋（4/23） */
(function () {
    'use strict';

    var Blog = window.Blog = window.Blog || {};

    /* ==================== 天气效果分发器 ==================== */
    // 雪花主题 → 下雪；樱花主题 → 樱花雨。仅供 Ciallo 彩蛋触发临时天气效果
    Blog.weather = {
        rain: function () {
            var snow = document.body.classList.contains('snow-mode') || document.body.classList.contains('winter-mode');
            if (snow) {
                if (Blog.snow && typeof Blog.snow.burst === 'function') {
                    Blog.snow.burst(50, 10000);
                    return true;
                }
                return false;
            }
            if (Blog.sakura && typeof Blog.sakura.rain === 'function') {
                Blog.sakura.rain(60, 10000);
                return true;
            }
            return false;
        }
    };

    /* ==================== 点击 Ciallo：下雪 / 樱花雨 ==================== */
    function bindCialloSakuraRain() {
        var deco = document.getElementById('heroCialloDeco');
        if (!deco) return;

        var cooling = false;
        deco.addEventListener('click', function () {
            if (cooling) return;
            cooling = true;
            setTimeout(function () { cooling = false; }, 600);

            var winter = document.body.classList.contains('snow-mode') || document.body.classList.contains('winter-mode');
            var rained = Blog.weather.rain();
            if (Blog.showToast) {
                if (winter) {
                    Blog.showToast(rained ? '❄️ 下雪啦喵！Ciallo～' : '❄️ Ciallo～(∠・ω< )⌒☆');
                } else {
                    Blog.showToast(rained ? '🌸 樱花雨来啦喵！Ciallo～' : '🌸 Ciallo～(∠・ω< )⌒☆');
                }
            }
        });
    }

    /* ==================== 生日彩蛋：4/23 ==================== */
    function isBirthday() {
        try {
            if (new URLSearchParams(window.location.search).get('birthday') === 'test') return true;
        } catch (e) { /* 忽略旧浏览器的解析异常 */ }
        var d = new Date();
        return d.getMonth() === 3 && d.getDate() === 23; // 4 月 = 下标 3
    }

    function showBirthdayBanner() {
        var banner = document.createElement('div');
        banner.className = 'birthday-banner';
        banner.innerHTML =
            '<span class="birthday-emoji">🎂</span>' +
            '<span>今天是鱼小鳄的生日，生日快乐喵！</span>' +
            '<button class="birthday-close" aria-label="关闭">×</button>';
        document.body.appendChild(banner);

        banner.querySelector('.birthday-close').addEventListener('click', function () {
            banner.classList.add('birthday-banner-hide');
            setTimeout(function () {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 300);
        });
    }

    function birthdayRain() {
        var emojis = ['🎂', '🎉', '🎈', '🍰', '✨', '🌸'];
        for (var i = 0; i < 26; i++) {
            var el = document.createElement('div');
            el.className = 'birthday-fall';
            el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            el.style.left = (Math.random() * 100) + 'vw';
            el.style.fontSize = (16 + Math.random() * 22) + 'px';
            el.style.animationDuration = (3 + Math.random() * 4) + 's';
            el.style.animationDelay = (Math.random() * 3) + 's';
            document.body.appendChild(el);
            (function (node) {
                node.addEventListener('animationend', function () {
                    if (node.parentNode) node.parentNode.removeChild(node);
                });
            })(el);
        }
    }

    bindCialloSakuraRain();

    if (isBirthday()) {
        showBirthdayBanner();
        birthdayRain();
        if (Blog.showToast) {
            setTimeout(function () { Blog.showToast('🎂 生日快乐喵！'); }, 1200);
        }
    }
})();
