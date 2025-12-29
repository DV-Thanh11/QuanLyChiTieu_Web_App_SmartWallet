const API_URL = "http://127.0.0.1:5000/api/savings";

const CURRENT_USER_ID = localStorage.getItem("user_id");

if (!CURRENT_USER_ID) {
    alert("Bạn chưa đăng nhập! Vui lòng quay lại trang đăng nhập.");
    window.location.href = "login.html"; // Chuyển hướng về trang đăng nhập
}

const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// 1. Load danh sách
async function loadSavings() {
    const container = document.getElementById('savingsList');
    try {
        const response = await fetch(`${API_URL}?user_id=${CURRENT_USER_ID}`);
        if (!response.ok) throw new Error("Lỗi kết nối API");
        const goals = await response.json();
        renderGoals(goals);
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger">❌ Lỗi: ${error.message}</div>`;
    }
}

// 2. Render giao diện
function renderGoals(goals) {
    const container = document.getElementById('savingsList');
    if (!goals || goals.length === 0) {
        container.innerHTML = `<div class="text-center text-muted p-4">Chưa có mục tiêu nào.</div>`;
        return;
    }

    let htmlContent = '<div class="row">';
    goals.forEach(goal => {
        const current = parseFloat(goal.current_amount) || 0;
        const target = parseFloat(goal.target_amount) || 1;
        let percent = (current / target) * 100;
        if(percent > 100) percent = 100;

        htmlContent += `
        <div class="col-md-6 mb-3">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h5 class="card-title fw-bold">${goal.name}</h5>
                        <span class="badge bg-${percent >= 100 ? 'success' : 'primary'}">${percent.toFixed(1)}%</span>
                    </div>
                    <small class="text-muted">Hạn: ${goal.deadline || 'Không có'}</small>

                    <div class="progress my-2" style="height: 10px;">
                        <div class="progress-bar bg-success" style="width: ${percent}%"></div>
                    </div>

                    <div class="d-flex justify-content-between fw-bold">
                        <span>${formatMoney(current)}</span>
                        <span>${formatMoney(target)}</span>
                    </div>

                    <div class="mt-3 text-end">
                        <button class="btn btn-sm btn-outline-success me-2" onclick="openDepositModal(${goal.goal_id})">
                            <i class="fas fa-plus"></i> Nạp tiền
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteGoal(${goal.goal_id})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });
    htmlContent += '</div>';
    container.innerHTML = htmlContent;
}

// 3. Xử lý Thêm mới
const form = document.getElementById('savingForm');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            user_id: CURRENT_USER_ID,
            name: document.getElementById('goalName').value,
            target_amount: document.getElementById('targetAmount').value,
            current_amount: document.getElementById('currentAmount').value,
            deadline: document.getElementById('deadline').value
        };

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if(res.ok) {
            alert("Đã lưu thành công!");
            form.reset();
            loadSavings();
        } else {
            alert("Lỗi thêm mới");
        }
    });
}

// 4. Logic Nạp tiền
function openDepositModal(goalId) {
    document.getElementById('depositGoalId').value = goalId;
    document.getElementById('depositAmount').value = '';
    const myModal = new bootstrap.Modal(document.getElementById('depositModal'));
    myModal.show();
}

const depositForm = document.getElementById('depositForm');
if (depositForm) {
    depositForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const goalId = document.getElementById('depositGoalId').value;
        const amount = document.getElementById('depositAmount').value;
        const categoryId = document.getElementById('depositCategory').value;

        // Ẩn modal
        const modalEl = document.getElementById('depositModal');
        bootstrap.Modal.getInstance(modalEl).hide();

        const res = await fetch(`${API_URL}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: CURRENT_USER_ID,
                goal_id: goalId,
                amount: amount,
                category_id: categoryId 
            })
        });

        const data = await res.json();
        if (res.ok) {
            alert("✅ " + data.message);
            loadSavings();
        } else {
            alert("❌ Lỗi: " + data.error);
        }
    });
}

// 5. Logic Xóa
async function deleteGoal(id) {
    if(confirm("Bạn có chắc chắn xóa?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadSavings();
    }
}

document.addEventListener('DOMContentLoaded', loadSavings);