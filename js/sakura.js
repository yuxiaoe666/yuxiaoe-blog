(function () {
    'use strict';

    var canvas = document.getElementById('sakuraCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width, height, dpr;
    var petals = [];
    var burstPetals = [];
    var burstTimer = null;
    // 手机端减少花瓣数量，降低 CPU 占用
    var PETAL_COUNT = window.innerWidth < 640 ? 18 : 45;
    var mouseX = -1000;
    var mouseY = -1000;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var running = false;
    var rafId = null;

    function resize() {
        // 按设备像素比放大画布，高分屏（尤其手机）花瓣不再发虚
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createPetal() {
        var petal = {
            x: Math.random() * width,
            y: randomRange(-height * 0.5, -10),
            size: randomRange(10, 22),
            speedY: randomRange(0.6, 2.0),
            speedX: randomRange(-0.4, 0.4),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: randomRange(-0.03, 0.03),
            wobble: randomRange(0.3, 1.0),
            wobbleSpeed: randomRange(0.01, 0.03),
            opacity: randomRange(0.45, 0.85),
            hue: randomRange(340, 355),
            saturation: randomRange(60, 90),
            lightness: randomRange(65, 85),
            phase: Math.random() * Math.PI * 2,
        };
        // 颜色只在创建时算一次，避免每帧重复拼接 hsla 字符串
        petal.color = 'hsla(' + petal.hue + ', ' + petal.saturation + '%, ' + petal.lightness + '%, ' + petal.opacity + ')';
        return petal;
    }

    function initPetals() {
        petals = [];
        for (var i = 0; i < PETAL_COUNT; i++) {
            var petal = createPetal();
            petal.y = randomRange(-height, height);
            petals.push(petal);
        }
    }

    function drawPetal(petal) {
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.rotation);
        ctx.globalAlpha = petal.opacity;

        var s = petal.size;
        ctx.fillStyle = petal.color;
        ctx.beginPath();

        // 五瓣樱花形状
        var petals_count = 5;
        for (var i = 0; i < petals_count; i++) {
            var angle = (i / petals_count) * Math.PI * 2 - Math.PI / 2;
            var px = Math.cos(angle) * s * 0.35;
            var py = Math.sin(angle) * s * 0.35;

            var cp1x = Math.cos(angle) * s * 0.6;
            var cp1y = Math.sin(angle) * s * 0.6;
            var cp2x = Math.cos(angle + 0.35) * s * 0.45;
            var cp2y = Math.sin(angle + 0.35) * s * 0.45;
            var endX = Math.cos(angle + Math.PI / petals_count) * s * 0.35;
            var endY = Math.sin(angle + Math.PI / petals_count) * s * 0.35;

            if (i === 0) {
                ctx.moveTo(px, py);
            }
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        }
        ctx.closePath();
        ctx.fill();

        // 花蕊
        ctx.fillStyle = 'rgba(255, 230, 180, ' + (petal.opacity * 0.7) + ')';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function updatePetal(petal, recycle) {
        petal.y += petal.speedY;
        petal.x += petal.speedX + Math.sin(petal.phase + performance.now() * 0.001 * petal.wobbleSpeed) * petal.wobble;
        petal.rotation += petal.rotationSpeed;
        petal.phase += 0.02;

        // 鼠标吸引效果
        var dx = mouseX - petal.x;
        var dy = mouseY - petal.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
            var force = (1 - dist / 180) * 0.5;
            petal.x += dx * force * 0.02;
            petal.y += dy * force * 0.02;
        }

        if (petal.y > height + 50) {
            // 临时樱花雨不循环，落出屏幕后由调用方移除
            if (recycle === false) return false;
            petal.y = randomRange(-60, -10);
            petal.x = Math.random() * width;
            petal.rotation = Math.random() * Math.PI * 2;
        }
        if (petal.x < -60) petal.x = width + 60;
        if (petal.x > width + 60) petal.x = -60;
        return true;
    }

    function draw() {
        if (!running) return;
        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < petals.length; i++) {
            updatePetal(petals[i]);
            drawPetal(petals[i]);
        }

        // 临时樱花雨：落出屏幕即移除
        for (var j = burstPetals.length - 1; j >= 0; j--) {
            if (updatePetal(burstPetals[j], false) === false) {
                burstPetals.splice(j, 1);
                continue;
            }
            drawPetal(burstPetals[j]);
        }

        rafId = requestAnimationFrame(draw);
    }

    document.addEventListener('mousemove', function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    document.addEventListener('mouseleave', function () {
        mouseX = -1000;
        mouseY = -1000;
    });

    // 触屏支持
    document.addEventListener('touchmove', function (e) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
    });

    document.addEventListener('touchend', function () {
        mouseX = -1000;
        mouseY = -1000;
    });

    // 樱花雨：一次性补充大量高速花瓣，持续约 10 秒后清空，供彩蛋触发
    function sakuraRain(count, duration) {
        if (!ctx || reducedMotion) return;
        count = count || 40;
        duration = duration || 10000;
        for (var i = 0; i < count; i++) {
            var p = createPetal();
            p.y = randomRange(-height * 0.3, -10);
            p.speedY = randomRange(2.2, 5.2);
            p.speedX = randomRange(-1.2, 1.2);
            p.size = randomRange(13, 25);
            burstPetals.push(p);
        }
        clearTimeout(burstTimer);
        burstTimer = setTimeout(function () { burstPetals = []; }, duration);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true;
        canvas.style.display = 'block';
        resize();
        if (!petals.length) initPetals();
        draw();
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
    }

    // 对外暴露给彩蛋脚本（点击 Ciallo）与 hero.js
    var Blog = window.Blog = window.Blog || {};
    Blog.sakura = { rain: sakuraRain, start: start, stop: stop };

    window.addEventListener('resize', function () {
        if (running) resize();
    });
    resize();
    initPetals();

    // 用户开启「减少动态效果」时，只绘制一帧静态樱花，不启动动画循环
    if (reducedMotion) {
        for (var i = 0; i < petals.length; i++) drawPetal(petals[i]);
        return;
    }

    // 冬季主题下不启动樱花（由雪花接管）
    try {
        if (localStorage.getItem('blog_theme') === 'winter' || localStorage.getItem('blog_weather') === 'snow') return;
    } catch (e) { /* ignore */ }

    start();
})();
