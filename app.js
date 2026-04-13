// app.js — 主邏輯：打勾、飲水、數據輸入、日期切換

(function() {
  // 目前選擇的日期
  let currentDate = new Date();

  // 取得日期字串 YYYY-MM-DD
  function dateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  // 判斷是不是今天
  function isToday(d) {
    return dateStr(d) === dateStr(new Date());
  }

  // 星期幾的中文
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // === 日期導覽 ===
  function updateDateDisplay() {
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    document.getElementById('dateText').innerHTML = `${m}/${d}` +
      (isToday(currentDate) ? ' <span class="today-badge">TODAY</span>' : '');
    document.getElementById('weekdayText').textContent = weekdays[currentDate.getDay()];
  }

  document.getElementById('prevDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    loadDay();
  });

  document.getElementById('nextDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    loadDay();
  });

  // 點日期可以跳回今天
  document.getElementById('dateDisplay').addEventListener('click', () => {
    currentDate = new Date();
    loadDay();
    showToast('Back to today');
  });

  // === 載入某天的資料到 UI ===
  function loadDay() {
    updateDateDisplay();
    const ds = dateStr(currentDate);
    const data = FitnessData.get(ds);

    // 飲水按鈕
    document.querySelectorAll('.water-btn').forEach(btn => {
      const key = btn.dataset.water;
      btn.classList.toggle('done', data.water[key]);
    });
    updateWaterProgress(data);

    // 任務清單
    document.querySelectorAll('.task-item').forEach(item => {
      const key = item.dataset.task;
      item.classList.toggle('done', data.tasks[key]);
      item.querySelector('.task-check').textContent = data.tasks[key] ? '\u2713' : '';
    });

    // 數據輸入
    document.querySelectorAll('.metric-input').forEach(input => {
      const key = input.dataset.metric;
      input.value = data.metrics[key] !== null ? data.metrics[key] : '';
    });

    // 更新完成環
    updateCompletionRing(data);
  }

  // === 飲水按鈕點擊 ===
  document.getElementById('waterGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('.water-btn');
    if (!btn) return;

    const key = btn.dataset.water;
    const ds = dateStr(currentDate);
    const data = FitnessData.get(ds);
    data.water[key] = !data.water[key];
    FitnessData.save(ds, data);

    btn.classList.toggle('done', data.water[key]);
    updateWaterProgress(data);
    updateCompletionRing(data);

    if (data.water[key]) {
      const amounts = { wakeup: 500, gym: 500, trading: 1000, run: 500, dinner: 500, other: 500 };
      showToast(`+${amounts[key]}ml`);
    }
  });

  // 更新飲水進度條
  function updateWaterProgress(data) {
    const ml = FitnessData.getWaterMl(data.water);
    const pct = Math.min(100, (ml / 3500) * 100);
    document.getElementById('waterBar').style.width = pct + '%';
    document.getElementById('waterText').textContent = `${ml} / 3500 ml`;
  }

  // === 任務打勾 ===
  document.getElementById('taskList').addEventListener('click', (e) => {
    const item = e.target.closest('.task-item');
    if (!item) return;

    const key = item.dataset.task;
    const ds = dateStr(currentDate);
    const data = FitnessData.get(ds);
    data.tasks[key] = !data.tasks[key];
    FitnessData.save(ds, data);

    item.classList.toggle('done', data.tasks[key]);
    item.querySelector('.task-check').textContent = data.tasks[key] ? '\u2713' : '';
    updateCompletionRing(data);

    if (data.tasks[key]) showToast('Done!');
  });

  // === 數據輸入 ===
  document.querySelectorAll('.metric-input').forEach(input => {
    // 防抖：輸入完 500ms 後才存
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const key = input.dataset.metric;
        const ds = dateStr(currentDate);
        const data = FitnessData.get(ds);
        const val = input.value === '' ? null : parseFloat(input.value);
        data.metrics[key] = val;
        FitnessData.save(ds, data);
        updateCompletionRing(data);
      }, 500);
    });
  });

  // === 完成環 ===
  function updateCompletionRing(data) {
    const waterMl = FitnessData.getWaterMl(data.water);
    const waterDone = Object.values(data.water).filter(v => v).length;
    const waterTotal = Object.keys(data.water).length;
    const { done: taskDone, total: taskTotal } = FitnessData.getTaskCount(data.tasks);
    const metricsDone = Object.values(data.metrics).filter(v => v !== null).length;
    const metricsTotal = Object.keys(data.metrics).length;

    const allDone = waterDone + taskDone + metricsDone;
    const allTotal = waterTotal + taskTotal + metricsTotal;
    const pct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

    // 環形進度
    const circle = document.getElementById('ringCircle');
    const circumference = 2 * Math.PI * 42; // r=42
    circle.style.strokeDashoffset = circumference * (1 - pct / 100);

    // 根據完成度變色
    if (pct >= 80) {
      circle.style.stroke = 'var(--green)';
      document.getElementById('ringPct').style.color = 'var(--green)';
    } else if (pct >= 50) {
      circle.style.stroke = 'var(--orange)';
      document.getElementById('ringPct').style.color = 'var(--orange)';
    } else {
      circle.style.stroke = 'var(--accent)';
      document.getElementById('ringPct').style.color = 'var(--accent)';
    }

    document.getElementById('ringPct').textContent = pct + '%';
    document.getElementById('legendWater').textContent = `Water: ${waterMl}/3500ml`;
    document.getElementById('legendTasks').textContent = `Tasks: ${taskDone}/${taskTotal}`;
    document.getElementById('legendMetrics').textContent = `Data: ${metricsDone}/${metricsTotal}`;
  }

  // === Tab 切換 ===
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');

      // 切到統計 tab 時重繪圖表
      if (target === 'tabStats') {
        refreshCharts();
      }
      // 切到設定 tab 時更新資訊
      if (target === 'tabSettings') {
        updateDataInfo();
      }
    });
  });

  // === 統計圖表 ===
  let statPeriod = 7;

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      statPeriod = parseInt(btn.dataset.period);
      refreshCharts();
    });
  });

  function refreshCharts() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - statPeriod + 1);
    const data = FitnessData.getRange(dateStr(start), dateStr(end));
    FitnessCharts.renderAll(data);
  }

  // === 設定頁功能 ===

  // 匯出 TSV
  document.getElementById('btnExportTSV').addEventListener('click', () => {
    const tsv = FitnessData.exportTSV();
    if (!tsv) {
      showToast('No data to export');
      return;
    }
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('TSV copied! Paste to Google Sheets');
    }).catch(() => {
      // Fallback：下載檔案
      downloadFile('fitness-data.tsv', tsv, 'text/tab-separated-values');
      showToast('TSV downloaded');
    });
  });

  // 匯出 JSON
  document.getElementById('btnExportJSON').addEventListener('click', () => {
    const json = FitnessData.exportJSON();
    downloadFile('fitness-data.json', json, 'application/json');
    showToast('JSON downloaded');
  });

  // 匯入 JSON
  document.getElementById('btnImportJSON').addEventListener('click', () => {
    document.getElementById('fileImport').click();
  });

  document.getElementById('fileImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = FitnessData.importJSON(reader.result);
        showToast(`Imported ${count} days`);
        loadDay();
      } catch (err) {
        showToast('Import failed: invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // 清除資料
  document.getElementById('btnClearAll').addEventListener('click', () => {
    showModal(
      'Clear All Data',
      'This will permanently delete all tracking data. This action cannot be undone.',
      () => {
        const count = FitnessData.clearAll();
        showToast(`Cleared ${count} days`);
        loadDay();
      }
    );
  });

  // 更新設定頁資訊
  function updateDataInfo() {
    const dates = FitnessData.getAllDates();
    if (dates.length === 0) {
      document.getElementById('dataInfo').textContent = 'No data yet';
    } else {
      document.getElementById('dataInfo').textContent =
        `${dates.length} days recorded (${dates[0]} ~ ${dates[dates.length - 1]})`;
    }
  }

  // === 工具函式 ===

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1500);
  }

  function showModal(title, msg, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMsg').textContent = msg;
    document.getElementById('modal').classList.add('show');

    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');

    function cleanup() {
      document.getElementById('modal').classList.remove('show');
      confirmBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    }

    function onOk() { cleanup(); onConfirm(); }
    function onCancel() { cleanup(); }

    confirmBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // === 初始化 ===
  loadDay();
})();
