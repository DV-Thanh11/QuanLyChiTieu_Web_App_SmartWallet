const API_BASE_URL = 'http://127.0.0.1:5000/api/auth';

document.addEventListener('DOMContentLoaded', () => {
    // Khai báo các phần tử DOM cần thiết
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Khai báo các Tabs (MỚI)
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');

    const messageDisplay = document.getElementById('message');
    
    function showMessage(msg, type) {
        messageDisplay.textContent = msg;
        messageDisplay.style.color = type === 'error' ? 'red' : 'green';
    }

    // Hàm chuyển đổi chế độ xác thực (Đăng nhập/Đăng ký)
    function switchAuthMode(mode) {
        // Ẩn tất cả form trước khi hiển thị form cần thiết
        loginForm.style.display = 'none';
        registerForm.style.display = 'none';
        // Xóa trạng thái active của tabs
        loginTab.classList.remove('active');
        signupTab.classList.remove('active');

        if (mode === 'login') {
            loginForm.style.display = 'flex';
            loginTab.classList.add('active');
        } else if (mode === 'register') {
            registerForm.style.display = 'flex';
            signupTab.classList.add('active');
        }
        messageDisplay.textContent = ''; // Xóa thông báo cũ
    }
    
    // Gắn sự kiện click cho các Tabs
    loginTab.addEventListener('click', () => switchAuthMode('login'));
    signupTab.addEventListener('click', () => switchAuthMode('register'));
    
    // Đảm bảo trạng thái ban đầu là 'login'
    switchAuthMode('login');

    // --- Xử lý ĐĂNG KÝ (US01) ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // 1. Validation mật khẩu Front-end
        if (password !== confirmPassword) {
            showMessage("Lỗi: Mật khẩu xác nhận không khớp.", 'error');
            return;
        }
        if (password.length < 6) {
            showMessage("Lỗi: Mật khẩu phải có ít nhất 6 ký tự.", 'error');
            return;
        }
        
        showMessage("Đang xử lý đăng ký...", 'success');

        try {
            // 2. Gửi yêu cầu Đăng ký đến Back-end API
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const result = await response.json();

            // 3. Xử lý phản hồi từ Server
            if (response.ok) { // Mã 200-299, ví dụ 201 Created
                showMessage(result.message + " Vui lòng đăng nhập.", 'success');
                registerForm.reset();
                switchAuthMode('login'); // Tự động chuyển về tab Đăng nhập
            } else {
                // Mã lỗi Server (409 Conflict, 400 Bad Request, 500 Server Error,...)
                showMessage("Lỗi ĐK: " + result.message, 'error');
            }
        } catch (error) {
            showMessage("Lỗi kết nối Server..", 'error');
        }
    });

    // --- Xử lý ĐĂNG NHẬP (US01) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        showMessage("Đang đăng nhập...", 'success');

        try {
            // 1. Gửi yêu cầu Đăng nhập đến Back-end API
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            // 2. Xử lý phản hồi từ Server
            if (response.ok) { // Mã 200 OK
                // Đăng nhập thành công: Lưu user_id và name vào session (LocalStorage)
                localStorage.setItem('user_id', result.user_id);
                localStorage.setItem('user_name', result.name);
                
                showMessage(result.message + " Chuyển hướng đến Dashboard...", 'success');
                
                // Chuyển hướng sau 1 giây
                setTimeout(() => {
                    window.location.href = 'dashboard.html'; 
                }, 1000); 
            } else {
                // Mã lỗi Server (401 Unauthorized,...)
                showMessage("Lỗi ĐN: " + result.message, 'error');
            }
        } catch (error) {
             showMessage("Lỗi kết nối Server. Vui lòng kiểm tra Back-end.", 'error');
        }
    });
    

});