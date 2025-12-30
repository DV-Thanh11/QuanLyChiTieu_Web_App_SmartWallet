from flask import Flask
from database.init_db import init_database
from api.auth_routes import auth_bp
from api.transaction_routes import transaction_bp
from api.tietkiem_api import tietkiem_bp
from api.gddk_api import gddk_bp, process_due_recurring_once
import threading
import time
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


app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(transaction_bp, url_prefix='/api')
app.register_blueprint(tietkiem_bp, url_prefix='/api')
app.register_blueprint(gddk_bp, url_prefix='/api')

@app.route('/', methods=['GET'])
def home():
    # Điểm cuối kiểm tra server có đang chạy không
    return "Backend Server is running for Quan Ly Chi Tieu App!"

if __name__ == '__main__':
    # Start background scheduler to apply recurring transactions periodically
    def _scheduler_loop(interval_seconds=3600):
        with app.app_context():
            while True:
                try:
                    inserted = process_due_recurring_once()
                    print(f"[recurring-scheduler] applied recurring, inserted={inserted}")
                except Exception as e:
                    print("[recurring-scheduler] error:", e)
                time.sleep(interval_seconds)

    interval = int(os.getenv('RECURRING_INTERVAL_SECONDS', '3600'))
    # Avoid running scheduler twice with the Flask reloader
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.debug:
        t = threading.Thread(target=_scheduler_loop, args=(interval,), daemon=True)
        t.start()

    # Chạy server ở chế độ Debug, cổng 5000
    app.run(debug=True, port=5000)