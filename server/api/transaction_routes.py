# server/api/transaction_routes.py

from flask import Blueprint, request, jsonify, current_app
import mysql.connector
import jwt # Cần thiết cho việc xác thực token sau này
from functools import wraps # Dùng cho decorator xác thực

# Định nghĩa Blueprint cho các route giao dịch
transaction_bp = Blueprint('transactions', __name__)

# --- HÀM HỖ TRỢ KẾT NỐI DB ---
def get_db_connection():
    # Sử dụng cùng hàm kết nối đã định nghĩa trong auth_routes
    return mysql.connector.connect(
        host=current_app.config['MYSQL_HOST'],
        user=current_app.config['MYSQL_USER'],
        password=current_app.config['MYSQL_PASSWORD'],
        database=current_app.config['MYSQL_DB']
    )

# ----------------------------------------------------
# US02: ENDPOINT THÊM GIAO DỊCH (TẠM THỜI BỎ QUA XÁC THỰC USER)
# ----------------------------------------------------

@transaction_bp.route('/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    
    # Lấy dữ liệu từ Frontend
    user_id = data.get('user_id') # Tạm thời lấy trực tiếp từ Frontend
    type = data.get('type') # 'income' hoặc 'expense'
    amount = data.get('amount')
    description = data.get('description')
    transaction_date = data.get('transaction_date') # Định dạng YYYY-MM-DD
    category_id = data.get('category_id') # ID danh mục

    # 1. Kiểm tra dữ liệu cần thiết
    if not all([user_id, type, amount, transaction_date]):
        return jsonify({"message": "Thiếu thông tin giao dịch bắt buộc."}), 400
    
    # 2. Xử lý logic và chèn vào DB
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # SQL cho việc chèn giao dịch
        sql = """
        INSERT INTO transactions 
        (user_id, transaction_date, type, amount, description, category_id) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        params = (user_id, transaction_date, type, amount, description, category_id)
        
        cursor.execute(sql, params)
        db.commit()
        
        return jsonify({"message": "Thêm giao dịch thành công!", "transaction_id": cursor.lastrowid}), 201
        
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi thêm giao dịch: {err}")
        return jsonify({"message": "Lỗi server khi thêm giao dịch."}), 500
    except Exception as e:
        print(f"Lỗi không xác định: {e}")
        return jsonify({"message": "Lỗi server nội bộ."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()
            
    
# Thêm các route khác (GET, PUT, DELETE) sau khi hoàn thành POST
# ...
@transaction_bp.route('/categories', methods=['GET'])
def get_categories():
    # Lấy tham số 'type' từ URL query (ví dụ: /categories?type=income)
    category_type = request.args.get('type') 
    
    if category_type not in ['income', 'expense']:
        return jsonify({"message": "Thiếu hoặc sai tham số 'type'."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        
        # 1. Truy vấn các danh mục theo loại
        sql = "SELECT category_id, name FROM categories WHERE type = %s"
        cursor.execute(sql, (category_type,))
        
        categories = cursor.fetchall()

        # 2. Trả về danh sách danh mục
        return jsonify({
            "message": "Lấy danh mục thành công.",
            "categories": categories
        }), 200
        
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi lấy danh mục: {err}")
        return jsonify({"message": "Lỗi server khi xử lý danh mục."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()