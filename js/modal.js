/* 全局模态提示框
   调用方式：showModal('你的消息')
   效果：全屏半透明遮罩 + 3s 倒计时 + 弹入动画
   3s 内不可跳过，3s 后可点击按钮或遮罩关闭
*/
(function () {
    'use strict';

    window.showModal = function (msg) {
        if (typeof msg !== 'string' || !msg.trim()) return;

        var old = document.getElementById('globalModal');
        if (old) old.remove();

        var overlay = document.createElement('div');
        overlay.id = 'globalModal';
        overlay.className = 'global-modal';

        // 用 textContent 防止 XSS
        var safe = document.createTextNode(msg).wholeText;

        overlay.innerHTML =
            '<div class="global-modal-card">' +
                '  <div class="dialogue-avatar"><img src="/uploads/gallery/1.jpg" alt="yuxiaoe" location="center"></div>' +
                '<div class="global-modal-msg">' + safe + '</div>' +
                '<button class="global-modal-btn" id="globalModalBtn">知道了(<span id="globalModalTimer">3</span>)</button>' +
            '</div>';
        document.body.appendChild(overlay);

        var btnEl = overlay.querySelector('#globalModalBtn');
        var countEl = overlay.querySelector('#globalModalTimer');
        var count = 3;

        btnEl.classList.add('countdown');
        var timer = setInterval(function () {
            count--;
            countEl.textContent = count;
            if (count <= 0) {
                clearInterval(timer);
                btnEl.classList.remove('countdown');
                btnEl.textContent = '知道了';
                overlay.classList.add('dismissable');
                overlay.addEventListener('click', function (e) {
                    if (e.target === overlay || e.target === btnEl) {
                        overlay.classList.remove('dismissable');
                        overlay.classList.add('hiding');
                        setTimeout(function () { overlay.remove(); }, 300);
                    }
                });
            }
        }, 1000);
    };
})();
