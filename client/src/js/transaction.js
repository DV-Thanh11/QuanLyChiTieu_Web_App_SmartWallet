// client/src/js/transaction.js
const API_BASE_URL = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('transactionForm');
    const amountInput = document.getElementById('transactionAmount');
    const descriptionInput = document.getElementById('transactionDescription');
    const dateInput = document.getElementById('transactionDate');
    const categorySelect = document.getElementById('transactionCategory');
    const messageDisplay = document.getElementById('transactionMessage');

    const expenseTab = document.getElementById('expense-tab');
    const incomeTab = document.getElementById('income-tab');
    
    // Khởi tạo loại giao dịch mặc định là 'expense'
    let currentType = 'expense'; 
    
    // Hàm hiển thị thông báo
    function showMessage(msg, type) {
        messageDisplay.textContent = msg;
        messageDisplay.style.color = type === 'error' ? 'red' : 'green';
    }
  

// Hàm tải danh mục từ Backend
async function loadCategories(type) {
    const response = await fetch(`${API_BASE_URL}/categories?type=${type}`);

    if (response.ok) {
        const result = await response.json();
        const categories = result.categories;

        // Xóa các tùy chọn cũ
        categorySelect.innerHTML = '<option value="">-- Chọn Danh mục --</option>'; 

        // Thêm các tùy chọn mới
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.category_id;
            option.textContent = cat.name;
            categorySelect.appendChild(option);
        });
        return true;
    } else {
        showMessage("Lỗi: Không tải được danh mục.", 'error');
        categorySelect.innerHTML = '<option value="">Lỗi tải danh mục</option>';
        return false;
    }
}

    // --- Xử lý Tabs ---
    function switchTab(type) {
        currentType = type;
        // 1. Cập nhật trạng thái Active của Tabs
        expenseTab.classList.remove('active');
        incomeTab.classList.remove('active');

        if (type === 'expense') {
        expenseTab.classList.add('active');
        } else {
            incomeTab.classList.add('active');
        }
       loadCategories(type); 

        // Cập nhật màu nút Submit dựa trên loại giao dịch
        const submitBtn = form.querySelector('.submit-btn');
        const isIncome = type === 'income';

        submitBtn.textContent = `Ghi nhận ${isIncome ? 'Thu nhập' : 'Chi tiêu'}`;

        if (isIncome) {
            submitBtn.classList.remove('green-bg');
            submitBtn.classList.add('red-bg'); // Cần thêm style .red-bg trong CSS
        } else { // income
            submitBtn.classList.remove('red-bg');
            submitBtn.classList.add('green-bg');
        }   
        showMessage('', null); // Xóa thông báo khi chuyển tab
        // TODO: Cần thêm logic tải lại danh mục theo type (sẽ làm ở US03)
    }

    expenseTab.addEventListener('click', () => switchTab('expense'));
    incomeTab.addEventListener('click', () => switchTab('income'));
    
    // Đặt ngày hiện tại làm mặc định
    dateInput.valueAsDate = new Date();
    
    // --- Xử lý Submit Form ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value;
        const transaction_date = dateInput.value;
        const category_id = categorySelect.value;
        
        // Lấy user_id từ localStorage (được lưu sau khi login thành công)
        const user_id = localStorage.getItem('user_id');

        if (!user_id) {
            showMessage("Lỗi: Vui lòng đăng nhập lại (Thiếu User ID).", 'error');
            return;
        }

        if (!amount || amount <= 0) {
            showMessage("Lỗi: Số tiền không hợp lệ.", 'error');
            return;
        }

        showMessage("Đang ghi nhận giao dịch...", 'success');

        try {
            const response = await fetch(`${API_BASE_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    type: currentType,
                    amount: amount,
                    description: description,
                    transaction_date: transaction_date,
                    category_id: category_id
                })
            });
            
            const result = await response.json();

            if (response.ok) {
                showMessage(`Ghi nhận ${currentType} thành công!`, 'success');
                form.reset();
                dateInput.valueAsDate = new Date(); // Reset ngày về ngày hiện tại
            } else {
                showMessage("Lỗi Server: " + result.message, 'error');
            }
        } catch (error) {
            console.error("Lỗi kết nối API:", error);
            showMessage("Lỗi kết nối Server. Vui lòng kiểm tra Back-end.", 'error');
        }
    });

    // Khởi tạo trạng thái tab ban đầu
    switchTab('expense'); 
});