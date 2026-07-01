(function () {
    'use strict';

    var canvas = document.getElementById('sakuraCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var width, height;
    var petals = [];
    var PETAL_COUNT = 45;
    var mouseX = -1000;
    var mouseY = -1000;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    function randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    function createPetal() {
        return {
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
        var color =
            'hsla(' +
            petal.hue +
            ', ' +
            petal.saturation +
            '%, ' +
            petal.lightness +
            '%, ' +
            petal.opacity +
            ')';

        ctx.fillStyle = color;
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

    function updatePetal(petal) {
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
            petal.y = randomRange(-60, -10);
            petal.x = Math.random() * width;
            petal.rotation = Math.random() * Math.PI * 2;
        }
        if (petal.x < -60) petal.x = width + 60;
        if (petal.x > width + 60) petal.x = -60;
    }

    function draw() {
        ctx.clearRect(0, 0, width, height);
        for (var i = 0; i < petals.length; i++) {
            updatePetal(petals[i]);
            drawPetal(petals[i]);
        }
        requestAnimationFrame(draw);
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

    window.addEventListener('resize', resize);
    resize();
    initPetals();
    draw();
})();
