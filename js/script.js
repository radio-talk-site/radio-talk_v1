const escapeHTML = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function formatText(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  let html = '';
  let inList = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (line.startsWith('◆')) { closeList(); html += `<h4>${escapeHTML(line.slice(1).trim())}</h4>`; }
    else if (line.startsWith('■')) { closeList(); html += `<h5>${escapeHTML(line.slice(1).trim())}</h5>`; }
    else if (line.startsWith('・')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${escapeHTML(line.slice(1).trim())}</li>`;
    }
    else if (line.startsWith('>')) { closeList(); html += `<blockquote>${escapeHTML(line.slice(1).trim())}</blockquote>`; }
    else { closeList(); html += `<p>${escapeHTML(line)}</p>`; }
  }
  closeList();
  return html;
}

async function loadText(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(path);
  return await res.text();
}

async function init() {
  try {
    const themeTitle = (await loadText('text/title.txt')).trim();

    document.getElementById('theme-title').textContent = themeTitle;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: themeTitle.replace(/[│｜|]/g, ' ').replace(/\s+/g, ' ').trim(),
        artist: 'ラジオトーク'
      });
    }
  } catch {
    document.getElementById('theme-title').textContent = 'テーマを読み込めませんでした';
  }

  document.querySelectorAll('.script-box').forEach(async box => {
    try { box.innerHTML = formatText(await loadText(box.dataset.text)); }
    catch { box.textContent = '原稿を読み込めませんでした'; }
  });

  /* ========================================
   言語切替
   PC：従来のタブ切替
   スマホ：3言語を横スクロール
======================================== */

  const buttons = Array.from(
    document.querySelectorAll('.tab-button')
  );

  const panels = Array.from(
    document.querySelectorAll('.tab-panel')
  );

  const contentCard =
    document.querySelector('.language-slider');

  const mobileQuery =
    window.matchMedia('(max-width: 640px)');

  let currentLanguage = 'ja';

  let scrollTimer = null;


  /* =========================
     タブの見た目を更新
  ========================= */

  function updateActiveTab(language) {

    buttons.forEach(button => {

      const isActive =
        button.dataset.tab === language;

      button.classList.toggle(
        'active',
        isActive
      );

      button.setAttribute(
        'aria-selected',
        isActive ? 'true' : 'false'
      );

    });

  }


  /* =========================
     言語変更を他機能へ通知
  ========================= */

  function notifyLanguageChange(language) {

    if (currentLanguage === language) {
      return;
    }

    currentLanguage = language;

    document.dispatchEvent(
      new CustomEvent(
        'languageTabChanged',
        {
          detail: {
            language: language
          }
        }
      )
    );

  }


  /* =========================
     PC版
     今まで通り1言語だけ表示
  ========================= */

  function switchDesktopLanguage(language) {

    updateActiveTab(language);

    panels.forEach(panel => {

      const isActive =
        panel.dataset.panel === language;

      panel.hidden = !isActive;

      panel.classList.toggle(
        'active',
        isActive
      );

    });

    notifyLanguageChange(language);

  }


  /* =========================
     スマホ版
     3言語を全部表示
  ========================= */

  function prepareMobilePanels() {

    panels.forEach(panel => {

      panel.hidden = false;

    });

  }


  /* =========================
     タブを押したとき
  ========================= */

  buttons.forEach(button => {

    button.addEventListener(
      'click',
      () => {

        const language =
          button.dataset.tab;

        /*
           スマホ
           → 対応する言語までヌルッと横移動
        */
        if (mobileQuery.matches) {

          prepareMobilePanels();

          const index =
            panels.findIndex(
              panel =>
                panel.dataset.panel === language
            );

          if (
            index === -1 ||
            !contentCard
          ) {
            return;
          }

          const pageWidth =
            contentCard.clientWidth;

          contentCard.scrollTo({
            left: pageWidth * index,
            behavior: 'smooth'
          });

          updateActiveTab(language);

          notifyLanguageChange(language);

          return;
        }


        /*
           PC
        */
        switchDesktopLanguage(language);

      }
    );

  });


  /* =========================
     横スクロールに合わせて
     言語タブを自動切替
  ========================= */

  contentCard?.addEventListener(
    'scroll',
    () => {

      if (!mobileQuery.matches) {
        return;
      }

      clearTimeout(scrollTimer);

      /*
         指で動かしている途中でも
         一番近い言語を判定
      */

      const pageWidth =
        contentCard.clientWidth;

      if (!pageWidth) {
        return;
      }

      let index =
        Math.round(
          contentCard.scrollLeft /
          pageWidth
        );

      index = Math.max(
        0,
        Math.min(
          panels.length - 1,
          index
        )
      );

      const language =
        panels[index]?.dataset.panel;

      if (language) {
        updateActiveTab(language);
      }


      /*
         スクロールが止まったら
         正式に言語変更として通知
      */

      scrollTimer = setTimeout(
        () => {

          const finalWidth =
            contentCard.clientWidth;

          if (!finalWidth) {
            return;
          }

          let finalIndex =
            Math.round(
              contentCard.scrollLeft /
              finalWidth
            );

          finalIndex = Math.max(
            0,
            Math.min(
              panels.length - 1,
              finalIndex
            )
          );

          const finalLanguage =
            panels[
              finalIndex
            ]?.dataset.panel;

          if (!finalLanguage) {
            return;
          }

          updateActiveTab(
            finalLanguage
          );

          notifyLanguageChange(
            finalLanguage
          );

        },
        100
      );

    },
    {
      passive: true
    }
  );


  /* =========================
     PC ⇄ スマホ切替時の処理
  ========================= */

  function applyLanguageLayout() {

    if (mobileQuery.matches) {

      /*
         スマホでは全言語を並べる
      */

      prepareMobilePanels();

      const index =
        Math.max(
          0,
          panels.findIndex(
            panel =>
              panel.dataset.panel ===
              currentLanguage
          )
        );

      requestAnimationFrame(() => {

        if (!contentCard) {
          return;
        }

        contentCard.scrollLeft =
          contentCard.clientWidth *
          index;

      });

    } else {

      /*
         PCに戻ったら
         現在言語だけ表示
      */

      switchDesktopLanguage(
        currentLanguage
      );

    }

  }


  mobileQuery.addEventListener(
    'change',
    applyLanguageLayout
  );

  applyLanguageLayout();


  initPlayButton();

}

function formatTime(seconds) {

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainSeconds).padStart(2, '0')}`;

}

function initPlayButton() {

  const episodeId = document.body.dataset.episodeId;

  const statusTexts = {
    ja: {
      unplayed: '未再生',
      playing: '再生途中',
      completed: '再生済み',
      play: '再生',
      pause: '一時停止',
      loading: '音声を読み込んでいます…',
      error: '音声を再生できませんでした。通信環境を確認して、もう一度お試しください。'
    },

    vi: {
      unplayed: 'Chưa nghe',
      playing: 'Đang nghe',
      completed: 'Đã nghe',
      play: 'Phát',
      pause: 'Tạm dừng',
      loading: 'Đang tải âm thanh…',
      error: 'Không thể phát âm thanh. Vui lòng kiểm tra kết nối và thử lại.'
    },

    id: {
      unplayed: 'Belum diputar',
      playing: 'Sedang diputar',
      completed: 'Selesai diputar',
      play: 'Putar',
      pause: 'Jeda',
      loading: 'Memuat audio…',
      error: 'Audio tidak dapat diputar. Periksa koneksi lalu coba lagi.'
    }
  };

  const miniPlayer = document.querySelector('.mini-player');
  const miniToggle = document.querySelector('.mini-player-toggle');
  const miniLanguage = document.querySelector('.mini-language');
  const miniTime = document.querySelector('.mini-time');

  document.addEventListener('languageTabChanged', event => {
    const language = event.detail?.language;
    if (!language) return;

    const panel = document.querySelector(`[data-panel="${language}"]`);
    const audio = panel?.querySelector(
      `.audio-source[data-language="${language}"]`
    );
    const player = panel?.querySelector(
      `.custom-player[data-language="${language}"]`
    );
    const playButton = player?.querySelector('.play-button');

    if (!audio || !playButton) return;

    activeAudio = audio;
    activePlayButton = playButton;
    activeTexts = statusTexts[language];

    miniLanguage.textContent =
      language === 'ja'
        ? 'JP 日本語'
        : language === 'vi'
          ? 'VN Tiếng Việt'
          : 'ID Indonesia';

    miniTime.textContent =
      `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;

    const percent = audio.duration
      ? (audio.currentTime / audio.duration) * 100
      : 0;

    miniSeekProgress.style.width = percent + '%';
    miniSeekKnob.style.left = percent + '%';

    const isPlaying =
      !audio.paused &&
      !audio.ended;

    miniPlayButton.classList.toggle(
      'is-playing',
      isPlaying
    );

    miniPlayButton.setAttribute(
      'aria-label',
      isPlaying
        ? activeTexts.pause
        : activeTexts.play
    );
  });

  const miniPlayButton = document.querySelector('.mini-play');
  const miniRewindButton = document.querySelector('.mini-rewind');
  const miniForwardButton = document.querySelector('.mini-forward');
  const miniSeekBar = document.querySelector('.mini-seek-bar');
  const miniSeekProgress = document.querySelector('.mini-seek-progress');
  const miniSeekKnob = document.querySelector('.mini-seek-knob');

  let activeAudio = null;
  let activePlayButton = null;
  let activeTexts = null;

  let hasSentAudioStart = false;

  let playbackMilestones = {
    25: false,
    50: false,
    75: false,
    95: false
  };

  const players = document.querySelectorAll('.custom-player');

  function updateMiniPlayerVisibility() {

    if (!activePlayButton) {
      miniPlayer.hidden = true;
      return;
    }

    const playerElement =
      activePlayButton.closest('.custom-player');

    if (!playerElement) {
      miniPlayer.hidden = true;
      return;
    }

    const rect = playerElement.getBoundingClientRect();

    const isVisible =
      rect.bottom > 0 &&
      rect.top < window.innerHeight;

    miniPlayer.hidden = isVisible;

  }

  players.forEach(player => {

    const language = player.dataset.language;
    const texts = statusTexts[language];

    const panel = player.closest('.tab-panel');
    const audio = panel?.querySelector(
      `.audio-source[data-language="${language}"]`
    );

    const playButton = player.querySelector('.play-button');
    const currentTime = player.querySelector('.current-time');
    const durationTime = player.querySelector('.duration-time');
    const playStatus = player.querySelector('.play-status');

    const audioMessage = document.createElement('p');
    audioMessage.className = 'audio-message';
    audioMessage.setAttribute('aria-live', 'polite');
    audioMessage.hidden = true;

    playStatus.insertAdjacentElement('afterend', audioMessage);

    function showAudioMessage(type, message) {
      audioMessage.dataset.type = type;
      audioMessage.textContent = message;
      audioMessage.hidden = false;
    }

    function hideAudioMessage() {
      audioMessage.hidden = true;
      audioMessage.textContent = '';
      delete audioMessage.dataset.type;
    }

    const seekBar = player.querySelector('.seek-bar');
    const seekProgress = player.querySelector('.seek-progress');
    const seekKnob = player.querySelector('.seek-knob');

    const rewindButton = player.querySelector('.rewind-button');
    const forwardButton = player.querySelector('.forward-button');

    const speedButtons =
      player.querySelectorAll('.speed-buttons button');

    if (
      !language ||
      !texts ||
      !audio ||
      !playButton ||
      !seekBar
    ) {
      return;
    }

    const audioId = audio.getAttribute('src');

    const positionKey = `radio-${episodeId}-${language}-position`;
    const completedKey = `radio-${episodeId}-${language}-completed`;

    const savedCompleted =
      localStorage.getItem(completedKey) === 'true';

    if (savedCompleted) {
      playStatus.textContent = texts.completed;
      playStatus.dataset.status = 'completed';
    }

    function updatePlayStatus() {

      const isCompleted =
        localStorage.getItem(completedKey) === 'true';

      const progress = audio.duration
        ? audio.currentTime / audio.duration
        : 0;

      if (isCompleted || progress >= 0.95) {

        playStatus.textContent = texts.completed;
        playStatus.dataset.status = 'completed';

      } else if (audio.currentTime > 0) {

        playStatus.textContent = texts.playing;
        playStatus.dataset.status = 'playing';

      } else {

        playStatus.textContent = texts.unplayed;
        playStatus.dataset.status = 'unplayed';

      }
    }

    function updateDuration() {

      if (Number.isFinite(audio.duration)) {
        durationTime.textContent =
          formatTime(audio.duration);
      }
    }

    function stopOtherPlayers() {

      document
        .querySelectorAll('.audio-source')
        .forEach(otherAudio => {

          if (otherAudio !== audio) {
            otherAudio.pause();
          }

        });

      document
        .querySelectorAll('.play-button')
        .forEach(otherButton => {

          if (otherButton !== playButton) {
            otherButton.classList.remove('is-playing');
          }

        });
    }

    playButton.addEventListener('click', async () => {

      if (audio.paused) {

        stopOtherPlayers();

        if (
          audio.ended ||
          audio.currentTime >= audio.duration
        ) {
          audio.currentTime = 0;
        }

        try {

          await audio.play();

          activeAudio = audio;
          activePlayButton = playButton;
          activeTexts = texts;

          if (
            !hasSentAudioStart &&
            typeof gtag === 'function'
          ) {
            console.log('audio_start送信', language);

            gtag('event', 'audio_start', {
              episode_id: episodeId,
              audio_language: language,
              send_to: 'G-PGVD9L27LG'
            });

            hasSentAudioStart = true;

            playbackMilestones = {
              25: false,
              50: false,
              75: false,
              95: false
            };

          }

          miniPlayer.hidden = false;

          updateMiniPlayerVisibility();

          miniLanguage.textContent =
            language === 'ja'
              ? 'JP 日本語'
              : language === 'vi'
                ? 'VN Tiếng Việt'
                : 'ID Indonesia';

          miniPlayButton.classList.add('is-playing');
          miniPlayButton.setAttribute('aria-label', texts.pause);

          playButton.classList.add('is-playing');
          playButton.setAttribute(
            'aria-label',
            texts.pause
          );

        } catch (error) {

          console.error('音声を再生できませんでした', error);

          showAudioMessage('error', texts.error);

          playButton.classList.remove('is-playing');
          playButton.setAttribute('aria-label', texts.play);

        }

      } else {

        audio.pause();

        playButton.classList.remove('is-playing');
        playButton.setAttribute(
          'aria-label',
          texts.play
        );

      }
    });

    rewindButton.addEventListener('click', () => {

      audio.currentTime = Math.max(
        0,
        audio.currentTime - 10
      );

    });

    forwardButton.addEventListener('click', () => {

      if (!audio.duration) return;

      audio.currentTime = Math.min(
        audio.duration,
        audio.currentTime + 10
      );

    });

    speedButtons.forEach((button, index) => {

      button.addEventListener('click', () => {

        audio.playbackRate =
          Number(button.dataset.speed);

        speedButtons.forEach(btn => {
          btn.classList.remove('active');
        });

        button.classList.add('active');

        const speedButtonsArea =
          button.closest('.speed-buttons');

        speedButtonsArea.style.setProperty(
          '--speed-position',
          index
        );

      });

    });

    audio.addEventListener('loadstart', () => {
      if (audio.readyState < 1) {
        showAudioMessage('loading', texts.loading);
      }
    });

    audio.addEventListener('waiting', () => {
      showAudioMessage('loading', texts.loading);
    });

    audio.addEventListener('stalled', () => {
      if (!audio.paused) {
        showAudioMessage('loading', texts.loading);
      }
    });

    audio.addEventListener('playing', () => {
      hideAudioMessage();
    });

    audio.addEventListener('canplay', () => {
      hideAudioMessage();
    });

    audio.addEventListener('error', () => {
      showAudioMessage('error', texts.error);

      playButton.classList.remove('is-playing');
      playButton.setAttribute('aria-label', texts.play);

      if (activeAudio === audio) {
        miniPlayButton.classList.remove('is-playing');
        miniPlayButton.setAttribute('aria-label', texts.play);
      }
    });

    audio.addEventListener('ended', () => {

      playButton.classList.remove('is-playing');

      playButton.setAttribute(
        'aria-label',
        texts.play
      );

      updatePlayStatus();
      function syncMiniPlayState() {
        if (activeAudio !== audio) return;

        const isPlaying =
          !audio.paused &&
          !audio.ended;

        miniPlayButton.classList.toggle(
          'is-playing',
          isPlaying
        );

        miniPlayButton.setAttribute(
          'aria-label',
          isPlaying
            ? texts.pause
            : texts.play
        );
      }

      audio.addEventListener('play', syncMiniPlayState);
      audio.addEventListener('pause', syncMiniPlayState);
      audio.addEventListener('ended', syncMiniPlayState);

    });

    audio.addEventListener('timeupdate', () => {

      currentTime.textContent =
        formatTime(audio.currentTime);

      if (activeAudio === audio) {

        miniTime.textContent =
          `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;

        const miniPercent = audio.duration
          ? (audio.currentTime / audio.duration) * 100
          : 0;

        miniSeekProgress.style.width = miniPercent + '%';
        miniSeekKnob.style.left = miniPercent + '%';
      }

      const percent = audio.duration
        ? (audio.currentTime / audio.duration) * 100
        : 0;

      seekProgress.style.width = percent + '%';
      seekKnob.style.left = percent + '%';

      localStorage.setItem(
        positionKey,
        audio.currentTime
      );

      if (audio.duration) {
        const progress =
          audio.currentTime / audio.duration;

        const progressPercent =
          progress * 100;

        if (progress >= 0.95) {
          localStorage.setItem(
            completedKey,
            'true'
          );

          localStorage.removeItem(positionKey);
        }

        if (
          progressPercent >= 25 &&
          !playbackMilestones[25] &&
          typeof gtag === 'function'
        ) {
          playbackMilestones[25] = true;

          console.log('25%到達', progressPercent);

          gtag('event', 'audio_25', {
            episode_id: episodeId,
            audio_language: language
          });
        }

        if (
          progressPercent >= 50 &&
          !playbackMilestones[50] &&
          typeof gtag === 'function'
        ) {
          playbackMilestones[50] = true;

          gtag('event', 'audio_50', {
            episode_id: episodeId,
            audio_language: language
          });
        }

        if (
          progressPercent >= 75 &&
          !playbackMilestones[75] &&
          typeof gtag === 'function'
        ) {
          playbackMilestones[75] = true;

          gtag('event', 'audio_75', {
            episode_id: episodeId,
            audio_language: language
          });
        }

        if (
          progressPercent >= 95 &&
          !playbackMilestones[95] &&
          typeof gtag === 'function'
        ) {
          playbackMilestones[95] = true;

          console.log('95%到達', progressPercent);

          gtag('event', 'audio_complete', {
            episode_id: episodeId,
            audio_language: language
          });
        }
      }

      updatePlayStatus();

    });

    audio.addEventListener('loadedmetadata', () => {

      updateDuration();

      const savedPosition = Number(
        localStorage.getItem(positionKey)
      );

      const savedProgress = audio.duration
        ? savedPosition / audio.duration
        : 0;

      const isCompleted =
        localStorage.getItem(completedKey) === 'true';

      if (isCompleted) {

        audio.currentTime = 0;

      } else if (
        savedPosition > 0 &&
        savedPosition < audio.duration
      ) {

        audio.currentTime = savedPosition;

      }

      updatePlayStatus();

    });

    audio.addEventListener(
      'durationchange',
      updateDuration
    );

    if (audio.readyState >= 1) {
      updateDuration();
    }

    function moveSeekPosition(clientX) {

      if (!audio.duration) return;

      const rect =
        seekBar.getBoundingClientRect();

      let percent =
        (clientX - rect.left) / rect.width;

      percent = Math.max(
        0,
        Math.min(1, percent)
      );

      audio.currentTime =
        percent * audio.duration;

      seekProgress.style.width =
        (percent * 100) + '%';

      seekKnob.style.left =
        (percent * 100) + '%';
    }

    let isDragging = false;

    seekBar.addEventListener(
      'pointerdown',
      event => {

        isDragging = true;

        seekBar.classList.add('dragging');

        seekBar.setPointerCapture(
          event.pointerId
        );

        moveSeekPosition(event.clientX);
      }
    );

    seekBar.addEventListener(
      'pointermove',
      event => {

        if (!isDragging) return;

        moveSeekPosition(event.clientX);

      }
    );

    seekBar.addEventListener(
      'pointerup',
      event => {

        isDragging = false;

        seekBar.classList.remove('dragging');

        if (
          seekBar.hasPointerCapture(
            event.pointerId
          )
        ) {
          seekBar.releasePointerCapture(
            event.pointerId
          );
        }
      }
    );

    seekBar.addEventListener(
      'pointercancel',
      () => {

        isDragging = false;

        seekBar.classList.remove('dragging');

      }
    );

  });

  miniPlayButton.addEventListener('click', async () => {

    if (!activeAudio) return;

    if (activeAudio.paused) {

      await activeAudio.play();

      miniPlayButton.classList.add('is-playing');
      miniPlayButton.setAttribute(
        'aria-label',
        activeTexts?.pause || '一時停止'
      );

      if (activePlayButton) {
        activePlayButton.classList.add('is-playing');
      }

    } else {

      activeAudio.pause();

      miniPlayButton.classList.remove('is-playing');
      miniPlayButton.setAttribute(
        'aria-label',
        activeTexts?.play || '再生'
      );

      if (activePlayButton) {
        activePlayButton.classList.remove('is-playing');
      }

    }

  });

  miniRewindButton.addEventListener('click', () => {
    if (!activeAudio) return;

    activeAudio.currentTime = Math.max(
      0,
      activeAudio.currentTime - 10
    );
  });

  miniForwardButton.addEventListener('click', () => {
    if (!activeAudio || !activeAudio.duration) return;

    activeAudio.currentTime = Math.min(
      activeAudio.duration,
      activeAudio.currentTime + 10
    );
  });

  window.addEventListener(
    'scroll',
    updateMiniPlayerVisibility
  );

  window.addEventListener(
    'resize',
    updateMiniPlayerVisibility
  );

  function moveMiniSeekPosition(clientX) {

    if (!activeAudio || !activeAudio.duration) return;

    const rect = miniSeekBar.getBoundingClientRect();

    let percent =
      (clientX - rect.left) / rect.width;

    percent = Math.max(
      0,
      Math.min(1, percent)
    );

    activeAudio.currentTime =
      percent * activeAudio.duration;

    miniSeekProgress.style.width =
      (percent * 100) + '%';

    miniSeekKnob.style.left =
      (percent * 100) + '%';
  }

  let isMiniDragging = false;

  miniSeekBar.addEventListener('pointerdown', event => {

    isMiniDragging = true;

    miniSeekBar.setPointerCapture(
      event.pointerId
    );

    moveMiniSeekPosition(event.clientX);
  });

  miniSeekBar.addEventListener('pointermove', event => {

    if (!isMiniDragging) return;

    moveMiniSeekPosition(event.clientX);
  });

  miniSeekBar.addEventListener('pointerup', event => {

    isMiniDragging = false;

    if (
      miniSeekBar.hasPointerCapture(
        event.pointerId
      )
    ) {
      miniSeekBar.releasePointerCapture(
        event.pointerId
      );
    }
  });

  miniSeekBar.addEventListener('pointercancel', () => {

    isMiniDragging = false;

  });
  miniToggle?.addEventListener('click', () => {
    const isOpen = miniPlayer.classList.toggle('open');

    miniToggle.setAttribute('aria-expanded', String(isOpen));
    miniToggle.setAttribute(
      'aria-label',
      isOpen
        ? 'ミニプレーヤーを閉じる'
        : 'ミニプレーヤーを開く'
    );
  });

}

