(function () {
    'use strict';

    var Blog = window.Blog;

    /* ==================== 状态 ==================== */
    var musicState = {
        list: [],
        currentIndex: -1,
        isPlaying: false,
        mode: 'loop',
        lyricsLines: [],
        currentLyricIndex: -1,
    };

    var playerInited = false;

    /* ==================== 数据 ==================== */
    function fetchMusic() {
        return Blog.apiGet('/music').then(function (items) {
            musicState.list = items;
            return items;
        }).catch(function () { return []; });
    }

    function renderMusicList() {
        var listEl = Blog.$('musicList');
        if (!listEl) return;
        if (musicState.list.length === 0) {
            listEl.innerHTML = '<div style="color:var(--text-muted);padding:12px;text-align:center;">🎵 还没有音乐，等待上传</div>';
            return;
        }
        var html = '';
        musicState.list.forEach(function (item, index) {
            var cls = 'music-item';
            if (musicState.currentIndex === index) cls += ' active';
            if (musicState.currentIndex === index && musicState.isPlaying) cls += ' music-item-playing';
            html += '<div class="' + cls + '" data-index="' + index + '">' +
                '<div class="music-item-num">' + (index + 1) + '</div>' +
                '<div class="music-item-body">' +
                '<div class="music-item-title">' + Blog.escapeHtml(item.title) + '</div>' +
                '<div class="music-item-artist">' + Blog.escapeHtml(item.artist) + '</div>' +
                '</div></div>';
        });
        listEl.innerHTML = html;
    }

    /* ==================== 播放器 ==================== */
    function formatTime(seconds) {
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updatePlayerUI(item) {
        Blog.$('musicTitle').textContent = item.title;
        Blog.$('musicArtist').textContent = item.artist;
        Blog.$('musicCurrentTime').textContent = '00:00';
        Blog.$('musicDuration').textContent = '--:--';
        Blog.$('musicProgressFill').style.width = '0%';
        updatePlayBtn();
    }

    function updatePlayBtn() {
        var btn = Blog.$('musicPlay');
        if (musicState.isPlaying) { btn.textContent = '⏸'; btn.classList.add('playing'); }
        else { btn.textContent = '▶'; btn.classList.remove('playing'); }
    }

    function syncLyrics(currentTime) {
        var lines = musicState.lyricsLines;
        if (lines.length === 0) return;
        var activeIdx = -1;
        for (var i = lines.length - 1; i >= 0; i--) {
            if (currentTime >= lines[i].time) { activeIdx = i; break; }
        }
        if (activeIdx === musicState.currentLyricIndex) return;
        musicState.currentLyricIndex = activeIdx;
        var allLines = document.querySelectorAll('.lyric-line');
        allLines.forEach(function (l, i) { l.classList.toggle('active', i === activeIdx); });
        if (activeIdx >= 0) {
            var target = allLines[activeIdx];
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function renderLyrics(lines) {
        var el = Blog.$('musicLyrics');
        if (!el) return;
        if (lines.length === 0) {
            el.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px 0;">🎵 暂无歌词</p>';
            return;
        }
        var html = '';
        lines.forEach(function (line, i) {
            html += '<p class="lyric-line" data-lyric-index="' + i + '">' + Blog.escapeHtml(line.text) + '</p>';
        });
        el.innerHTML = html;
    }

    function loadLyrics(item) {
        var lyricsEl = Blog.$('musicLyrics');
        if (!lyricsEl) return;
        if (!item.lyrics || !item.lyrics.trim()) {
            lyricsEl.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px 0;">🎶 纯音乐，暂无歌词</p>';
            musicState.lyricsLines = [];
            return;
        }
        var raw = item.lyrics;
        var lines = [];
        var regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
        var match;
        while ((match = regex.exec(raw)) !== null) {
            var min = parseInt(match[1]);
            var sec = parseInt(match[2]);
            var ms = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3]);
            var time = min * 60 + sec + ms / 1000;
            var text = match[4].trim();
            if (text) lines.push({ time: time, text: text });
        }
        lines.sort(function (a, b) { return a.time - b.time; });
        musicState.lyricsLines = lines;
        musicState.currentLyricIndex = -1;
        renderLyrics(lines);
    }

    function playByIndex(index) {
        if (index < 0 || index >= musicState.list.length) return;
        musicState.currentIndex = index;
        var audio = Blog.$('audioPlayer');
        var item = musicState.list[index];
        audio.src = item.url;
        audio.load();
        audio.play().catch(function () {});
        musicState.isPlaying = true;
        updatePlayerUI(item);
        renderMusicList();
        loadLyrics(item);
    }

    function togglePlay() {
        var audio = Blog.$('audioPlayer');
        if (musicState.currentIndex === -1 && musicState.list.length > 0) { playByIndex(0); return; }
        if (musicState.currentIndex === -1) return;
        if (audio.paused) { audio.play().catch(function () {}); musicState.isPlaying = true; }
        else { audio.pause(); musicState.isPlaying = false; }
        updatePlayBtn();
        renderMusicList();
    }

    function playNext() {
        if (musicState.list.length === 0) return;
        var next;
        if (musicState.mode === 'shuffle') next = Math.floor(Math.random() * musicState.list.length);
        else next = (musicState.currentIndex + 1) % musicState.list.length;
        playByIndex(next);
    }

    function playPrev() {
        if (musicState.list.length === 0) return;
        var prev = musicState.currentIndex - 1;
        if (prev < 0) prev = musicState.list.length - 1;
        playByIndex(prev);
    }

    function toggleMode() {
        var modes = ['loop', 'shuffle', 'single'];
        var icons = ['🔁', '🔀', '🔂'];
        var nextIdx = (modes.indexOf(musicState.mode) + 1) % modes.length;
        musicState.mode = modes[nextIdx];
        Blog.$('musicMode').textContent = icons[nextIdx];
        Blog.showToast('播放模式：' + ({ loop: '列表循环', shuffle: '随机播放', single: '单曲循环' })[musicState.mode]);
    }

    /* ==================== 播放器初始化 ==================== */
    function initPlayer() {
        if (playerInited) return;
        playerInited = true;

        var audio = Blog.$('audioPlayer');
        if (!audio) return;

        audio.addEventListener('loadedmetadata', function () {
            Blog.$('musicDuration').textContent = formatTime(audio.duration);
        });
        audio.addEventListener('timeupdate', function () {
            if (audio.duration) {
                Blog.$('musicProgressFill').style.width = (audio.currentTime / audio.duration * 100) + '%';
                Blog.$('musicCurrentTime').textContent = formatTime(audio.currentTime);
                syncLyrics(audio.currentTime);
            }
        });
        audio.addEventListener('ended', function () {
            if (musicState.mode === 'single') { audio.currentTime = 0; audio.play().catch(function () {}); }
            else playNext();
        });
        audio.addEventListener('play', function () { musicState.isPlaying = true; updatePlayBtn(); renderMusicList(); });
        audio.addEventListener('pause', function () { musicState.isPlaying = false; updatePlayBtn(); renderMusicList(); });
        audio.addEventListener('error', function () {
            Blog.showToast('音频加载失败');
            musicState.isPlaying = false;
            updatePlayBtn();
        });

        Blog.$('musicPlay').addEventListener('click', togglePlay);
        Blog.$('musicNext').addEventListener('click', playNext);
        Blog.$('musicPrev').addEventListener('click', playPrev);
        Blog.$('musicMode').addEventListener('click', toggleMode);
        Blog.$('musicVolume').addEventListener('input', function () { audio.volume = this.value / 100; });
        audio.volume = 0.7;

        Blog.$('musicProgressBar').addEventListener('click', function (e) {
            if (!audio.duration) return;
            var rect = this.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
        });

        Blog.$('musicList').addEventListener('click', function (e) {
            var item = e.target.closest('.music-item');
            if (!item) return;
            var idx = parseInt(item.getAttribute('data-index'));
            if (!isNaN(idx)) playByIndex(idx);
        });
    }

    /* ==================== 加载 ==================== */
    function load() {
        initPlayer();
        if (musicState.list.length > 0) { renderMusicList(); return; }
        fetchMusic().then(function () { renderMusicList(); });
    }

    Blog.pages.music = { load: load };
})();
