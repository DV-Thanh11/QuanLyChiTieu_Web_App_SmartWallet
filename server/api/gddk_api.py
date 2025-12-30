from flask import Blueprint, request, jsonify, current_app
import mysql.connector
from datetime import datetime, timedelta

gddk_bp = Blueprint('gddk', __name__)


def get_db_connection():
    return mysql.connector.connect(
        host=current_app.config['MYSQL_HOST'],
        user=current_app.config['MYSQL_USER'],
        password=current_app.config['MYSQL_PASSWORD'],
        database=current_app.config['MYSQL_DB']
    )


@gddk_bp.route('/recurring', methods=['POST'])
def create_recurring():
    data = request.json or {}
    user_id = data.get('user_id')
    category_id = data.get('category_id')
    amount = data.get('amount')
    frequency = data.get('frequency')
    start_date = data.get('start_date')
    description = data.get('description')

    if not all([user_id, category_id, amount, frequency, start_date]):
        return jsonify({'message': 'Thiếu tham số.'}), 400

    if frequency not in ('daily', 'weekly', 'monthly', 'yearly'):
        return jsonify({'message': 'Frequency không hợp lệ.'}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        sql = '''
        INSERT INTO recurring_transactions (user_id, category_id, amount, frequency, transaction_date, description)
        VALUES (%s, %s, %s, %s, %s, %s)
        '''
        cursor.execute(sql, (user_id, category_id, amount, frequency, start_date, description))
        db.commit()
        return jsonify({'message': 'Đã tạo recurring.', 'recurring_id': cursor.lastrowid}), 201
    except mysql.connector.Error as err:
        print('MySQL error create_recurring:', err)
        return jsonify({'message': 'Lỗi server khi tạo recurring.'}), 500
    finally:
        if db and db.is_connected():
            cursor.close(); db.close()


@gddk_bp.route('/recurring', methods=['GET'])
def list_recurring():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'message': "Thiếu tham số 'user_id'."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        sql = '''
        SELECT r.recurring_id, r.user_id, r.category_id, r.amount, r.frequency, r.transaction_date AS start_date, r.description,
               c.name AS category_name, c.type AS category_type
        FROM recurring_transactions r
        LEFT JOIN categories c ON r.category_id = c.category_id
        WHERE r.user_id = %s
        ORDER BY r.recurring_id DESC
        '''
        cursor.execute(sql, (user_id,))
        rows = cursor.fetchall()
        return jsonify({'message': 'OK', 'recurring': rows}), 200
    except mysql.connector.Error as err:
        print('MySQL error list_recurring:', err)
        return jsonify({'message': 'Lỗi server khi lấy recurring.'}), 500
    finally:
        if db and db.is_connected():
            cursor.close(); db.close()


@gddk_bp.route('/recurring/<int:rid>', methods=['DELETE'])
def delete_recurring(rid):
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute('DELETE FROM recurring_transactions WHERE recurring_id = %s', (rid,))
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'message': 'Không tìm thấy recurring.'}), 404
        return jsonify({'message': 'Đã xóa recurring.'}), 200
    except mysql.connector.Error as err:
        print('MySQL error delete_recurring:', err)
        return jsonify({'message': 'Lỗi server khi xóa recurring.'}), 500
    finally:
        if db and db.is_connected():
            cursor.close(); db.close()


def advance_date(date_str, frequency, count=1):
    d = datetime.strptime(date_str, '%Y-%m-%d').date()
    if frequency == 'daily':
        d = d + timedelta(days=1*count)
    elif frequency == 'weekly':
        d = d + timedelta(weeks=1*count)
    elif frequency == 'monthly':
        # naive month advance: increase month, adjust year
        month = d.month - 1 + 1*count
        year = d.year + month // 12
        month = month % 12 + 1
        day = min(d.day, 28)  # keep safe; DB date should be valid
        d = datetime(year, month, day).date()
    elif frequency == 'yearly':
        d = datetime(d.year + 1*count, d.month, d.day).date()
    return d.strftime('%Y-%m-%d')


@gddk_bp.route('/recurring/apply_due', methods=['POST'])
def apply_due_recurring():
    # wrapper route: call reusable processor
    try:
        inserted = process_due_recurring_once()
        return jsonify({'message': 'Done', 'inserted': inserted}), 200
    except Exception as err:
        print('Error in apply_due_recurring route:', err)
        return jsonify({'message': 'Lỗi server khi áp dụng recurring.'}), 500


def process_due_recurring_once():
    """Process recurring transactions due today or earlier.
    Returns number of inserted transaction rows."""
    db = None
    inserted = 0
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT * FROM recurring_transactions WHERE transaction_date <= CURDATE()")
        rows = cursor.fetchall()
        for r in rows:
            # get category type
            ccur = db.cursor(dictionary=True)
            ccur.execute('SELECT name, type FROM categories WHERE category_id = %s', (r['category_id'],))
            cat = ccur.fetchone()
            ccur.close()

            tx_type = cat['type'] if cat and 'type' in cat else 'expense'

            # insert transaction for the due date
            icur = db.cursor()
            sql_ins = '''
            INSERT INTO transactions (user_id, transaction_date, type, amount, description, category_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            '''
            icur.execute(sql_ins, (r['user_id'], r['transaction_date'], tx_type, r['amount'], r.get('description'), r['category_id']))
            inserted += icur.rowcount
            icur.close()

            # advance the recurring row's transaction_date to next occurrence
            next_date = advance_date(r['transaction_date'], r['frequency'])
            ucur = db.cursor()
            ucur.execute('UPDATE recurring_transactions SET transaction_date = %s WHERE recurring_id = %s', (next_date, r['recurring_id']))
            ucur.close()

        db.commit()
        return inserted
    finally:
        if db and db.is_connected():
            try:
                cursor.close()
            except Exception:
                pass
            db.close()
