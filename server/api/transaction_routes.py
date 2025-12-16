from flask import Blueprint, request, jsonify, current_app, session # <--- Đã thêm session
import mysql.connector

transaction_bp = Blueprint('transaction', __name__)

# --- HÀM KẾT NỐI DB (Giữ nguyên logic của bạn) ---
def get_db_connection():
    return mysql.connector.connect(
        host=current_app.config['MYSQL_HOST'],
        user=current_app.config['MYSQL_USER'],
        password=current_app.config['MYSQL_PASSWORD'],
        database=current_app.config['MYSQL_DB']
    )

# --- ROUTE 1: THÊM GIAO DỊCH (US02) ---
@transaction_bp.route('/add', methods=['POST']) # <--- Sửa thành /add
def add_transaction():
    try:
        data = request.json
        
        # 1. Lấy dữ liệu
        # Ưu tiên lấy user_id từ session, nếu không có thì lấy từ data gửi lên, hoặc mặc định 1
        user_id = session.get('user_id') or data.get('user_id', 1)
        
        type_trans = data.get('type')
        amount = data.get('amount')
        description = data.get('description')
        transaction_date = data.get('transaction_date')
        category = data.get('category') # Frontend gửi 'category', không phải 'category_id'

        # 2. Kết nối DB
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 3. SQL (Lưu ý: Bảng của bạn dùng cột 'category' dạng chữ, không phải ID)
        sql = """
            INSERT INTO transactions 
            (user_id, transaction_date, type, amount, description, category) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        # Nếu bảng bạn tên cột là category_id thì sửa lại SQL, nhưng theo bài trước là category (text)
        cursor.execute(sql, (user_id, transaction_date, type_trans, amount, description, category))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({"message": "Thêm thành công!"}), 201
        
    except Exception as e:
        print(f"Lỗi Backend: {e}")
        return jsonify({"message": f"Lỗi server: {str(e)}"}), 500

# --- ROUTE 2: LẤY DANH SÁCH (Đếm số thông báo) ---
@transaction_bp.route('/list', methods=['GET'])
def get_transactions():
    # Lấy user_id từ session (mặc định 1 để test)
    user_id = session.get('user_id', 1) 

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) 
        
        sql = "SELECT * FROM transactions WHERE user_id = %s ORDER BY created_at DESC"
        cursor.execute(sql, (user_id,))
        transactions = cursor.fetchall()
        
        cursor.close()
        conn.close()

        return jsonify(transactions), 200

    except Exception as e:
        print(f"Lỗi lấy list: {e}")
        return jsonify([]), 500