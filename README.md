# 💰 SmartWallet - Ứng dụng Quản lý Chi Tiêu Cá Nhân

> Dự án Web App xây dựng trên kiến trúc Client-Server, nhằm cung cấp giải pháp theo dõi và quản lý thu chi cá nhân hiệu quả.

---

## 🚀 1. Tổng quan Dự án

Dự án được phát triển theo mô hình Back-end API (Flask, Python) và Front-end (HTML, CSS, JS) để tạo ra một ứng dụng quản lý tài chính đơn giản và trực quan.

**Các Chức năng Đã Hoàn thành (User Stories - US):**

* **[US01]** Đăng ký/Đăng nhập người dùng (Lưu trữ bằng MySQL, Mật khẩu được mã hóa an toàn).
* **[US02]** Thực hiện giao dịch (Thu nhập/Chi tiêu).
* **[US03]** Xem tổng quan (Dashboard) và thống kê chi tiêu.
  - Tổng quan số liệu: Tổng Thu, Tổng Chi, Số Dư
  - Biểu đồ tròn: Chi tiêu theo danh mục
  - Biểu đồ cột: Thu/Chi theo tháng
  - Tự động cập nhật khi có giao dịch mới
* **[US04]** Xem trạng thái đăng nhập và đăng xuất (Chưa triển khai)

---

## ⚙️ 2. Công nghệ Sử dụng

| Thành phần | Công nghệ | Mục đích |
| :--- | :--- | :--- |
| **Front-end (FE)** | HTML5, CSS3, JavaScript | Giao diện người dùng và logic xử lý API. |
| **Back-end (BE)** | Python, Flask | Xây dựng RESTful API. |
| **Database (DB)** | MySQL | Lưu trữ dữ liệu người dùng và giao dịch. |
| **Bảo mật** | bcrypt, python-dotenv | Mã hóa mật khẩu, quản lý biến môi trường an toàn. |
| **Visualization** | Chart.js | Hiển thị biểu đồ thống kê chi tiêu. |

---

## 🛠️ 3. Thiết lập Môi trường Phát triển (Local Setup)

Để chạy dự án này trên máy tính của bạn, hãy làm theo các bước sau:

### 3.1. Yêu cầu Hệ thống

* **Python 3.x** (Đã cài đặt và thêm vào PATH)
* **MySQL Server** (Đã cài đặt và đang chạy)
* **Visual Studio Code (VS Code)** (Nên dùng)
* **Git**

### 3.2. Chuẩn bị Thư mục và Dependencies

1.  **Clone Repository:**
    ```bash
    git clone [Địa chỉ GitHub của bạn]
    cd SmartWallet
    ```

2.  **Thiết lập Môi trường Ảo (venv):**
    ```bash
    cd server
    python -m venv venv
    .\venv\Scripts\activate  # Kích hoạt môi trường ảo
    ```

3.  **Cài đặt Thư viện Python:**
    ```bash
    pip install -r ../requirements.txt 
    ```
    **(Lệnh này cài đặt Flask, mysql-connector-python, bcrypt, flask-cors, và python-dotenv).*

### 3.3. Cấu hình Database (Bắt buộc)

Để bảo mật, dự án sử dụng biến môi trường:

1.  Tạo file mới tên là **`.env`** trong thư mục gốc (`SmartWallet/`).
2.  Điền mật khẩu MySQL `root` của bạn vào file này:
    ```
    # Mật khẩu Root của MySQL Server Cục bộ
    MYSQL_ROOT_PASSWORD='MẬT_KHẨU_CỦA_BẠN' 
    ```

### 3.4. Khởi động Ứng dụng

1.  **Khởi động Back-end (API Server):**
    * Đảm bảo MySQL Server đang chạy.
    * Chạy lệnh sau (từ thư mục gốc của dự án) để khởi động Flask và tự động tạo Database:
        ```bash
        (venv) python -m server.app 
        ```

2.  **Khởi động Front-end (UI):**
    * Trong VS Code, mở file `client/public/index.html`.
    * Nhấp chuột phải và chọn **"Open with Live Server"**.

---

## 📂 4. Cấu trúc Thư mục Chính

```
SmartWallet/
├── client/
│   ├── public/              # Chứa file HTML chính
│   │   ├── index.html       # Trang đăng nhập/đăng ký
│   │   ├── dashboard.html   # Dashboard chính (US03)
│   │   └── dashboard_demo.html  # Trang demo với dữ liệu mẫu
│   └── src/                 # Tài nguyên (CSS, JS)
│       ├── css/
│       │   └── style.css    # Styling cho toàn bộ ứng dụng
│       └── js/
│           ├── auth.js      # Logic đăng nhập/đăng ký
│           ├── dashboard.js # Logic dashboard và biểu đồ (US03)
│           └── transaction.js # Logic giao dịch
├── server/
│   ├── api/                 # Chứa routes API
│   │   ├── auth_routes.py   # API đăng nhập/đăng ký
│   │   ├── transaction_routes.py # API giao dịch và thống kê
│   │   └── admin_routes.py
│   ├── database/
│   │   └── init_db.py       # Logic kết nối và khởi tạo DB
│   └── app.py               # Khởi động Flask App
├── docs/
│   ├── DATABASE_SCHEMA.sql  # Schema MySQL
│   └── USER_STRORIES.md     # User Stories
├── .env                     # File chứa biến môi trường (Bị Git bỏ qua)
├── .gitignore               # Danh sách file Git bỏ qua
├── requirements.txt         # Danh sách thư viện Python
└── README.md               # Tài liệu này
```
## 🤝 5. Đóng góp

*(Phần này dùng để hướng dẫn những người khác nếu họ muốn thêm code vào dự án của bạn).*

1.  Fork repository này.
2.  Tạo một branch mới: `git checkout -b feature/tên_tính_năng`
3.  Commit các thay đổi của bạn: `git commit -m 'feat: Thêm tính năng X'`
4.  Push lên branch: `git push origin feature/tên_tính_năng`
5.  Gửi Pull Request.
