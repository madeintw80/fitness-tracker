// data.js — localStorage 資料管理
// config（飲水格/任務定義）和每日資料分開存

// ====== 預設設定 ======
const DEFAULT_WATER = [
  { id: 'wakeup',  emoji: '\u2600', label: '起床',   ml: 500  },
  { id: 'gym',     emoji: '\uD83D\uDCAA', label: '重訓',   ml: 500  },
  { id: 'trading', emoji: '\uD83D\uDCC8', label: '看盤',   ml: 1000 },
  { id: 'run',     emoji: '\uD83C\uDFC3', label: '跑步',   ml: 500  },
  { id: 'dinner',  emoji: '\uD83C\uDF5C', label: '晚餐前', ml: 500  },
  { id: 'other',   emoji: '\uD83D\uDCA7', label: '其餘',   ml: 500  },
];

const DEFAULT_TASKS = [
  { id: 'gym',      label: '重訓 50 分鐘' },
  { id: 'cardio',   label: '有氧 HR\u2265130' },
  { id: 'calories', label: '熱量 \u2264 2000 大卡' },
  { id: 'protein',  label: '蛋白質 \u2265 150g' },
  { id: 'clean',    label: '無含糖飲料/油炸/宵夜' },
  { id: 'sleep',    label: '12 點前睡覺' },
];

// ====== Config 管理 ======
const FitnessConfig = {
  // 取得飲水格設定
  getWater() {
    const raw = localStorage.getItem('fitness_config_water');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_WATER));
  },

  // 儲存飲水格設定
  saveWater(slots) {
    localStorage.setItem('fitness_config_water', JSON.stringify(slots));
  },

  // 取得任務設定
  getTasks() {
    const raw = localStorage.getItem('fitness_config_tasks');
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_TASKS));
  },

  // 儲存任務設定
  saveTasks(tasks) {
    localStorage.setItem('fitness_config_tasks', JSON.stringify(tasks));
  },

  // 產生唯一 ID（新增用）
  newId() {
    return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  },

  // 重設為預設
  resetWater() {
    localStorage.removeItem('fitness_config_water');
  },

  resetTasks() {
    localStorage.removeItem('fitness_config_tasks');
  },

  // 計算飲水目標總量
  getWaterTarget() {
    return this.getWater().reduce((sum, s) => sum + s.ml, 0);
  },
};

// ====== 每日資料管理 ======
const FitnessData = {
  // 取得指定日期的資料，沒有就回傳空白
  get(dateStr) {
    const raw = localStorage.getItem(`fitness_${dateStr}`);
    if (raw) return JSON.parse(raw);
    return this.blank(dateStr);
  },

  // 空白的一天（根據目前 config 動態產生）
  blank(dateStr) {
    const water = {};
    for (const s of FitnessConfig.getWater()) {
      water[s.id] = false;
    }
    const tasks = {};
    for (const t of FitnessConfig.getTasks()) {
      tasks[t.id] = false;
    }
    return {
      date: dateStr,
      water,
      tasks,
      metrics: {
        weight: null,
        calories: null,
        protein: null,
        steps: null,
        sleepHours: null,
      },
    };
  },

  // 儲存
  save(dateStr, data) {
    localStorage.setItem(`fitness_${dateStr}`, JSON.stringify(data));
  },

  // 計算飲水量（根據 config 的 ml 值）
  getWaterMl(waterObj) {
    const slots = FitnessConfig.getWater();
    let total = 0;
    for (const s of slots) {
      if (waterObj[s.id]) total += s.ml;
    }
    return total;
  },

  // 計算任務完成數（只算 config 中存在的任務）
  getTaskCount(tasksObj) {
    const defs = FitnessConfig.getTasks();
    const ids = defs.map(t => t.id);
    const done = ids.filter(id => tasksObj[id]).length;
    return { done, total: ids.length };
  },

  // 取得日期範圍內的所有資料
  getRange(startDate, endDate) {
    const result = [];
    const d = new Date(startDate);
    const end = new Date(endDate);
    while (d <= end) {
      const dateStr = d.toISOString().slice(0, 10);
      result.push(this.get(dateStr));
      d.setDate(d.getDate() + 1);
    }
    return result;
  },

  // 取得所有已存資料的日期列表
  getAllDates() {
    const dates = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('fitness_') && !key.startsWith('fitness_config')) {
        dates.push(key.replace('fitness_', ''));
      }
    }
    return dates.sort();
  },

  // 匯出全部資料為 JSON（含 config）
  exportJSON() {
    const dates = this.getAllDates();
    const data = { _config: {
      water: FitnessConfig.getWater(),
      tasks: FitnessConfig.getTasks(),
    }};
    for (const d of dates) {
      data[d] = this.get(d);
    }
    return JSON.stringify(data, null, 2);
  },

  // 匯入 JSON 資料（含 config）
  importJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    let count = 0;
    // 匯入 config（如果有的話）
    if (data._config) {
      if (data._config.water) FitnessConfig.saveWater(data._config.water);
      if (data._config.tasks) FitnessConfig.saveTasks(data._config.tasks);
    }
    for (const [dateStr, dayData] of Object.entries(data)) {
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        this.save(dateStr, dayData);
        count++;
      }
    }
    return count;
  },

  // 匯出 TSV
  exportTSV() {
    const dates = this.getAllDates();
    if (dates.length === 0) return '';

    const waterSlots = FitnessConfig.getWater();
    const taskDefs = FitnessConfig.getTasks();

    const headers = [
      '日期',
      ...waterSlots.map(s => `飲水_${s.label}`),
      '飲水量(ml)',
      ...taskDefs.map(t => `任務_${t.label}`),
      '任務完成數',
      '體重(kg)', '熱量(kcal)', '蛋白質(g)', '步數', '睡眠(hr)',
    ];

    const rows = [headers.join('\t')];
    for (const dateStr of dates) {
      const d = this.get(dateStr);
      const row = [
        dateStr,
        ...waterSlots.map(s => d.water[s.id] ? '1' : '0'),
        this.getWaterMl(d.water),
        ...taskDefs.map(t => d.tasks[t.id] ? '1' : '0'),
        this.getTaskCount(d.tasks).done,
        d.metrics.weight ?? '',
        d.metrics.calories ?? '',
        d.metrics.protein ?? '',
        d.metrics.steps ?? '',
        d.metrics.sleepHours ?? '',
      ];
      rows.push(row.join('\t'));
    }
    return rows.join('\n');
  },

  // 清除所有每日資料（不清 config）
  clearAll() {
    const dates = this.getAllDates();
    for (const d of dates) {
      localStorage.removeItem(`fitness_${d}`);
    }
    return dates.length;
  },
};
