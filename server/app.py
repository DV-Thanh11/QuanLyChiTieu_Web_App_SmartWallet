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