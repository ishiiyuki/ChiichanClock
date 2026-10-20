(() => {
  const app = document.getElementById('app');
  const timeHM = document.getElementById('timeHM');
  const timeSec = document.getElementById('timeSec');
  const dateDisplay = document.getElementById('dateDisplay');
  const periodToggleBtn = document.getElementById('periodToggleBtn');
  const periodIcon = document.getElementById('periodIcon');
  const periodText = document.getElementById('periodText');
  const modeTag = document.getElementById('modeTag');
  const fullscreenBtn = document.getElementById('fullscreenBtn');

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // 時間帯の設定（朝: 5:00〜10:59 / 昼: 11:00〜16:59 / 夜: 17:00〜4:59）
  const PERIOD_META = {
    morning: { icon: '☕', label: 'MORNING' },
    daytime: { icon: '☀️', label: 'DAYTIME' },
    night:   { icon: '🌙', label: 'NIGHT' }
  };

  // 縦・横すべての背景画像をプリロードして回転時のチラつきを防止
  const IMAGE_PATHS = [
    'image/asa.jpg',
    'image/hiru.jpg',
    'image/yoru.jpg',
    'image/asa_yoko.jpg',
    'image/hiru_yoko.jpg',
    'image/yoru_yoko.jpg'
  ];
  IMAGE_PATHS.forEach((src) => {
    const img = new Image();
    img.src = src;
  });

  // モード切替順序: auto -> morning -> daytime -> night -> auto
  const MODES = ['auto', 'morning', 'daytime', 'night'];
  let currentModeIndex = 0;

  function getPeriodByHour(hour) {
    if (hour >= 5 && hour < 11) {
      return 'morning'; // 縦: asa.jpg / 横: asa_yoko.jpg
    }
    if (hour >= 11 && hour < 17) {
      return 'daytime'; // 縦: hiru.jpg / 横: hiru_yoko.jpg
    }
    return 'night'; // 縦: yoru.jpg / 横: yoru_yoko.jpg
  }

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    timeHM.textContent = `${pad2(hours)}:${pad2(minutes)}`;
    timeSec.textContent = pad2(seconds);

    const year = now.getFullYear();
    const month = pad2(now.getMonth() + 1);
    const date = pad2(now.getDate());
    const dayName = DAYS[now.getDay()];
    dateDisplay.textContent = `${year}.${month}.${date} (${dayName})`;

    const mode = MODES[currentModeIndex];
    const activePeriod = mode === 'auto' ? getPeriodByHour(hours) : mode;
    applyPeriod(activePeriod, mode === 'auto');
  }

  function applyPeriod(period, isAuto) {
    if (app.dataset.period !== period) {
      app.dataset.period = period;
    }
    const meta = PERIOD_META[period];
    periodIcon.textContent = meta.icon;
    periodText.textContent = meta.label;
    modeTag.textContent = isAuto ? 'AUTO' : 'MANUAL';
    modeTag.classList.toggle('is-manual', !isAuto);
  }

  // 端末の向き（縦 / 横）を検知して data-orientation を更新
  function updateOrientation() {
    let isLandscape = false;
    if (window.matchMedia('(orientation: landscape)').matches) {
      isLandscape = true;
    } else if (window.innerWidth > window.innerHeight) {
      isLandscape = true;
    }
    app.dataset.orientation = isLandscape ? 'landscape' : 'portrait';
  }

  // 時間帯バッジタップで AUTO -> 朝 -> 昼 -> 夜 を切り替え可能にする
  periodToggleBtn.addEventListener('click', () => {
    currentModeIndex = (currentModeIndex + 1) % MODES.length;
    updateClock();
  });

  // トースト通知表示
  let toastTimer = null;
  function showToast(message) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastMsg';
      toast.className = 'toast-msg';
      app.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 4000);
  }

  // フルスクリーンボタン
  fullscreenBtn.addEventListener('click', async () => {
    const docEl = document.documentElement;
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
    const exitFS = document.exitFullscreen || document.webkitExitFullscreen;

    if (!requestFS) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      showToast('画面を指で少し上にスワイプすると下のバーが消えます（完全に全画面にするには共有メニューから「ホーム画面に追加」してください）');
      return;
    }

    try {
      if (!isFullscreen) {
        await requestFS.call(docEl, { navigationUI: 'hide' });
      } else if (exitFS) {
        await exitFS.call(document);
      }
    } catch (_) {
      showToast('このブラウザ環境では全画面化が制限されています。「ホーム画面に追加」から起動すると全画面で表示できます。');
    }
  });

  // スリープ防止（Screen Wake Lock API）
  let wakeLock = null;
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch (_) {
        // バッテリーセーバー時など取得できない場合は無視
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      requestWakeLock();
      updateClock();
      updateOrientation();
    }
  });

  const landscapeMql = window.matchMedia('(orientation: landscape)');
  if (typeof landscapeMql.addEventListener === 'function') {
    landscapeMql.addEventListener('change', updateOrientation);
  }
  if (screen.orientation) {
    screen.orientation.addEventListener('change', updateOrientation);
  }
  window.addEventListener('orientationchange', updateOrientation);
  window.addEventListener('resize', updateOrientation);

  // 初回タッチ時にスリープ防止を有効化試行
  document.addEventListener('pointerdown', () => {
    if (!wakeLock) {
      requestWakeLock();
    }
  }, { once: true });

  // 初期化
  updateOrientation();
  updateClock();
  requestWakeLock();
  setInterval(updateClock, 250);
})();
