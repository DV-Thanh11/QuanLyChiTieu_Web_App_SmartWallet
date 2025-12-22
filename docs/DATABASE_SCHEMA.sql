-- Thiết kế bảng users (Dùng cho US01: Đăng nhập/Đăng ký)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY, -- Khóa chính, ID người dùng
    name VARCHAR(100) NOT NULL,            -- Tên người dùng
    email VARCHAR(100) NOT NULL UNIQUE,    -- Email (Duy nhất, dùng làm tên đăng nhập)
    password_hash VARCHAR(255) NOT NULL,   -- Mật khẩu đã được mã hóa (bảo mật)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Thời gian tạo tài khoản
);
-- Bảng lưu trữ thông tin về các giao dịch (Chi tiêu và Thu nhập)
CREATE TABLE transactions (
    -- Khóa chính: ID duy nhất cho mỗi giao dịch
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Khóa ngoại: Liên kết giao dịch với người dùng đã tạo nó
    user_id INT NOT NULL, 
    
    -- Ngày tạo giao dịch (Thời gian ghi nhận vào DB)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ngày xảy ra giao dịch (Dùng để tính toán thống kê)
    transaction_date DATE NOT NULL,
    
    -- Loại giao dịch: 'income' (Thu nhập) hoặc 'expense' (Chi tiêu)
    type ENUM('income', 'expense') NOT NULL,
    
    -- Số tiền của giao dịch. DECIMAL là kiểu dữ liệu chuẩn cho tiền tệ.
    amount DECIMAL(10, 2) NOT NULL,
    
    -- Mô tả ngắn gọn về giao dịch (ví dụ: 'Mua cà phê', 'Lương tháng 1')
    description VARCHAR(255),
    
    -- Liên kết khóa ngoại đến bảng users
    FOREIGN KEY (user_id) REFERENCES users(user_id) 
        ON DELETE CASCADE -- Nếu người dùng bị xóa, giao dịch của họ cũng bị xóa
);
-- Bảng lưu trữ các danh mục chi tiêu/thu nhập
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Tên danh mục (Ví dụ: 'Food', 'Salary', 'Transport')
    name VARCHAR(100) NOT NULL,
    
    -- Loại danh mục (Liên kết với loại giao dịch: 'income' hoặc 'expense')
    type ENUM('income', 'expense') NOT NULL, 
    
    -- Đảm bảo tên danh mục là duy nhất trong cùng một loại
    UNIQUE KEY unique_category_type (name, type)
);


INSERT IGNORE INTO categories (name, type) VALUES 
('Lương', 'income'),
('Thưởng', 'income'),
('Phụ cấp', 'income'),
('Thu nhập ngoài (Freelance)', 'income'),
('Khoản thu khác', 'income');

-- Chèn các danh mục Chi tiêu (Ví dụ)
INSERT IGNORE INTO categories (name, type) VALUES 
('Ăn uống', 'expense'),
('Tiền nhà/Phòng', 'expense'),
('Di chuyển', 'expense'),
('Mua sắm/Quần áo', 'expense'),
('Học tập/Phí', 'expense'),
('Giải trí', 'expense');    