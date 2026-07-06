(function () {
    'use strict';

    var colors = [
        '#FF6B9D', '#FF9EC4', '#FFB7C5', '#FFC0CB', '#FFB6C1',
        '#FF7BAC', '#FF91A4', '#FF8BA7', '#FFB3C6', '#FFC8DD',
        '#E84A8D', '#FF69B4', '#FF1493', '#DB7093', '#FF7F50'
    ];

    var particles = [];
    var container;

    function createParticle(x, y) {
        var particle = document.createElement('div');
        particle.className = 'click-spark-particle';
        
        var angle = Math.random() * Math.PI * 2;
        var velocity = 2 + Math.random() * 5;
        var size = 4 + Math.random() * 6;
        var color = colors[Math.floor(Math.random() * colors.length)];
        
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