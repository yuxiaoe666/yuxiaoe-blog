(function () {
    'use strict';

    var canvas = document.getElementById('snowCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width, height, dpr;
    var flakes = [];
    var burstFlakes = [];
    var burstTimer = null;
    // 手机端减少雪花数量，降低 CPU 占用
    var FLAKE_COUNT = window.innerWidth < 640 ? 26 : 60;
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reducedMotion = motionQuery.matches;
    var running = false;
    var rafId = null;

    function resize() {
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

    function createFlake() {
        // depth：0 = 最远，1 = 最近；用它驱动大小、透明度、下落速度与虚实
        var depth = Math.random();
        var baseOpacity = randomRange(0.35, 0.9);
        var flake = {
            x: Math.random() * width,
            y: randomRange(-height, -10),
            depth: depth,
            // 近处的大而快，远处的小而慢
            size: randomRange(1.2, 3.6) * (0.45 + 0.55 * depth),
            speedY: randomRange(0.4, 1.6) * (0.6 + 0.85 * depth),
            // 横向摆动：sway 是像素振幅，用「位移」叠加而不是每帧累加速度，雪花才会飘
            sway: randomRange(6, 24) * (0.5 + 0.5 * depth),
            swaySpeed: randomRange(0.6, 1.6),
            // 每片雪花对风的响应不同，不会整整齐齐一起飘
            windFactor: randomRange(0.35, 1.15) * (0.4 + 0.6 * depth),
            opacity: Math.min(0.95, baseOpacity * (0.4 + 0.6 * depth)),
            phase: Math.random() * Math.PI * 2,
            // 只有一部分近处的雪花缓慢自转，远处的小点转了也看不出来
            spin: depth > 0.55 && Math.random() < 0.35 ? randomRange(-0.02, 0.02) : 0,
            rot: Math.random() * Math.PI * 2,
            // 远处的雪花加一层柔光，做出景深虚化
            soft: depth < 0.5,
            // 白色偏一点点冰蓝
            tint: Math.random() < 0.3 ? '235, 244, 255' : '255, 255, 255',
        };
        // 颜色和柔光参数只在创建时算一次，避免每帧重复拼接字符串
        flake.color = 'rgba(' + flake.tint + ', ' + flake.opacity + ')';
        flake.haloAlpha = flake.opacity * 0.28;
        flake.haloScale = 1.5 + (1 - depth) * 0.6;
        flake.drawX = flake.x;
        return flake;
    }

    function initFlakes() {
        flakes = [];
        for (var i = 0; i < FLAKE_COUNT; i++) {
            var flake = createFlake();
            flake.y = randomRange(-height, height);
            flake.drawX = flake.x;
            flakes.push(flake);
        }
    }

    // drawX 是叠加了摆动和风之后的屏幕横坐标，flake.x 只保存基准位置
    function drawFlake(flake) {
        var r = flake.size;
        var tilted = flake.spin !== 0;
        ctx.save();
        ctx.translate(flake.drawX, flake.y);
        if (tilted) {
            // 压扁一点再旋转，才看得出雪花在翻面
            ctx.rotate(flake.rot);
            ctx.scale(1, 0.72);
        }
        ctx.fillStyle = flake.color;
        if (flake.soft) {
            // 远处雪花：外圈柔光 + 实心核心
            ctx.globalAlpha = flake.haloAlpha;
            ctx.beginPath();
            ctx.arc(0, 0, r * flake.haloScale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = flake.opacity;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function updateFlake(flake, t, windOffset) {
        flake.y += flake.speedY;
        // 自身缓慢左右摆动 + 全场缓慢漂移的风；「减少动态效果」时不摆也不吹风
        flake.drawX = reducedMotion ? flake.x
            : flake.x + Math.sin(flake.phase + t * flake.swaySpeed) * flake.sway + windOffset * flake.windFactor;
        if (flake.spin !== 0) flake.rot += flake.spin;

        if (flake.y > height + 20) {
            flake.y = randomRange(-40, -10);
            flake.x = Math.random() * width;
            flake.drawX = flake.x;
        }
        if (flake.x < -40) flake.x = width + 40;
        if (flake.x > width + 40) flake.x = -40;
    }

    function draw() {
        if (!running) return;
        var t = performance.now() * 0.001;
        // 风向缓慢漂移：两个不同周期的正弦叠加，全场共用，每帧只算一次
        var windOffset = reducedMotion ? 0 : Math.sin(t * 0.21) * 30 + Math.sin(t * 0.07 + 1.3) * 18;
        ctx.clearRect(0, 0, width, height);
        for (var i = 0; i < flakes.length; i++) {
            updateFlake(flakes[i], t, windOffset);
            drawFlake(flakes[i]);
        }
        // 临时大雪：落出屏幕即移除
        for (var j = burstFlakes.length - 1; j >= 0; j--) {
            updateFlake(burstFlakes[j], t, windOffset);
            if (burstFlakes[j].y > height + 20) {
                burstFlakes.splice(j, 1);
                continue;
            }
            drawFlake(burstFlakes[j]);
        }
        rafId = requestAnimationFrame(draw);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true;
        canvas.style.display = 'block';
        resize();
        initFlakes();
        draw();
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
    }

    // 大雪：一次性补充大量快速雪花，持续约 10 秒后清空（冬季彩蛋）
    function burst(count, duration) {
        if (reducedMotion) return;
        count = count || 40;
        duration = duration || 10000;
        for (var i = 0; i < count; i++) {
            var f = createFlake();
            f.y = randomRange(-height * 0.3, -10);
            f.speedY = randomRange(1.8, 4.5);
            f.size = randomRange(1.5, 4.5);
            // 大雪的雪花都在近处，不需要柔光
            f.soft = false;
            f.drawX = f.x;
            burstFlakes.push(f);
        }
        clearTimeout(burstTimer);
        burstTimer = setTimeout(function () { burstFlakes = []; }, duration);
    }

    // 对外暴露给 hero.js：切到冬季时下雪，切走时停雪
    var Blog = window.Blog = window.Blog || {};
    Blog.snow = { start: start, stop: stop, burst: burst };

    window.addEventListener('resize', function () {
        if (running) resize();
    });
    resize();

    // 用户开启「减少动态效果」时不下雪（主题颜色仍会切换，只是不做动画）
    // 偏好被改变时同步跟随：开启则立刻停雪，关闭则按当前主题恢复
    function onMotionPreferenceChange(e) {
        reducedMotion = e.matches;
        if (reducedMotion) {
            stop();
            burstFlakes = [];
            clearTimeout(burstTimer);
        } else {
            try {
                if (localStorage.getItem('blog_theme') === 'winter' || localStorage.getItem('blog_weather') === 'snow') start();
            } catch (err) { /* ignore */ }
        }
    }
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionPreferenceChange);
    else if (motionQuery.addListener) motionQuery.addListener(onMotionPreferenceChange);

    if (reducedMotion) return;

    // 若之前保存的是冬季主题，页面加载即下雪
    try {
        if (localStorage.getItem('blog_theme') === 'winter' || localStorage.getItem('blog_weather') === 'snow') start();
    } catch (e) { /* ignore */ }
})();
