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
    category_id = data.get('category_id') if data.get('category_id') else None

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
            
    
@transaction_bp.route('/transactions', methods=['GET'])
def get_transactions():
    # Hỗ trợ query param: user_id (bắt buộc)
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "Thiếu tham số 'user_id'."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        sql = '''
        SELECT t.transaction_id, t.user_id, t.transaction_date, t.type, t.amount, t.description,
               t.category_id, c.name AS category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = %s
        ORDER BY t.transaction_date DESC, t.transaction_id DESC
        '''
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

        return jsonify({"message": "Lấy giao dịch thành công.", "transactions": rows}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi lấy giao dịch: {err}")
        return jsonify({"message": "Lỗi server khi lấy giao dịch."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/transactions/<int:tx_id>', methods=['GET'])
def get_transaction(tx_id):
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        sql = '''
        SELECT t.transaction_id, t.user_id, t.transaction_date, t.type, t.amount, t.description,
               t.category_id, c.name AS category_name
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        WHERE t.transaction_id = %s
        '''
        cursor.execute(sql, (tx_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"message": "Giao dịch không tồn tại."}), 404
        return jsonify({"message": "OK", "transaction": row}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi lấy giao dịch: {err}")
        return jsonify({"message": "Lỗi server khi lấy giao dịch."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/transactions/<int:tx_id>', methods=['PUT'])
def update_transaction(tx_id):
    data = request.json
    # Chỉ cho phép cập nhật một số trường cơ bản
    allowed = ['amount', 'description', 'transaction_date', 'category_id', 'type']
    fields = {k: data[k] for k in allowed if k in data}

    if not fields:
        return jsonify({"message": "Không có trường hợp lệ để cập nhật."}), 400

    set_clause = ', '.join([f"{k} = %s" for k in fields.keys()])
    params = list(fields.values())
    params.append(tx_id)

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = f"UPDATE transactions SET {set_clause} WHERE transaction_id = %s"
        cursor.execute(sql, params)
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Giao dịch không tồn tại."}), 404

        return jsonify({"message": "Cập nhật giao dịch thành công."}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi cập nhật giao dịch: {err}")
        return jsonify({"message": "Lỗi server khi cập nhật giao dịch."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/transactions/<int:tx_id>', methods=['DELETE'])
def delete_transaction(tx_id):
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = "DELETE FROM transactions WHERE transaction_id = %s"
        cursor.execute(sql, (tx_id,))
        db.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Giao dịch không tồn tại."}), 404

        return jsonify({"message": "Xóa giao dịch thành công."}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi xóa giao dịch: {err}")
        return jsonify({"message": "Lỗi server khi xóa giao dịch."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/balance', methods=['GET'])
def get_balance():
    # Trả về tổng tiền: thu nhập - chi tiêu cho user
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "Thiếu tham số 'user_id'."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = "SELECT type, SUM(amount) FROM transactions WHERE user_id = %s GROUP BY type"
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()

        total_income = 0.0
        total_expense = 0.0
        for r in rows:
            ttype = r[0]
            s = r[1] if r[1] is not None else 0
            if ttype == 'income':
                total_income = float(s)
            elif ttype == 'expense':
                total_expense = float(s)

        balance = total_income - total_expense
        return jsonify({"message": "OK", "balance": balance, "income": total_income, "expense": total_expense}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi lấy balance: {err}")
        return jsonify({"message": "Lỗi server khi tính balance."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()
@transaction_bp.route('/categories', methods=['GET'])
def get_categories():
    # Hỗ trợ: /categories hoặc /categories?type=income
    category_type = request.args.get('type')

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        if category_type:
            if category_type not in ['income', 'expense']:
                return jsonify({"message": "Tham số 'type' không hợp lệ."}), 400
            sql = "SELECT category_id, name, type FROM categories WHERE type = %s"
            cursor.execute(sql, (category_type,))
        else:
            sql = "SELECT category_id, name, type FROM categories"
            cursor.execute(sql)

        categories = cursor.fetchall()
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


@transaction_bp.route('/categories', methods=['POST'])
def create_category():
    data = request.json or {}
    name = data.get('name')
    ctype = data.get('type')
    if not name or ctype not in ['income', 'expense']:
        return jsonify({"message": "Thiếu tên hoặc type không hợp lệ."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = "INSERT INTO categories (name, type) VALUES (%s, %s)"
        cursor.execute(sql, (name, ctype))
        db.commit()
        return jsonify({"message": "Tạo danh mục thành công.", "category_id": cursor.lastrowid}), 201
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi tạo danh mục: {err}")
        return jsonify({"message": "Lỗi server khi tạo danh mục."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/categories/<int:cat_id>', methods=['PUT'])
def update_category(cat_id):
    data = request.json or {}
    name = data.get('name')
    ctype = data.get('type')
    if not name and not ctype:
        return jsonify({"message": "Không có trường hợp lệ để cập nhật."}), 400
    updates = []
    params = []
    if name:
        updates.append('name = %s')
        params.append(name)
    if ctype:
        if ctype not in ['income', 'expense']:
            return jsonify({"message": "Type không hợp lệ."}), 400
        updates.append('type = %s')
        params.append(ctype)
    params.append(cat_id)

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = f"UPDATE categories SET {', '.join(updates)} WHERE category_id = %s"
        cursor.execute(sql, tuple(params))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"message": "Danh mục không tồn tại."}), 404
        return jsonify({"message": "Cập nhật danh mục thành công."}), 200
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi cập nhật danh mục: {err}")
        return jsonify({"message": "Lỗi server khi cập nhật danh mục."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@transaction_bp.route('/categories/<int:cat_id>', methods=['DELETE'])
def delete_category(cat_id):
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        # Optionally, ensure no transactions reference this category
        cursor.execute("DELETE FROM categories WHERE category_id = %s", (cat_id,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({"message": "Danh mục không tồn tại."}), 404
        return jsonify({"message": "Xóa danh mục thành công."}), 200
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi xóa danh mục: {err}")
        return jsonify({"message": "Lỗi server khi xóa danh mục."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()
# --- [BỔ SUNG MỚI] API THỐNG KÊ (stats) ---
@transaction_bp.route('/transactions/stats', methods=['GET'])
def transaction_stats():
    # Trả về thống kê theo danh mục và theo tháng cho user
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"message": "Thiếu tham số 'user_id'."}), 400

    # Tuỳ chọn: start_date & end_date (YYYY-MM-DD)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # Nếu không có khoảng thời gian, mặc định lấy 6 tháng gần nhất
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Nếu không có start/end, tính mặc định 6 tháng trở về trước
        if not start_date or not end_date:
            cursor.execute("SELECT CURDATE() AS today")
            today = cursor.fetchone()['today']
            # MySQL: DATE_SUB
            cursor.execute("SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 MONTH), '%Y-%m-%d') AS s, DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS e")
            dr = cursor.fetchone()
            start_date = dr['s']
            end_date = dr['e']

        # 1) Tổng theo danh mục
        sql_cat = '''
        SELECT c.name AS category, c.type, SUM(t.amount) AS total
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.category_id
        WHERE t.user_id = %s AND t.transaction_date BETWEEN %s AND %s
        GROUP BY c.name, c.type
        '''
        cursor.execute(sql_cat, (user_id, start_date, end_date))
        by_category = cursor.fetchall()

        # 2) Tổng theo tháng (YYYY-MM)
        sql_month = '''
        SELECT DATE_FORMAT(transaction_date, '%Y-%m') AS month, 
               SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
               SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
        FROM transactions
        WHERE user_id = %s AND transaction_date BETWEEN %s AND %s
        GROUP BY month
        ORDER BY month
        '''
        cursor.execute(sql_month, (user_id, start_date, end_date))
        by_month = cursor.fetchall()

        return jsonify({
            "message": "OK",
            "by_category": by_category,
            "by_month": by_month,
            "start_date": start_date,
            "end_date": end_date
        }), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi lấy stats: {err}")
        return jsonify({"message": "Lỗi server khi lấy stats."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


# --- [BỔ SUNG MỚI] API ĐẾM TỔNG SỐ GIAO DỊCH ---
@transaction_bp.route('/transactions/count', methods=['GET'])
def count_transactions():
    # Lấy user_id từ param
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"count": 0}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Chỉ đếm số lượng dòng, rất nhẹ và nhanh
        sql = "SELECT COUNT(*) FROM transactions WHERE user_id = %s"
        cursor.execute(sql, (user_id,))
        result = cursor.fetchone()
        
        count = result[0] if result else 0
        return jsonify({"message": "OK", "count": count}), 200

    except Exception as e:
        print(f"Lỗi đếm giao dịch: {e}")
        return jsonify({"count": 0}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()
