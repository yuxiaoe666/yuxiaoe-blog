(function () {
    'use strict';

    // 尊重「减少动态效果」偏好
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var particles = [];
    var container;

    function getThemeColors() {
        var styles = getComputedStyle(document.body);
        var variables = ['--pink-300', '--pink-400', '--pink-500', '--pink-600', '--pink-700'];
        return variables.map(function (name) {
            return styles.getPropertyValue(name).trim();
        }).filter(Boolean);
    }

    function createParticle(x, y) {
        var particle = document.createElement('div');
        particle.className = 'click-spark-particle';
        
        var angle = Math.random() * Math.PI * 2;
        var velocity = 2 + Math.random() * 5;
        var size = 4 + Math.random() * 6;
        var colors = getThemeColors();
        var color = colors[Math.floor(Math.random() * colors.length)] || 'var(--pink-500)';
        
        particle.style.left = (x - size / 2) + 'px';
        particle.style.top = (y - size / 2) + 'px';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.backgroundColor = color;
        particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        
        particle.dataset.vx = Math.cos(angle) * velocity;
        particle.dataset.vy = Math.sin(angle) * velocity;
        particle.dataset.life = 1;
        
        return particle;
    }

    function animate() {
        var i = particles.length;
        while (i--) {
            var p = particles[i];
            var life = parseFloat(p.dataset.life) - 0.025;
            
            if (life <= 0) {
                p.remove();
                particles.splice(i, 1);
                continue;
            }
            
            p.dataset.life = life;
            
            var x = parseFloat(p.style.left) + parseFloat(p.dataset.vx);
            var y = parseFloat(p.style.top) + parseFloat(p.dataset.vy);
            var vy = parseFloat(p.dataset.vy) + 0.15;
            
            p.dataset.vy = vy;
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.opacity = life;
            p.style.transform = 'scale(' + (0.3 + life * 0.7) + ') rotate(' + ((1 - life) * 360) + 'deg)';
        }
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        }
    }

    function onPageClick(e) {
        if (e.target.closest('.lightbox') || 
            e.target.closest('.toast') ||
            e.target.closest('.modal') ||
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        if (!container) {
            container = document.createElement('div');
            container.className = 'click-spark-container';
            document.body.appendChild(container);
        }
        
        var x = e.clientX;
        var y = e.clientY;
        
        if (particles.length > 120) return;  // 粒子数量上限，避免快速连点导致堆积卡顿

        var count = 8 + Math.floor(Math.random() * 6);
        for (var i = 0; i < count; i++) {
            var p = createParticle(x, y);
            container.appendChild(p);
            particles.push(p);
        }
        
        if (particles.length === count) {
            animate();
        }
    }

    document.addEventListener('click', onPageClick);

})();