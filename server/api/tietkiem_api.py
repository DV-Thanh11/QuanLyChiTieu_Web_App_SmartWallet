from flask import Blueprint, request, jsonify, current_app
import mysql.connector
from datetime import datetime

tietkiem_bp = Blueprint('tietkiem', __name__)

def get_db_connection():
    return mysql.connector.connect(
        host=current_app.config['MYSQL_HOST'],
        user=current_app.config['MYSQL_USER'],
        password=current_app.config['MYSQL_PASSWORD'],
        database=current_app.config['MYSQL_DB']
    )

# --- 1. Lấy danh sách (GET) ---
@tietkiem_bp.route('/savings', methods=['GET'])
def get_savings():
    user_id = request.args.get('user_id')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
 
    query = """
        SELECT goal_id,name,target_amount, current_amount, 
               DATE_FORMAT(deadline, '%Y-%m-%d') as deadline 
        FROM  savings_goals
        WHERE user_id = %s 
        ORDER BY goal_id DESC
    """
    cursor.execute(query, (user_id,))
    goals = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(goals), 200

# --- 2. Thêm mới (POST) ---
@tietkiem_bp.route('/savings', methods=['POST'])
def add_saving():
    data = request.json
    user_id = data.get('user_id')
    name = data.get('name')
    target = data.get('target_amount')
    current = data.get('current_amount', 0)
    deadline = data.get('deadline') if data.get('deadline') != "" else None

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # SQL Khớp với ERD
    query = """
        INSERT INTO savings_goals (user_id,name,target_amount,current_amount,deadline)
        VALUES (%s, %s, %s, %s, %s)
    """
    try:
        cursor.execute(query, (user_id, name, target, current, deadline))
        conn.commit()
        return jsonify({"message": "Thành công"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- 3. Xóa (DELETE) & HOÀN TIỀN ---
@tietkiem_bp.route('/savings/<int:goal_id>', methods=['DELETE'])
def delete_saving(goal_id):
    # Lấy data an toàn (để nhận category_id và note từ Frontend)
    data = request.get_json(silent=True) or {}
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.start_transaction() # Bắt đầu transaction

        # BƯỚC 1: Lấy thông tin mục tiêu
        query_get = "SELECT user_id, current_amount, name FROM savings_goals WHERE goal_id = %s"
        cursor.execute(query_get, (goal_id,))
        goal = cursor.fetchone()

        if not goal:
            return jsonify({"error": "Không tìm thấy mục tiêu"}), 404

        user_id = goal[0]      
        amount_to_refund = goal[1] 
        goal_name = goal[2]    

        # BƯỚC 2: Hoàn tiền về ví (Tạo giao dịch INCOME)
        if amount_to_refund > 0:
            refund_category_id = data.get('category_id')

            if not refund_category_id: 
                refund_category_id = 5 
            
            sql_refund = """
                INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
                VALUES (%s, %s, %s, 'income', %s, NOW())
            """
            
            description = data.get('note', f"Hoàn tiền do xóa mục tiêu: {goal_name}")
            
            cursor.execute(sql_refund, (user_id, refund_category_id, amount_to_refund, description))

        # BƯỚC 3: Xóa mục tiêu
        cursor.execute("DELETE FROM savings_goals WHERE goal_id = %s", (goal_id,))
        
        conn.commit()
        
        return jsonify({
            "message": "Đã xử lý thành công!",
            "refunded": amount_to_refund
        }), 200

    except Exception as e:
        conn.rollback() 
        return jsonify({"error": str(e)}), 500
        
    finally:
        cursor.close()
        conn.close()
# --- 4. NẠP TIỀN & TÍNH SỐ DƯ ĐỘNG (QUAN TRỌNG) ---
@tietkiem_bp.route('/savings/deposit', methods=['POST'])
def deposit_to_goal():
    data = request.json
    user_id = data.get('user_id')
    goal_id = data.get('goal_id')
    amount = float(data.get('amount', 0))
    category_id = data.get('category_id') # Bắt buộc phải có để Insert vào Transactions

    if not category_id:
        return jsonify({"error": "Vui lòng chọn danh mục chi tiêu"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.start_transaction()

        # BƯỚC A: TÍNH SỐ DƯ (Dựa vào bảng transactions)
        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = %s AND type = 'income'", (user_id,))
        total_income = cursor.fetchone()[0]

        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = %s AND type = 'expense'", (user_id,))
        total_expense = cursor.fetchone()[0]

        balance = float(total_income) - float(total_expense)

        if balance < amount:
            return jsonify({"error": f"Số dư hiện tại ({balance:,.0f}đ) không đủ để nạp"}), 400

        # BƯỚC B: THỰC HIỆN GIAO DỊCH
        sql_insert_trans = """
            INSERT INTO transactions (user_id, category_id, amount, type, description, transaction_date)
            VALUES (%s, %s, %s, 'expense', %s, NOW())
        """
        note = f"Nạp tiền vào mục tiêu ID {goal_id}"
        cursor.execute(sql_insert_trans, (user_id, category_id, amount, note))

        # 2. Cộng tiền vào SAVINGS_GOALS
        sql_update_goal = """
            UPDATE savings_goals 
            SET current_amount = current_amount + %s 
            WHERE goal_id = %s
        """
        cursor.execute(sql_update_goal, (amount, goal_id))

        conn.commit()
        return jsonify({"message": "Nạp tiền thành công"}), 200

    except Exception as e:
        conn.rollback()
        print(f"Deposit Error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()