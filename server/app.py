from flask import Flask
from database.init_db import init_database
from api.auth_routes import auth_bp
from api.transaction_routes import transaction_bp
from flask_cors import CORS # Cần cài đặt: pip install flask-cors
import os 
from dotenv import load_dotenv 
load_dotenv() # Tải các biến từ file .env
app = Flask(__name__)

# Cấu hình CORS để cho phép Front-end (chạy cục bộ) gọi API
CORS(app) 

# --- CẤU HÌNH DATABASE (THAY THẾ BẰNG THÔNG TIN CỦA BẠN) ---
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_ROOT_PASSWORD') # <--- THAY ĐỔI MẬT KHẨU CỦA BẠN
app.config['MYSQL_DB'] = 'financial_app' 

# --- CẤU HÌNH BẢO MẬT & EMAIL (QUÊN MẬT KHẨU) ---
# Dùng cho itsdangerous để tạo token. PHẢI LÀ MỘT CHUỖI MẠNH VÀ BÍ MẬT!
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'default_secret_dev_key_if_not_set')

# Cấu hình Flask-Mail (Thay thế bằng thông tin SMTP của bạn, ví dụ: Gmail)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
# LƯU Ý: Đặt những giá trị này trong file .env
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME') 
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

# Khởi tạo Flask-Mail
from flask_mail import Mail
mail = Mail(app)
# 1. Khởi tạo và tạo bảng (Tự động chạy script SQL)
init_database(app)

# 2. Đăng ký Blueprint cho routes xác thực (US01)
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(transaction_bp, url_prefix='/api')

@app.route('/', methods=['GET'])
def home():
    # Điểm cuối kiểm tra server có đang chạy không
    return "Backend Server is running for Quan Ly Chi Tieu App!"

if __name__ == '__main__':
    # Chạy server ở chế độ Debug, cổng 5000
    app.run(debug=True, port=5000)