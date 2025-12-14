const API_BASE_URL = 'http://127.0.0.1:5000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    const resetForm = document.getElementById('resetPasswordForm');
    const messageDisplay = document.getElementById('resetMessage');

    // Lấy token từ URL (ví dụ: ?token=XYZ)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        messageDisplay.textContent = "Lỗi: Không tìm thấy Token khôi phục mật khẩu.";
        messageDisplay.style.color = 'red';
        resetForm.style.display = 'none'; // Ẩn form nếu không có token
        return;
    }
    
    // Hàm hiển thị thông báo
    function showMessage(msg, type) {
        messageDisplay.textContent = msg;
        messageDisplay.style.color = type === 'error' ? 'red' : 'green';
    }

    resetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // 1. Validation Frontend
        if (newPassword !== confirmNewPassword) {
            showMessage("Lỗi: Mật khẩu xác nhận không khớp.", 'error');
            return;
        }
        if (newPassword.length < 6) {
            showMessage("Lỗi: Mật khẩu phải có ít nhất 6 ký tự.", 'error');
            return;
        }
        
        showMessage("Đang đặt lại mật khẩu...", 'success');

        try {
            // 2. Gửi token và mật khẩu mới đến Backend API
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, new_password: newPassword })
            });
            
            const result = await response.json();

            // 3. Xử lý phản hồi
            if (response.ok) { // Mã 200 OK
                showMessage(result.message + " Bạn sẽ được chuyển hướng sau 3 giây.", 'green');
                resetForm.reset();
                
                // Chuyển hướng về trang đăng nhập
                setTimeout(() => {
                    window.location.href = 'index.html'; 
                }, 3000); 
            } else {
                showMessage("Lỗi: " + result.message, 'error');
            }
        } catch (error) {
            showMessage("Lỗi kết nối Server. Vui lòng kiểm tra Back-end.", 'error');
        }
    });

});