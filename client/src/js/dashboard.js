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
  
  if (!ctx) {
    console.warn('Không tìm thấy element categoryChart');
    return;
  }

  console.log('📊 Dữ liệu biểu đồ danh mục:', data);

  // Lọc chỉ lấy dữ liệu chi tiêu (expense)
  const expenseData = Array.isArray(data) ? data.filter(d => d.type === 'expense') : [];
  
  console.log('📊 Dữ liệu chi tiêu đã lọc:', expenseData);
  
  if (!expenseData || expenseData.length === 0) {
    console.log('⚠️ Không có dữ liệu chi tiêu để vẽ biểu đồ');
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

  console.log('📊 Labels:', labels);
  console.log('📊 Values:', values);

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }
  
  try {
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
    console.log('✅ Biểu đồ danh mục đã được vẽ thành công');
  } catch (error) {
    console.error('❌ Lỗi khi vẽ biểu đồ danh mục:', error);
  }
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

// Hàm tính toán thống kê từ danh sách giao dịch (client-side)
function calculateStatsFromTransactions(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { by_category: [], by_month: [] };
  }

  // Tính theo danh mục (chỉ lấy expense)
  const categoryMap = {};
  transactions.forEach(tx => {
    if (tx.type === 'expense' && tx.category_name) {
      const catName = tx.category_name;
      if (!categoryMap[catName]) {
        categoryMap[catName] = { category: catName, type: 'expense', total: 0 };
      }
      categoryMap[catName].total += Number(tx.amount) || 0;
    }
  });
  const by_category = Object.values(categoryMap);

  // Tính theo tháng
  const monthMap = {};
  transactions.forEach(tx => {
    if (tx.transaction_date) {
      const date = new Date(tx.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: monthKey, income: 0, expense: 0 };
      }
      if (tx.type === 'income') {
        monthMap[monthKey].income += Number(tx.amount) || 0;
      } else {
        monthMap[monthKey].expense += Number(tx.amount) || 0;
      }
    }
  });
  const by_month = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  return { by_category, by_month };
}

// Hàm làm mới dữ liệu dashboard
async function refreshDashboard(user_id) {
  console.log('🔄 Đang làm mới dashboard cho user_id:', user_id);
  
  // Lấy số dư và cập nhật tổng quan
  const balanceData = await fetchBalance(user_id);
  if (balanceData) {
    console.log('💰 Dữ liệu số dư:', balanceData);
    updateStatsOverview(balanceData);
  } else {
    console.warn('⚠️ Không lấy được dữ liệu số dư');
  }

  // Lấy thống kê và vẽ biểu đồ
  let stats = await fetchStats(user_id);
  console.log('📈 Dữ liệu thống kê từ API:', stats);
  
  // Nếu API không trả về dữ liệu, thử tính từ danh sách giao dịch
  if (!stats || (!stats.by_category && !stats.by_month)) {
    console.log('⚠️ API không trả về stats, thử tính từ danh sách giao dịch...');
    try {
      const transactions = await window.loadTransactionsForUser?.(user_id);
      if (transactions && transactions.length > 0) {
        console.log('📋 Tìm thấy', transactions.length, 'giao dịch, tính toán stats client-side...');
        stats = calculateStatsFromTransactions(transactions);
        console.log('📊 Stats tính từ giao dịch:', stats);
      }
    } catch (err) {
      console.error('❌ Lỗi khi tính stats từ giao dịch:', err);
    }
  }
  
  if (stats) {
    // Vẽ biểu đồ danh mục
    if (stats.by_category && Array.isArray(stats.by_category) && stats.by_category.length > 0) {
      console.log('📊 Có', stats.by_category.length, 'danh mục để vẽ');
      renderCategoryChart(stats.by_category);
    } else {
      console.warn('⚠️ Không có dữ liệu by_category hoặc không phải array');
      renderCategoryChart([]);
    }
    
    // Vẽ biểu đồ theo tháng
    if (stats.by_month && Array.isArray(stats.by_month) && stats.by_month.length > 0) {
      console.log('📅 Có', stats.by_month.length, 'tháng để vẽ');
      renderMonthlyChart(stats.by_month);
    } else {
      console.warn('⚠️ Không có dữ liệu by_month hoặc không phải array');
      renderMonthlyChart([]);
    }
  } else {
    console.warn('⚠️ Không lấy được dữ liệu thống kê từ API và không tính được từ giao dịch');
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

// Hàm test để kiểm tra biểu đồ có hoạt động không
window.testChart = function() {
  console.log('🧪 Test biểu đồ...');
  const ctx = document.getElementById('categoryChart');
  if (!ctx) {
    console.error('❌ Không tìm thấy canvas categoryChart');
    return false;
  }
  
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js chưa được load!');
    return false;
  }
  
  console.log('✅ Chart.js đã được load');
  console.log('✅ Canvas element tồn tại');
  
  // Test vẽ biểu đồ với dữ liệu mẫu
  const testData = [
    { category: 'Ăn uống', type: 'expense', total: 500000 },
    { category: 'Mua sắm', type: 'expense', total: 300000 },
    { category: 'Giải trí', type: 'expense', total: 200000 }
  ];
  
  console.log('🧪 Vẽ biểu đồ test với dữ liệu:', testData);
  renderCategoryChart(testData);
  console.log('✅ Nếu bạn thấy biểu đồ tròn với 3 phần (Ăn uống, Mua sắm, Giải trí) thì biểu đồ hoạt động tốt!');
  return true;
};
