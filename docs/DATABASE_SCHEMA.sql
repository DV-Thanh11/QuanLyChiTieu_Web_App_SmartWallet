-- =============================================
-- 1. BẢNG USERS (Tương ứng: TaiKhoanKH)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,      -- KhachHang_ID
    name VARCHAR(100) NOT NULL,                  -- Tên ĐN
    email VARCHAR(100) NOT NULL UNIQUE,          -- Email
    password_hash VARCHAR(255) NOT NULL,         -- Mật Khẩu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. BẢNG CATEGORIES (Tương ứng: DanhMuc)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,  -- DanhMuc_ID
    name VARCHAR(100) NOT NULL,                  -- Tên Danh Mục
    type ENUM('income', 'expense') NOT NULL,     -- Loại Danh Mục
    -- Đảm bảo không trùng tên danh mục trong cùng một loại
    UNIQUE KEY unique_category_type (name, type)
);

INSERT IGNORE INTO categories (name, type) VALUES 
('Lương', 'income'), ('Thưởng', 'income'), ('Phụ cấp', 'income'), 
('Thu nhập ngoài (Freelance)', 'income'), ('Khoản thu khác', 'income'),
('Ăn uống', 'expense'), ('Tiền nhà/Phòng', 'expense'), ('Di chuyển', 'expense'), 
('Mua sắm/Quần áo', 'expense'), ('Học tập/Phí', 'expense'), ('Giải trí', 'expense'),('Đầu Tư và Tiết Kiệm',"expense");

-- =============================================
-- 3. BẢNG TRANSACTIONS (Tương ứng: GiaoDich)
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY, -- GiaoDich_ID
    user_id INT NOT NULL,                          -- KhachHang_ID (FK)
    category_id INT NOT NULL,                      -- DanhMuc_ID (FK) - MỚI THÊM ĐỂ ĐÚNG ERD
    amount DECIMAL(15, 2) NOT NULL,                -- Số Tiền
    type ENUM('income', 'expense') NOT NULL,       -- Loại (Dư thừa để query nhanh, hoặc bỏ nếu join category)
    description VARCHAR(255),                      
    transaction_date DATE NOT NULL,                -- Ngày GD
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ràng buộc khóa ngoại
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- =============================================
-- 4. BẢNG BUDGETS (Tương ứng: NganSach - US05)
-- =============================================
CREATE TABLE IF NOT EXISTS budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,      -- NganSach_ID
    user_id INT NOT NULL,                          -- KhachHang_ID (FK)
    category_id INT NOT NULL,                      -- DanhMuc_ID (FK)
    amount DECIMAL(15, 2) NOT NULL,                -- Số Tiền Ngân Sách
    alert_threshold INT DEFAULT 80,                -- Hạn Mức Cảnh Báo (%)
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- =============================================
-- 5. BẢNG SAVINGS_GOALS (Tương ứng: MucTieuTietKiem - US06)
-- =============================================
CREATE TABLE IF NOT EXISTS savings_goals (
    goal_id INT AUTO_INCREMENT PRIMARY KEY,        -- MucTieu_ID
    user_id INT NOT NULL,                          -- KhachHang_ID (FK)
    name VARCHAR(255) NOT NULL,                    -- Tên MT
    target_amount DECIMAL(15, 2) NOT NULL,         -- Số Tiền Mục Tiêu
    current_amount DECIMAL(15, 2) DEFAULT 0,       -- Số Tiền Hiện Tại
    deadline DATE,                                 -- Thời Gian Tiết Kiệm
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =============================================
-- 6. BẢNG RECURRING_TRANSACTIONS (Tương ứng: GiaoDichDinhKy - US07)
-- =============================================
CREATE TABLE IF NOT EXISTS recurring_transactions (
    recurring_id INT AUTO_INCREMENT PRIMARY KEY,   -- GDĐK_ID
    user_id INT NOT NULL,                          -- KhachHang_ID (FK)
    category_id INT NOT NULL,                      -- DanhMuc_ID (FK)
    amount DECIMAL(15, 2) NOT NULL,                -- Số Tiền
    frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL, -- Tần Suất GD
    transaction_date DATE NOT NULL,                -- Ngày GD (Ngày bắt đầu/Ngày chạy tiếp theo)
    description VARCHAR(255),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);