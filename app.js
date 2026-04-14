// app.js — 主邏輯：動態渲染、打勾、自訂飲水格/任務

(function() {
  let currentDate = new Date();

  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function isToday(d) { return dateStr(d) === dateStr(new Date()); }
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // ====== 日期導覽 ======
  function updateDateDisplay() {
    const m = String(currentDate.getMonth()+1).padStart(2,'0');
    const d = String(currentDate.getDate()).padStart(2,'0');
    document.getElementById('dateText').innerHTML = `${m}/${d}` +
      (isToday(currentDate) ? ' <span class="today-badge">TODAY</span>' : '');
    document.getElementById('weekdayText').textContent = weekdays[currentDate.getDay()];
  }

  document.getElementById('prevDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1); loadDay();
  });
  document.getElementById('nextDay').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1); loadDay();
  });
  document.getElementById('dateDisplay').addEventListener('click', () => {
    currentDate = new Date(); loadDay(); showToast('Back to today');
  });

  // ====== 動態渲染飲水格 ======
  function renderWaterGrid() {
    const grid = document.getElementById('waterGrid');
    const slots = FitnessConfig.getWater();
    grid.innerHTML = '';
    for (const s of slots) {
      const btn = document.createElement('div');
      btn.className = 'water-btn';
      btn.dataset.water = s.id;
      btn.innerHTML = `<span class="emoji">${s.emoji}</span><span class="label">${s.label}</span><span class="amount">${s.ml}ml</span><span class="check-mark">\u2714</span>`;
      grid.appendChild(btn);
    }
  }

  // ====== 動態渲染任務清單 ======
  function renderTaskList() {
    const list = document.getElementById('taskList');
    const defs = FitnessConfig.getTasks();
    list.innerHTML = '';
    for (const t of defs) {
      const item = document.createElement('div');
      item.className = 'task-item';
      item.dataset.task = t.id;
      item.innerHTML = `<div class="task-check"></div><div class="task-label">${t.label}</div>`;
      list.appendChild(item);
    }
  }

  // ====== 載入某天的資料到 UI ======
  function loadDay() {
    updateDateDisplay();
    renderWaterGrid();
    renderTaskList();

    const ds = dateStr(currentDate);
    const data = FitnessData.get(ds);

    // 飲水按鈕狀態
    document.querySelectorAll('.water-btn').forEach(btn => {
      const key = btn.dataset.water;
      btn.classList.toggle('done', !!data.water[key]);
    });
    updateWaterProgress(data);

    // 任務狀態
    document.querySelectorAll('.task-item').forEach(item => {
      const key = item.dataset.task;
      item.classList.toggle('done', !!data.tasks[key]);
      item.querySelector('.task-check').textContent = data.tasks[key] ? '\u2713' : '';
    });

    // 數據輸入
    document.querySelectorAll('.metric-input').forEach(input => {
      const key = input.dataset.metric;
      input.value = data.metrics[key] !== null ? data.metrics[key] : '';
    });

    updateCompletionRing(data);
  }

  // ====== 飲水按鈕點擊 ======
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
      const slot = FitnessConfig.getWater().find(s => s.id === key);
      showToast(`+${slot ? slot.ml : '?'}ml`);
    }
  });

  function updateWaterProgress(data) {
    const ml = FitnessData.getWaterMl(data.water);
    const target = FitnessConfig.getWaterTarget();
    const pct = target > 0 ? Math.min(100, (ml / target) * 100) : 0;
    document.getElementById('waterBar').style.width = pct + '%';
    document.getElementById('waterText').textContent = `${ml} / ${target} ml`;
  }

  // ====== 任務打勾 ======
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

  // ====== 數據輸入 ======
  document.querySelectorAll('.metric-input').forEach(input => {
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const key = input.dataset.metric;
        const ds = dateStr(currentDate);
        const data = FitnessData.get(ds);
        data.metrics[key] = input.value === '' ? null : parseFloat(input.value);
        FitnessData.save(ds, data);
        updateCompletionRing(data);
      }, 500);
    });
  });

  // ====== 完成環 ======
  function updateCompletionRing(data) {
    const waterSlots = FitnessConfig.getWater();
    const taskDefs = FitnessConfig.getTasks();
    const waterDone = waterSlots.filter(s => data.water[s.id]).length;
    const waterTotal = waterSlots.length;
    const waterMl = FitnessData.getWaterMl(data.water);
    const waterTarget = FitnessConfig.getWaterTarget();
    const taskDone = taskDefs.filter(t => data.tasks[t.id]).length;
    const taskTotal = taskDefs.length;
    const metricsDone = Object.values(data.metrics).filter(v => v !== null).length;
    const metricsTotal = Object.keys(data.metrics).length;

    const allDone = waterDone + taskDone + metricsDone;
    const allTotal = waterTotal + taskTotal + metricsTotal;
    const pct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

    const circle = document.getElementById('ringCircle');
    const circumference = 2 * Math.PI * 42;
    circle.style.strokeDashoffset = circumference * (1 - pct / 100);

    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : 'var(--accent)';
    circle.style.stroke = color;
    document.getElementById('ringPct').style.color = color;
    document.getElementById('ringPct').textContent = pct + '%';
    document.getElementById('legendWater').textContent = `Water: ${waterMl}/${waterTarget}ml`;
    document.getElementById('legendTasks').textContent = `Tasks: ${taskDone}/${taskTotal}`;
    document.getElementById('legendMetrics').textContent = `Data: ${metricsDone}/${metricsTotal}`;
  }

  // ====== Tab 切換 ======
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(target).classList.add('active');
      if (target === 'tabStats') refreshCharts();
      if (target === 'tabSettings') { renderCustomizeUI(); updateDataInfo(); }
    });
  });

  // ====== 統計 ======
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
    FitnessCharts.renderAll(FitnessData.getRange(dateStr(start), dateStr(end)));
  }

  // ====== 自訂 UI：渲染 Settings 裡的列表 ======
  function renderCustomizeUI() {
    renderCustomWater();
    renderCustomTasks();
  }

  function renderCustomWater() {
    const container = document.getElementById('customWaterList');
    const slots = FitnessConfig.getWater();
    container.innerHTML = '';
    for (const s of slots) {
      const row = document.createElement('div');
      row.className = 'custom-item';
      row.innerHTML = `
        <span class="custom-emoji">${s.emoji}</span>
        <span class="custom-label">${s.label}</span>
        <span class="custom-value">${s.ml}ml</span>
        <button class="custom-edit" data-id="${s.id}" data-type="water">&#x270E;</button>
        <button class="custom-del" data-id="${s.id}" data-type="water">&times;</button>
      `;
      container.appendChild(row);
    }
    // 綁定事件
    container.querySelectorAll('.custom-del').forEach(btn => {
      btn.addEventListener('click', () => deleteCustomItem('water', btn.dataset.id));
    });
    container.querySelectorAll('.custom-edit').forEach(btn => {
      btn.addEventListener('click', () => editWaterSlot(btn.dataset.id));
    });
  }

  function renderCustomTasks() {
    const container = document.getElementById('customTaskList');
    const defs = FitnessConfig.getTasks();
    container.innerHTML = '';
    for (const t of defs) {
      const row = document.createElement('div');
      row.className = 'custom-item';
      row.innerHTML = `
        <span class="custom-label" style="flex:1">${t.label}</span>
        <button class="custom-edit" data-id="${t.id}" data-type="task">&#x270E;</button>
        <button class="custom-del" data-id="${t.id}" data-type="task">&times;</button>
      `;
      container.appendChild(row);
    }
    container.querySelectorAll('.custom-del').forEach(btn => {
      btn.addEventListener('click', () => deleteCustomItem('task', btn.dataset.id));
    });
    container.querySelectorAll('.custom-edit').forEach(btn => {
      btn.addEventListener('click', () => editTask(btn.dataset.id));
    });
  }

  // ====== 刪除項目 ======
  function deleteCustomItem(type, id) {
    if (type === 'water') {
      const slots = FitnessConfig.getWater().filter(s => s.id !== id);
      FitnessConfig.saveWater(slots);
    } else {
      const tasks = FitnessConfig.getTasks().filter(t => t.id !== id);
      FitnessConfig.saveTasks(tasks);
    }
    renderCustomizeUI();
    showToast('Deleted');
  }

  // ====== 新增飲水格 ======
  document.getElementById('btnAddWater').addEventListener('click', () => {
    showInputModal('Add Water Slot', [
      { key: 'emoji', label: 'Emoji', placeholder: '\uD83D\uDCA7', type: 'text' },
      { key: 'label', label: 'Name', placeholder: 'e.g. 下午茶', type: 'text' },
      { key: 'ml', label: 'Amount (ml)', placeholder: '500', type: 'number' },
    ], (values) => {
      if (!values.label || !values.ml) return showToast('Please fill in all fields');
      const slots = FitnessConfig.getWater();
      slots.push({
        id: FitnessConfig.newId(),
        emoji: values.emoji || '\uD83D\uDCA7',
        label: values.label,
        ml: parseInt(values.ml) || 500,
      });
      FitnessConfig.saveWater(slots);
      renderCustomizeUI();
      showToast('Added!');
    });
  });

  // ====== 新增任務 ======
  document.getElementById('btnAddTask').addEventListener('click', () => {
    showInputModal('Add Task', [
      { key: 'label', label: 'Task Name', placeholder: 'e.g. 伸展 10 分鐘', type: 'text' },
    ], (values) => {
      if (!values.label) return showToast('Please enter a task name');
      const tasks = FitnessConfig.getTasks();
      tasks.push({ id: FitnessConfig.newId(), label: values.label });
      FitnessConfig.saveTasks(tasks);
      renderCustomizeUI();
      showToast('Added!');
    });
  });

  // ====== 編輯飲水格 ======
  function editWaterSlot(id) {
    const slots = FitnessConfig.getWater();
    const slot = slots.find(s => s.id === id);
    if (!slot) return;
    showInputModal('Edit Water Slot', [
      { key: 'emoji', label: 'Emoji', placeholder: '\uD83D\uDCA7', type: 'text', value: slot.emoji },
      { key: 'label', label: 'Name', placeholder: 'Name', type: 'text', value: slot.label },
      { key: 'ml', label: 'Amount (ml)', placeholder: '500', type: 'number', value: slot.ml },
    ], (values) => {
      if (!values.label || !values.ml) return showToast('Please fill in all fields');
      slot.emoji = values.emoji || '\uD83D\uDCA7';
      slot.label = values.label;
      slot.ml = parseInt(values.ml) || 500;
      FitnessConfig.saveWater(slots);
      renderCustomizeUI();
      showToast('Updated!');
    });
  }

  // ====== 編輯任務 ======
  function editTask(id) {
    const tasks = FitnessConfig.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    showInputModal('Edit Task', [
      { key: 'label', label: 'Task Name', placeholder: 'Task', type: 'text', value: task.label },
    ], (values) => {
      if (!values.label) return showToast('Please enter a task name');
      task.label = values.label;
      FitnessConfig.saveTasks(tasks);
      renderCustomizeUI();
      showToast('Updated!');
    });
  }

  // ====== Reset 按鈕 ======
  document.getElementById('btnResetWater').addEventListener('click', () => {
    showModal('Reset Water', 'Reset water slots to default?', () => {
      FitnessConfig.resetWater();
      renderCustomizeUI();
      showToast('Water slots reset');
    });
  });
  document.getElementById('btnResetTasks').addEventListener('click', () => {
    showModal('Reset Tasks', 'Reset tasks to default?', () => {
      FitnessConfig.resetTasks();
      renderCustomizeUI();
      showToast('Tasks reset');
    });
  });

  // ====== 設定頁功能 ======
  document.getElementById('btnExportTSV').addEventListener('click', () => {
    const tsv = FitnessData.exportTSV();
    if (!tsv) return showToast('No data to export');
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('TSV copied! Paste to Google Sheets');
    }).catch(() => {
      downloadFile('fitness-data.tsv', tsv, 'text/tab-separated-values');
      showToast('TSV downloaded');
    });
  });

  document.getElementById('btnExportJSON').addEventListener('click', () => {
    downloadFile('fitness-data.json', FitnessData.exportJSON(), 'application/json');
    showToast('JSON downloaded');
  });

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
      } catch (err) { showToast('Import failed: invalid JSON'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btnClearAll').addEventListener('click', () => {
    showModal('Clear All Data', 'Delete all tracking data? This cannot be undone.', () => {
      const count = FitnessData.clearAll();
      showToast(`Cleared ${count} days`);
      loadDay();
    });
  });

  function updateDataInfo() {
    const dates = FitnessData.getAllDates();
    document.getElementById('dataInfo').textContent = dates.length === 0
      ? 'No data yet'
      : `${dates.length} days recorded (${dates[0]} ~ ${dates[dates.length - 1]})`;
  }

  // ====== 工具函式 ======
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

  function showInputModal(title, fields, onSubmit) {
    document.getElementById('inputModalTitle').textContent = title;
    const container = document.getElementById('inputModalFields');
    container.innerHTML = '';
    for (const f of fields) {
      const row = document.createElement('div');
      row.className = 'input-modal-row';
      row.innerHTML = `<label>${f.label}</label><input type="${f.type}" placeholder="${f.placeholder}" data-key="${f.key}" value="${f.value || ''}" class="input-modal-field">`;
      container.appendChild(row);
    }
    document.getElementById('inputModal').classList.add('show');
    // 自動 focus 第一個欄位
    const firstInput = container.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);

    const okBtn = document.getElementById('inputModalOk');
    const cancelBtn = document.getElementById('inputModalCancel');
    function cleanup() {
      document.getElementById('inputModal').classList.remove('show');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    }
    function onOk() {
      const values = {};
      container.querySelectorAll('input').forEach(inp => {
        values[inp.dataset.key] = inp.value.trim();
      });
      cleanup();
      onSubmit(values);
    }
    function onCancel() { cleanup(); }
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  }

  function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // ====== 初始化 ======
  loadDay();
})();