// テーマタイトルの「|」を改行に変換
const themeTitle = document.getElementById("theme-title");

if (themeTitle) {
  const formatThemeTitle = () => {
    const text = themeTitle.textContent;

    if (!text.includes("|")) return;

    themeTitle.innerHTML = text
      .split("|")
      .map(part => part.trim())
      .join("<br>");
  };

  const themeTitleObserver = new MutationObserver(() => {
    formatThemeTitle();
  });

  themeTitleObserver.observe(themeTitle, {
    childList: true,
    characterData: true,
    subtree: true
  });

  formatThemeTitle();
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('DOMContentLoaded', () => {
  // 画像が画面に入ったら、1枚ずつ表示する
  const comicImages = document.querySelectorAll('.comic-image');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    comicImages.forEach((image) => observer.observe(image));
  } else {
    comicImages.forEach((image) => image.classList.add('is-visible'));
  }

  // どれかの音声が再生中なら、ヘッダーの波形を動かす
  const audios = document.querySelectorAll('.audio-source');

  const updateWave = () => {
    const isPlaying = [...audios].some(
      (audio) => !audio.paused && !audio.ended
    );
    document.body.classList.toggle('is-audio-playing', isPlaying);
  };

  audios.forEach((audio) => {
    audio.addEventListener('play', updateWave);
    audio.addEventListener('pause', updateWave);
    audio.addEventListener('ended', updateWave);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const card = document.getElementById('audio-area');
  const comics = document.querySelector('.comic-section');

  if (!card || !comics) return;

  document.body.classList.add('white-mist');

  // 「音声はこちら」を削除
  document.querySelector('.audio-guide')?.remove();

  // 原稿を共通枠の外へ移動
  const transcripts = document.createElement('section');
  transcripts.className = 'mist-transcripts';

  document.querySelectorAll('.tab-panel').forEach(panel => {
    const details = panel.querySelector('details');
    if (!details) return;

    const block = details.closest('.section-block');

    block.dataset.transcriptLanguage = panel.dataset.panel;
    block.hidden = panel.dataset.panel !== 'ja';

    transcripts.append(block);
  });

  card.after(transcripts);

  // 選択中の言語に合わせて原稿も切り替える
  document.addEventListener('languageTabChanged', event => {
    transcripts
      .querySelectorAll('[data-transcript-language]')
      .forEach(block => {
        block.hidden =
          block.dataset.transcriptLanguage !== event.detail.language;
      });
  });

  // 再生時間をシークバーの下へ移動
  card.querySelectorAll('.custom-player').forEach(player => {
    player.querySelector('.seek-bar').after(
      player.querySelector('.player-time')
    );
  });

  // 今ある3枚の画像を使用
  const images = [...comics.querySelectorAll('img')];
  if (images.length !== 3) return;

  // 言語選択の直下へ移動
  card.querySelector('.tabs').after(comics);

  comics.className = 'mist-carousel';
  comics.setAttribute('aria-label', '今回のテーマの画像');

  comics.innerHTML = `
    <div class="mist-viewport">
      <div class="mist-track"></div>
    </div>

    <button
      type="button"
      class="mist-arrow mist-prev"
      aria-label="前の画像"
    >‹</button>

    <button
      type="button"
      class="mist-arrow mist-next"
      aria-label="次の画像"
    >›</button>

    <div class="mist-pagination">
      <div class="mist-dots"></div>
      <span class="mist-count"></span>
    </div>
  `;

  const viewport = comics.querySelector('.mist-viewport');
  const track = comics.querySelector('.mist-track');

  // 両端はループ用の複製
  // 初期表示：左に3、中央に1、右に2
  [2, 0, 1, 2, 0].forEach((number, position) => {
    const slide = document.createElement('div');

    slide.className = 'mist-slide';
    slide.append(images[number].cloneNode(true));
    slide.setAttribute('aria-hidden', String(position !== 1));

    track.append(slide);
  });

  const dots = images.map((image, number) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.setAttribute(
      'aria-label',
      `${number + 1}枚目を表示`
    );

    comics.querySelector('.mist-dots').append(button);

    return button;
  });

  let position = 1;
  let busy = false;
  let timer;
  let manual = false;
  let startX = null;
  let finishTimer;

  const reduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  function render(animate = false) {
    const slideWidth =
      track.firstElementChild.getBoundingClientRect().width;

    const gap = parseFloat(getComputedStyle(track).gap) || 0;

    const offset =
      viewport.clientWidth / 2 -
      slideWidth / 2 -
      position * (slideWidth + gap);

    track.style.transition =
      animate && !reduced.matches
        ? 'transform 450ms ease'
        : 'none';

    track.style.transform = `translateX(${offset}px)`;

    const current = (position + 2) % 3;

    dots.forEach((dot, number) => {
      dot.classList.toggle('active', number === current);
      dot.setAttribute(
        'aria-current',
        String(number === current)
      );
    });

    [...track.children].forEach((slide, number) => {
      slide.setAttribute(
        'aria-hidden',
        String(number !== position)
      );
    });

    comics.querySelector('.mist-count').textContent =
      `${current + 1} / 3`;
  }

  function finish() {
    clearTimeout(finishTimer);

    // 同じ画像の位置へ瞬時に戻し、ループをつなぐ
    if (position === 4) position = 1;
    if (position === 0) position = 3;

    render();
    busy = false;
  }

  function move(next) {
    if (busy) return;

    busy = true;
    position = next;

    render(true);

    finishTimer = setTimeout(
      finish,
      reduced.matches ? 0 : 500
    );
  }

  // 一度手動で操作したら自動再生を停止
  function stopAuto() {
    manual = true;
    clearInterval(timer);
  }

  function startAuto() {
    clearInterval(timer);

    if (manual || reduced.matches || document.hidden) return;

    let autoMoves = 0;

    timer = setInterval(() => {
      if (startX !== null || busy) return;

      move(position + 1);
      autoMoves++;

      // 1 → 2 → 3 → 1 を2周したら停止
      if (autoMoves >= 6) {
        stopAuto();
      }
    }, 5000);
  }

  track.addEventListener('transitionend', event => {
    if (
      event.target === track &&
      event.propertyName === 'transform'
    ) {
      finish();
    }
  });

  comics.querySelector('.mist-prev').addEventListener(
    'click',
    () => {
      stopAuto();
      move(position - 1);
    }
  );

  comics.querySelector('.mist-next').addEventListener(
    'click',
    () => {
      stopAuto();
      move(position + 1);
    }
  );

  dots.forEach((dot, number) => {
    dot.addEventListener('click', () => {
      stopAuto();
      move(number + 1);
    });
  });

  // スマホの横スワイプ
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || busy) return;

    startX = event.clientX;
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointerup', event => {
    if (startX === null) return;

    const distance = event.clientX - startX;
    startX = null;

    if (Math.abs(distance) >= 35) {
      stopAuto();
      move(position + (distance < 0 ? 1 : -1));
    }
  });

  viewport.addEventListener('pointercancel', () => {
    startX = null;
  });

  // PCの横スクロール操作
  viewport.addEventListener(
    'wheel',
    event => {
      if (
        Math.abs(event.deltaX) > Math.abs(event.deltaY) &&
        Math.abs(event.deltaX) > 10
      ) {
        stopAuto();
        move(position + (event.deltaX > 0 ? 1 : -1));
      }
    },
    { passive: true }
  );

  viewport.addEventListener('dragstart', event => {
    event.preventDefault();
  });

  new ResizeObserver(() => {
    finish();
  }).observe(viewport);

  document.addEventListener('visibilitychange', startAuto);
  reduced.addEventListener('change', startAuto);

  render();
  startAuto();
});

