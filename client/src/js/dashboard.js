// dashboard.js

const API_BASE_URL = "http://127.0.0.1:5000/api";
let categoryChart = null;
let monthlyChart = null;

async function fetchStats(user_id) {
  const resp = await fetch(`${API_BASE_URL}/transactions/stats?user_id=${user_id}`);
  if (!resp.ok) {
    console.error('Lỗi lấy stats');
    return null;
  }
  return await resp.json();
}

function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  const labels = data.map(d => d.category || 'Khác');
  const values = data.map(d => Number(d.total) || 0);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{ data: values, backgroundColor: labels.map((_,i)=>`hsl(${i*40 % 360} 70% 50%)`) }]
    }
  });
}

function renderMonthlyChart(data) {
  const ctx = document.getElementById('monthlyChart').getContext('2d');
  const labels = data.map(d => d.month);
  const income = data.map(d => Number(d.income) || 0);
  const expense = data.map(d => Number(d.expense) || 0);

  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Thu', data: income, backgroundColor: 'rgba(75, 192, 192, 0.6)' },
        { label: 'Chi', data: expense, backgroundColor: 'rgba(255, 99, 132, 0.6)' }
      ]
    },
    options: { responsive: true }
  });
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

  // Reuse existing helpers from transaction.js if available
  if (typeof updateUIAfterChange === 'function') {
    updateUIAfterChange(user_id);
  }

  // Tải stats và vẽ chart
  const stats = await fetchStats(user_id);
  if (stats && stats.by_category) {
    renderCategoryChart(stats.by_category);
  }
  if (stats && stats.by_month) {
    renderMonthlyChart(stats.by_month);
  }
}

// Khởi tạo sau khi tải DOM
document.addEventListener('DOMContentLoaded', initDashboard);
