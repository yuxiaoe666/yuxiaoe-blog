(function () {
    'use strict';

    var canvas = document.getElementById('dividerCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width, height;
    var separator = null;
    var decorLines = [];
    var particles = [];
    var PARTICLE_COUNT = 20;
    var time = 0;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = canvas.parentElement.clientHeight || 100;
        init();
    }

    function init() {
        separator = {
            offset: 0,
            amplitude: 12,
            frequency: 0.002,
            yBase: height * 0.45,
            hue: 342,
            alpha: 0.55,
            lineWidth: 2.6,
        };

        decorLines = [];
        var count = 3;
        for (var i = 0; i < count; i++) {
            decorLines.push({
                offset: i * 2.1 + Math.random() * 0.4,
                amplitude: 7 + i * 3,
                frequency: 0.003 + i * 0.0007,
                yBase: height * 0.42 + (i - 1) * height * 0.16,
                hue: 340 + i * 3,
                alpha: 0.18 + i * 0.05,
                lineWidth: 1.2 + i * 0.2,
            });
        }

        particles = [];
        for (var j = 0; j < PARTICLE_COUNT; j++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.15,
                radius: Math.random() * 1.5 + 0.6,
                alpha: Math.random() * 0.35 + 0.1,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);

        // 装饰线（先画，在主分割线之下）
        decorLines.forEach(function (line) {
            ctx.beginPath();
            ctx.lineWidth = line.lineWidth;
            ctx.strokeStyle = 'hsla(' + line.hue + ', 55%, 60%, ' + line.alpha + ')';
            ctx.lineCap = 'round';

            var first = true;
            for (var x = -20; x <= width + 20; x += 10) {
                var y = line.yBase +
                    Math.sin(x * line.frequency + time + line.offset) * line.amplitude +
                    Math.sin(x * 0.005 + time * 0.9) * 3;

                if (first) {
                    ctx.moveTo(x, y);
                    first = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        });

        // 主分割线（波浪遮罩：波线以上透明露出 banner，波线以下填充背景色）
        var wavePoints = [];
        for (var x = -20; x <= width + 20; x += 6) {
            var y = separator.yBase +
                Math.sin(x * separator.frequency + time + separator.offset) * separator.amplitude +
                Math.sin(x * 0.003 + time * 0.7) * 2.5;
            wavePoints.push([x, y]);
        }

        // 波线以下填充背景色（遮盖下方内容，露出 banner 被波浪切割的效果）
        ctx.beginPath();
        ctx.moveTo(wavePoints[0][0], wavePoints[0][1]);
        for (var i = 1; i < wavePoints.length; i++) {
            ctx.lineTo(wavePoints[i][0], wavePoints[i][1]);
        }
        ctx.lineTo(width + 20, height);
        ctx.lineTo(-20, height);
        ctx.closePath();
        ctx.fillStyle = '#ffe0f0';
        ctx.fill();

        // 在波线上描边
        ctx.beginPath();
        ctx.lineWidth = separator.lineWidth;
        ctx.strokeStyle = 'hsla(' + separator.hue + ', 70%, 62%, ' + separator.alpha + ')';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 130, 170, 0.3)';
        ctx.shadowBlur = 8;
        ctx.moveTo(wavePoints[0][0], wavePoints[0][1]);
        for (var i = 1; i < wavePoints.length; i++) {
            ctx.lineTo(wavePoints[i][0], wavePoints[i][1]);
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // 光点粒子
        particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;
            if (p.y < -10) p.y = height + 10;
            if (p.y > height + 10) p.y = -10;

            ctx.fillStyle = 'rgba(255, 155, 185, ' + p.alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        time += 0.012;
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
})();