// キャラクター：普段はぷかぷか、30秒ごとに手振りとウインク
(() => {
  function initRadioCharacter() {
    const character = document.querySelector('.radio-character');
    if (!character || character.dataset.animationReady) return;
    character.dataset.animationReady = 'true';
    const hand = character.querySelector('.radio-hand');
    const wink = character.querySelector('.radio-wink');
    if (!hand || !wink || !character.animate) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let idle = null, timer = null, greeting = [];
    const interval = 30000;
    function stopGreeting() { greeting.forEach(a => a.cancel()); greeting = []; }
    function greet() {
      if (reduced.matches || document.hidden) return;
      stopGreeting();
      greeting = [
        hand.animate([
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-7deg)', offset: .18 },
          { transform: 'rotate(6deg)', offset: .36 },
          { transform: 'rotate(-7deg)', offset: .54 },
          { transform: 'rotate(6deg)', offset: .72 },
          { transform: 'rotate(0deg)' }
        ], { duration: 1900, easing: 'ease-in-out' }),
        wink.animate([
          { opacity: 0, offset: 0 }, { opacity: 0, offset: .72 },
          { opacity: 1, offset: .78 }, { opacity: 1, offset: .91 },
          { opacity: 0, offset: 1 }
        ], { duration: 2550 })
      ];
    }
    function start() {
      clearTimeout(timer); idle?.cancel(); idle = null;
      if (document.hidden || reduced.matches) { stopGreeting(); return; }
      idle = character.animate([
        { transform: 'translateY(0) rotate(-.5deg)' },
        { transform: 'translateY(-3px) rotate(.5deg)' },
        { transform: 'translateY(0) rotate(-.5deg)' }
      ], { duration: 5000, iterations: Infinity, easing: 'ease-in-out' });
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (!document.hidden && !reduced.matches) {
        timer = setTimeout(() => { greet(); schedule(); }, interval);
      }
    }
    character.addEventListener('click', () => { greet(); schedule(); });
    document.addEventListener('visibilitychange', start);
    reduced.addEventListener('change', start);
    start();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRadioCharacter, { once: true });
  } else { initRadioCharacter(); }
})();
