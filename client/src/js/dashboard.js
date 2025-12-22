// dashboard.js

const API_BASE_URL = "http://127.0.0.1:5000/api";
let categoryChart = null;
let monthlyChart = null;

// Hàm format tiền tệ
function formatCurrency(amount) {
  const num = Math.abs(Number(amount) || 0);
  return new Intl.NumberFormat("vi-VN").format(num) + "đ";
}

// Lấy thống kê từ API
async function fetchStats(user_id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/transactions/stats?user_id=${user_id}`);
    if (!resp.ok) {
      console.error('Lỗi lấy stats');
      return null;
    }
    return await resp.json();
  } catch (error) {
    console.error('Lỗi kết nối khi lấy stats:', error);
    return null;
  }
}

// Lấy số dư từ API
async function fetchBalance(user_id) {
  try {
    const resp = await fetch(`${API_BASE_URL}/balance?user_id=${user_id}`);
    if (!resp.ok) {
      console.error('Lỗi lấy balance');
      return null;
    }
    return await resp.json();
  } catch (error) {
    console.error('Lỗi kết nối khi lấy balance:', error);
    return null;
  }
}

// Cập nhật phần tổng quan số liệu
function updateStatsOverview(balanceData) {
  const totalIncomeEl = document.getElementById('totalIncome');
  const totalExpenseEl = document.getElementById('totalExpense');
  const mainBalanceEl = document.getElementById('mainBalance');

  if (balanceData) {
    const income = balanceData.income || 0;
    const expense = balanceData.expense || 0;
    const balance = balanceData.balance || 0;

    if (totalIncomeEl) {
      totalIncomeEl.textContent = formatCurrency(income);
    }
    if (totalExpenseEl) {
      totalExpenseEl.textContent = formatCurrency(expense);
    }
    if (mainBalanceEl) {
      mainBalanceEl.textContent = formatCurrency(balance);
      // Đổi màu theo số dư dương/âm
      if (balance >= 0) {
        mainBalanceEl.style.color = '#27ae60';
      } else {
        mainBalanceEl.style.color = '#e74c3c';
      }
    }
  }
}

// Vẽ biểu đồ chi tiêu theo danh mục
function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  const emptyMsg = document.getElementById('categoryChartEmpty');
  
  if (!ctx) return;

  // Lọc chỉ lấy dữ liệu chi tiêu (expense)
  const expenseData = data.filter(d => d.type === 'expense');
  
  if (!expenseData || expenseData.length === 0) {
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }
    ctx.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  ctx.style.display = 'block';
  if (emptyMsg) emptyMsg.style.display = 'none';

  const labels = expenseData.map(d => d.category || 'Khác');
  const values = expenseData.map(d => Number(d.total) || 0);

  if (categoryChart) categoryChart.destroy();
  
  categoryChart = new Chart(ctx.getContext('2d'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#e74c3c',
          '#3498db',
          '#2ecc71',
          '#f39c12',
          '#9b59b6',
          '#1abc9c',
          '#e67e22',
          '#34495e'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              return label + ': ' + formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Vẽ biểu đồ thu/chi theo tháng
function renderMonthlyChart(data) {
  const ctx = document.getElementById('monthlyChart');
  const emptyMsg = document.getElementById('monthlyChartEmpty');
  
  if (!ctx) return;

  if (!data || data.length === 0) {
    if (monthlyChart) {
      monthlyChart.destroy();
      monthlyChart = null;
    }
    ctx.style.display = 'none';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  ctx.style.display = 'block';
  if (emptyMsg) emptyMsg.style.display = 'none';

  const labels = data.map(d => {
    // Format tháng từ YYYY-MM thành MM/YYYY
    const [year, month] = d.month.split('-');
    return `${month}/${year}`;
  });
  const income = data.map(d => Number(d.income) || 0);
  const expense = data.map(d => Number(d.expense) || 0);

  if (monthlyChart) monthlyChart.destroy();
  
  monthlyChart = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Thu nhập',
          data: income,
          backgroundColor: 'rgba(46, 204, 113, 0.7)',
          borderColor: 'rgba(46, 204, 113, 1)',
          borderWidth: 1
        },
        {
          label: 'Chi tiêu',
          data: expense,
          backgroundColor: 'rgba(231, 76, 60, 0.7)',
          borderColor: 'rgba(231, 76, 60, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y || 0;
              return label + ': ' + formatCurrency(value);
            }
          }
        }
      }
    }
  });
}

// Hàm làm mới dữ liệu dashboard
async function refreshDashboard(user_id) {
  // Lấy số dư và cập nhật tổng quan
  const balanceData = await fetchBalance(user_id);
  if (balanceData) {
    updateStatsOverview(balanceData);
  }

  // Lấy thống kê và vẽ biểu đồ
  const stats = await fetchStats(user_id);
  if (stats) {
    if (stats.by_category && stats.by_category.length > 0) {
      renderCategoryChart(stats.by_category);
    } else {
      renderCategoryChart([]);
    }
    
    if (stats.by_month && stats.by_month.length > 0) {
      renderMonthlyChart(stats.by_month);
    } else {
      renderMonthlyChart([]);
    }
  } else {
    // Nếu không có dữ liệu, hiển thị thông báo trống
    renderCategoryChart([]);
    renderMonthlyChart([]);
  }
}

async function initDashboard() {
  const user_id = localStorage.getItem('user_id');
  const user_name = localStorage.getItem('user_name');
  const profileEl = document.getElementById('profileName');
  const logoutBtn = document.getElementById('btnLogout');

  if (!user_id) {
    alert('Vui lòng đăng nhập để xem Dashboard');
    window.location.href = 'index.html';
    return;
  }

  if (profileEl && user_name) profileEl.textContent = user_name;

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        // Gọi API logout (tùy chọn) và xóa localStorage
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
      } catch (e) { /* ignore */ }
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_name');
      window.location.href = 'index.html';
    });
  }

  // Cập nhật UI từ transaction.js (số dư sidebar, thông báo)
  if (typeof updateUIAfterChange === 'function') {
    updateUIAfterChange(user_id);
  }

  // Tải và hiển thị thống kê
  await refreshDashboard(user_id);
}

// Khởi tạo sau khi tải DOM
document.addEventListener('DOMContentLoaded', initDashboard);

// Export hàm refresh để có thể gọi từ transaction.js sau khi thêm giao dịch
window.refreshDashboard = refreshDashboard;
