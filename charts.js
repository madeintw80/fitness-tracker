// charts.js — 統計圖表（使用 Chart.js）

const FitnessCharts = {
  instances: {},

  // Chart.js 全域設定
  init() {
    Chart.defaults.color = '#8888a0';
    Chart.defaults.borderColor = '#2a2a3a';
    Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.display = false;
  },

  // 銷毀舊圖表再重建
  destroy(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  },

  // 格式化日期標籤 "MM/DD"
  formatLabels(dataArr) {
    return dataArr.map(d => {
      const parts = d.date.split('-');
      return `${parts[1]}/${parts[2]}`;
    });
  },

  // 繪製所有圖表
  renderAll(dataArr) {
    this.init();
    const labels = this.formatLabels(dataArr);
    this.renderCompletion(labels, dataArr);
    this.renderWeight(labels, dataArr);
    this.renderWater(labels, dataArr);
    this.renderNutrition(labels, dataArr);
    this.renderSteps(labels, dataArr);
    this.updateSummary(dataArr);
  },

  // 任務完成率（長條圖）
  renderCompletion(labels, dataArr) {
    this.destroy('completion');
    const ctx = document.getElementById('chartCompletion');
    if (!ctx) return;

    const values = dataArr.map(d => {
      const { done, total } = FitnessData.getTaskCount(d.tasks);
      return Math.round((done / total) * 100);
    });

    this.instances.completion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map(v => v >= 80 ? '#66bb6a' : v >= 50 ? '#ffa726' : '#ef5350'),
          borderRadius: 4,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0, max: 100,
            ticks: { callback: v => v + '%' },
            grid: { color: '#1a1a24' },
          },
          x: { grid: { display: false } },
        },
        plugins: {
          tooltip: {
            callbacks: { label: ctx => ctx.parsed.y + '% completed' },
          },
        },
      },
    });
  },

  // 體重趨勢（折線圖）
  renderWeight(labels, dataArr) {
    this.destroy('weight');
    const ctx = document.getElementById('chartWeight');
    if (!ctx) return;

    const values = dataArr.map(d => d.metrics.weight);

    this.instances.weight = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#ab47bc',
          backgroundColor: 'rgba(171, 71, 188, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#ab47bc',
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: { color: '#1a1a24' },
            ticks: { callback: v => v + 'kg' },
          },
          x: { grid: { display: false } },
        },
        plugins: {
          tooltip: {
            callbacks: { label: ctx => ctx.parsed.y !== null ? ctx.parsed.y + ' kg' : 'No data' },
          },
        },
      },
    });
  },

  // 飲水量（長條圖 + 目標線）
  renderWater(labels, dataArr) {
    this.destroy('water');
    const ctx = document.getElementById('chartWater');
    if (!ctx) return;

    const values = dataArr.map(d => FitnessData.getWaterMl(d.water));

    this.instances.water = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: values.map(v => v >= 3500 ? '#29b6f6' : '#1a2a3a'),
          borderColor: values.map(v => v >= 3500 ? '#29b6f6' : '#29b6f6'),
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0, max: 4000,
            grid: { color: '#1a1a24' },
            ticks: { callback: v => (v / 1000).toFixed(1) + 'L' },
          },
          x: { grid: { display: false } },
        },
        plugins: {
          annotation: false,
          tooltip: {
            callbacks: { label: ctx => ctx.parsed.y + ' ml' },
          },
        },
      },
      plugins: [{
        // 畫 3500ml 目標線
        afterDraw(chart) {
          const yScale = chart.scales.y;
          const y = yScale.getPixelForValue(3500);
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = '#ef5350';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, y);
          ctx.lineTo(chart.chartArea.right, y);
          ctx.stroke();
          ctx.fillStyle = '#ef5350';
          ctx.font = '10px sans-serif';
          ctx.fillText('3500ml', chart.chartArea.right - 45, y - 5);
          ctx.restore();
        },
      }],
    });
  },

  // 熱量 & 蛋白質（雙軸折線圖）
  renderNutrition(labels, dataArr) {
    this.destroy('nutrition');
    const ctx = document.getElementById('chartNutrition');
    if (!ctx) return;

    this.instances.nutrition = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Calories',
            data: dataArr.map(d => d.metrics.calories),
            borderColor: '#ffa726',
            backgroundColor: 'rgba(255, 167, 38, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'yCal',
            pointRadius: 3,
            spanGaps: true,
          },
          {
            label: 'Protein',
            data: dataArr.map(d => d.metrics.protein),
            borderColor: '#66bb6a',
            backgroundColor: 'rgba(102, 187, 106, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'yPro',
            pointRadius: 3,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 12 } },
        },
        scales: {
          yCal: {
            position: 'left',
            grid: { color: '#1a1a24' },
            ticks: { callback: v => v + 'cal' },
          },
          yPro: {
            position: 'right',
            grid: { display: false },
            ticks: { callback: v => v + 'g' },
          },
          x: { grid: { display: false } },
        },
      },
      plugins: [{
        // 畫 2000cal 和 150g 目標線
        afterDraw(chart) {
          const ctx = chart.ctx;
          const yCal = chart.scales.yCal;
          const yPro = chart.scales.yPro;
          ctx.save();
          ctx.setLineDash([5, 3]);
          ctx.lineWidth = 1;
          // 2000 cal 線
          const calY = yCal.getPixelForValue(2000);
          if (calY >= chart.chartArea.top && calY <= chart.chartArea.bottom) {
            ctx.strokeStyle = '#ffa726';
            ctx.beginPath();
            ctx.moveTo(chart.chartArea.left, calY);
            ctx.lineTo(chart.chartArea.right, calY);
            ctx.stroke();
          }
          // 150g 蛋白質線
          const proY = yPro.getPixelForValue(150);
          if (proY >= chart.chartArea.top && proY <= chart.chartArea.bottom) {
            ctx.strokeStyle = '#66bb6a';
            ctx.beginPath();
            ctx.moveTo(chart.chartArea.left, proY);
            ctx.lineTo(chart.chartArea.right, proY);
            ctx.stroke();
          }
          ctx.restore();
        },
      }],
    });
  },

  // 步數趨勢（折線圖 + 12000 目標線）
  renderSteps(labels, dataArr) {
    this.destroy('steps');
    const ctx = document.getElementById('chartSteps');
    if (!ctx) return;

    const values = dataArr.map(d => d.metrics.steps);

    this.instances.steps = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: '#4fc3f7',
          backgroundColor: 'rgba(79, 195, 247, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#4fc3f7',
          spanGaps: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            grid: { color: '#1a1a24' },
            ticks: { callback: v => (v / 1000).toFixed(0) + 'k' },
          },
          x: { grid: { display: false } },
        },
      },
      plugins: [{
        afterDraw(chart) {
          const yScale = chart.scales.y;
          const y = yScale.getPixelForValue(12000);
          const ctx = chart.ctx;
          ctx.save();
          ctx.strokeStyle = '#ef5350';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(chart.chartArea.left, y);
          ctx.lineTo(chart.chartArea.right, y);
          ctx.stroke();
          ctx.fillStyle = '#ef5350';
          ctx.font = '10px sans-serif';
          ctx.fillText('12k', chart.chartArea.right - 25, y - 5);
          ctx.restore();
        },
      }],
    });
  },

  // 更新摘要數字
  updateSummary(dataArr) {
    // 只看有資料的天數
    const daysWithData = dataArr.filter(d =>
      Object.values(d.tasks).some(v => v) ||
      Object.values(d.water).some(v => v) ||
      Object.values(d.metrics).some(v => v !== null)
    );

    // 平均完成率
    if (daysWithData.length > 0) {
      const avgRate = daysWithData.reduce((sum, d) => {
        const { done, total } = FitnessData.getTaskCount(d.tasks);
        return sum + (done / total);
      }, 0) / daysWithData.length;
      document.getElementById('statRate').textContent = Math.round(avgRate * 100) + '%';
    } else {
      document.getElementById('statRate').textContent = '--%';
    }

    // 飲水達標天數
    const waterDays = daysWithData.filter(d => FitnessData.getWaterMl(d.water) >= 3500).length;
    document.getElementById('statWater').textContent = waterDays + '/' + daysWithData.length;

    // 最新體重
    const weights = dataArr.map(d => d.metrics.weight).filter(w => w !== null);
    document.getElementById('statWeight').textContent = weights.length > 0
      ? weights[weights.length - 1].toFixed(1)
      : '--';

    // 平均步數
    const steps = daysWithData.map(d => d.metrics.steps).filter(s => s !== null);
    document.getElementById('statSteps').textContent = steps.length > 0
      ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length).toLocaleString()
      : '--';
  },
};
