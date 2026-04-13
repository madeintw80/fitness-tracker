// data.js — localStorage 資料管理
// 每天的資料用日期字串 "YYYY-MM-DD" 當 key

const FitnessData = {
  // 取得指定日期的資料，沒有就回傳預設空白
  get(dateStr) {
    const raw = localStorage.getItem(`fitness_${dateStr}`);
    if (raw) return JSON.parse(raw);
    return this.blank(dateStr);
  },

  // 空白的一天資料結構
  blank(dateStr) {
    return {
      date: dateStr,
      // 飲水：6 個時段，true = 已喝
      water: {
        wakeup: false,    // 起床 500ml
        gym: false,       // 重訓 500ml
        trading: false,   // 看盤 1000ml
        run: false,       // 跑步 500ml
        dinner: false,    // 晚餐前 500ml
        other: false,     // 其餘 500ml
      },
      // 任務清單：true = 已完成
      tasks: {
        gym: false,       // 07:00 重訓 50 分鐘
        fasting: false,   // 08:30-13:45 禁食看盤
        cardio: false,    // 16:00-18:00 有氧
        calories: false,  // 熱量 ≤ 2000 大卡
        protein: false,   // 蛋白質 ≥ 150g
        clean: false,     // 無含糖飲料/油炸/宵夜
        sleep: false,     // 12 點前睡覺
      },
      // 數據輸入
      metrics: {
        weight: null,     // 體重 kg
        calories: null,   // 總熱量 kcal
        protein: null,    // 蛋白質 g
        steps: null,      // 步數
        sleepHours: null,  // 睡眠時數
      },
    };
  },

  // 儲存指定日期的資料
  save(dateStr, data) {
    localStorage.setItem(`fitness_${dateStr}`, JSON.stringify(data));
  },

  // 計算飲水量 (ml)
  getWaterMl(waterObj) {
    const amounts = {
      wakeup: 500,
      gym: 500,
      trading: 1000,
      run: 500,
      dinner: 500,
      other: 500,
    };
    let total = 0;
    for (const [key, done] of Object.entries(waterObj)) {
      if (done) total += amounts[key];
    }
    return total;
  },

  // 計算任務完成數
  getTaskCount(tasksObj) {
    const done = Object.values(tasksObj).filter(v => v).length;
    const total = Object.keys(tasksObj).length;
    return { done, total };
  },

  // 取得日期範圍內的所有資料（用於統計）
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
      if (key.startsWith('fitness_')) {
        dates.push(key.replace('fitness_', ''));
      }
    }
    return dates.sort();
  },

  // 匯出全部資料為 JSON
  exportJSON() {
    const dates = this.getAllDates();
    const data = {};
    for (const d of dates) {
      data[d] = this.get(d);
    }
    return JSON.stringify(data, null, 2);
  },

  // 匯入 JSON 資料
  importJSON(jsonStr) {
    const data = JSON.parse(jsonStr);
    let count = 0;
    for (const [dateStr, dayData] of Object.entries(data)) {
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        this.save(dateStr, dayData);
        count++;
      }
    }
    return count;
  },

  // 匯出 TSV（給 Google Sheets 貼上）
  exportTSV() {
    const dates = this.getAllDates();
    if (dates.length === 0) return '';

    const waterLabels = { wakeup: '起床', gym: '重訓', trading: '看盤', run: '跑步', dinner: '晚餐前', other: '其餘' };
    const taskLabels = { gym: '重訓', fasting: '禁食', cardio: '有氧', calories: '熱量達標', protein: '蛋白質達標', clean: '飲食乾淨', sleep: '早睡' };

    // 表頭
    const headers = [
      '日期',
      ...Object.values(waterLabels).map(l => `飲水_${l}`),
      '飲水量(ml)',
      ...Object.values(taskLabels).map(l => `任務_${l}`),
      '任務完成數',
      '體重(kg)', '熱量(kcal)', '蛋白質(g)', '步數', '睡眠(hr)',
    ];

    const rows = [headers.join('\t')];
    for (const dateStr of dates) {
      const d = this.get(dateStr);
      const row = [
        dateStr,
        ...Object.keys(waterLabels).map(k => d.water[k] ? '1' : '0'),
        this.getWaterMl(d.water),
        ...Object.keys(taskLabels).map(k => d.tasks[k] ? '1' : '0'),
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

  // 清除所有資料
  clearAll() {
    const dates = this.getAllDates();
    for (const d of dates) {
      localStorage.removeItem(`fitness_${d}`);
    }
    return dates.length;
  },
};
