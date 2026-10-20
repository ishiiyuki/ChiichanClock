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

  // モード切替順序: auto -> morning -> daytime -> night -> auto
  const MODES = ['auto', 'morning', 'daytime', 'night'];
  let currentModeIndex = 0;

  function getPeriodByHour(hour) {
    if (hour >= 5 && hour < 11) {
      return 'morning'; // image/asa.jpg
    }
    if (hour >= 11 && hour < 17) {
      return 'daytime'; // image/hiru.jpg
    }
    return 'night'; // image/yoru.jpg
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

  // 時間帯バッジタップで AUTO -> 朝 -> 昼 -> 夜 を切り替え可能にする
  periodToggleBtn.addEventListener('click', () => {
    currentModeIndex = (currentModeIndex + 1) % MODES.length;
    updateClock();
  });

  // 縦画面固定処理（Screen Orientation Lock API + 逆回転フォールバック）
  async function tryLockPortrait() {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      try {
        await screen.orientation.lock('portrait-primary');
      } catch (_) {
        // ブラウザの制限（非フルスクリーン時など）でロックできない場合はCSS逆回転で対応
      }
    }
  }

  function updateCounterRotation() {
    const isMobileOrTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (!isMobileOrTouch) {
      app.classList.remove('counter-rotate-left', 'counter-rotate-right');
      return;
    }

    let angle = 0;
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      angle = screen.orientation.angle;
    } else if (typeof window.orientation === 'number') {
      angle = window.orientation;
    } else if (window.innerWidth > window.innerHeight) {
      angle = 90;
    }

    app.classList.remove('counter-rotate-left', 'counter-rotate-right');

    // スマホを横に傾けてブラウザが90度または270度(-90度)回転した場合、逆回転して縦向きを維持
    if (angle === 90) {
      app.classList.add('counter-rotate-left');
    } else if (angle === 270 || angle === -90) {
      app.classList.add('counter-rotate-right');
    }
  }

  // フルスクリーン＆縦画面ロックボタン
  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        await tryLockPortrait();
      } else {
        await document.exitFullscreen();
      }
    } catch (_) {
      // iOS SafariなどFullscreen API非対応環境用
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
    }
  });

  if (screen.orientation) {
    screen.orientation.addEventListener('change', updateCounterRotation);
  }
  window.addEventListener('orientationchange', updateCounterRotation);
  window.addEventListener('resize', updateCounterRotation);

  // 初回タッチ時に縦固定・スリープ防止を有効化試行
  document.addEventListener('pointerdown', () => {
    tryLockPortrait();
    if (!wakeLock) {
      requestWakeLock();
    }
  }, { once: true });

  // 初期化
  updateCounterRotation();
  updateClock();
  requestWakeLock();
  setInterval(updateClock, 250);
})();
