from flask import Blueprint, request, jsonify, current_app
import mysql.connector
import bcrypt # Dùng để mã hóa mật khẩu
from flask import Blueprint, request, jsonify, current_app
import mysql.connector
import bcrypt # Dùng để mã hóa mật khẩu

# THÊM CÁC IMPORTS MỚI CHO QUÊN MẬT KHẨU
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from flask_mail import Message, Mail
# END IMPORTS MỚI

# Tạo Blueprint để nhóm các routes xác thực
auth_bp = Blueprint('auth', __name__)

# ... (Hàm get_db_connection)

# --- CÁC HÀM HỖ TRỢ CHO KHÔI PHỤC MẬT KHẨU ---

# Hàm lấy Serializer từ app config
def get_serializer(app):
    return URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Hàm tạo token với thời hạn 1 giờ
def generate_reset_token(email, app):
    serializer = get_serializer(app)
    # Token có thời hạn 3600 giây (1 giờ), dùng 'password-reset-salt' để phân biệt
    return serializer.dumps(email, salt='password-reset-salt') 

# Hàm xác nhận token
def confirm_reset_token(token, app, expiration=3600):
    serializer = get_serializer(app)
    try:
        email = serializer.loads(
            token,
            salt='password-reset-salt',
            max_age=expiration # Thời gian tối đa cho phép
        )
    except SignatureExpired:
        return None # Token đã hết hạn
    except Exception:
        return None # Lỗi khác (Token không hợp lệ)
    return email

# Hàm gửi Email (Sử dụng Flask-Mail)
def send_password_reset_email(user_email, reset_url):
    """Hàm gửi email khôi phục mật khẩu"""
    try:
        mail = current_app.extensions['mail'] # Lấy Mail object đã khởi tạo từ app.py
        
        msg = Message(
            'Yêu cầu Đặt lại Mật khẩu SmartWallet',
            recipients=[user_email]
        )
        
        msg.html = f"""
        <p>Xin chào,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu:</p>
        <p><a href="{reset_url}" style="background-color: #28a745; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">
            Đặt lại Mật khẩu
        </a></p>
        <p>Liên kết này sẽ hết hạn sau 1 giờ. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ SmartWallet</p>
        """
        
        mail.send(msg)
        print(f"DEBUG: Email đã được gửi thành công tới {user_email}")
        return True
    except Exception as e:
        print(f"LỖI GỬI EMAIL: {e}")
        return False
        
# --- END HÀM HỖ TRỢ ---

@auth_bp.route('/register', methods=['POST'])
# ... (Các hàm register và login giữ nguyên)

# Tạo Blueprint để nhóm các routes xác thực
auth_bp = Blueprint('auth', __name__)

def get_db_connection():
    # Hàm kết nối DB, sử dụng cấu hình từ app.py
    return mysql.connector.connect(
        host=current_app.config['MYSQL_HOST'],
        user=current_app.config['MYSQL_USER'],
        password=current_app.config['MYSQL_PASSWORD'],
        database=current_app.config['MYSQL_DB']
    )

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password').encode('utf-8') # Mã hóa mật khẩu thành bytes

    if not all([name, email, password]):
        return jsonify({"message": "Thiếu thông tin đăng ký bắt buộc."}), 400

    # 1. Mã hóa mật khẩu bằng bcrypt (an toàn)
    password_hash = bcrypt.hashpw(password, bcrypt.gensalt())
    
    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # 2. Kiểm tra email đã tồn tại chưa (phải duy nhất)
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"message": "Email đã tồn tại."}), 409 # Mã lỗi Conflict
            
        # 3. Chèn người dùng mới vào DB
        sql = "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)"
        cursor.execute(sql, (name, email, password_hash))
        db.commit()
        
        return jsonify({"message": "Đăng ký thành công!"}), 201
        
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi đăng ký: {err}")
        return jsonify({"message": "Lỗi server khi đăng ký."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password').encode('utf-8')

    if not all([email, password]):
        return jsonify({"message": "Thiếu thông tin đăng nhập."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True) # Trả về kết quả dưới dạng dictionary
        
        # 1. Tìm người dùng bằng email
        cursor.execute("SELECT user_id, name, password_hash FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if user:
            # 2. So sánh mật khẩu đã mã hóa (kiểm tra mật khẩu)
            if bcrypt.checkpw(password, user['password_hash'].encode('utf-8')):
                # Đăng nhập thành công, trả về thông tin người dùng
                return jsonify({
                    "message": "Đăng nhập thành công!",
                    "user_id": user['user_id'],
                    "name": user['name']
                }), 200
            else:
                # Mật khẩu sai
                return jsonify({"message": "Email hoặc mật khẩu không đúng."}), 401
        else:
            # Email không tồn tại
            return jsonify({"message": "Email hoặc mật khẩu không đúng."}), 401
            
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi đăng nhập: {err}")
        return jsonify({"message": "Lỗi server khi đăng nhập."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()
# Endpoint để nhận yêu cầu khôi phục mật khẩu (Bước 2)
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    email = data.get('email')

    if not email:
        return jsonify({"message": "Thiếu email."}), 400

    db = None
    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        
        # 1. Kiểm tra email có tồn tại không
        cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()

        if not user:
            # Trả lời chung chung để tránh lộ thông tin email nào tồn tại
            return jsonify({"message": "Nếu email tồn tại, một liên kết sẽ được gửi."}), 200 

        # 2. Tạo Token và Liên kết
        token = generate_reset_token(email, current_app)
        # Sử dụng cổng 3000 hoặc URL Frontend của bạn
        reset_url = f"http://localhost:3000/reset_password.html?token={token}" 

        # 3. Gửi Email
        if not send_password_reset_email(email, reset_url):
            return jsonify({"message": "Đã xảy ra lỗi khi gửi email. Vui lòng thử lại sau."}), 500 

        return jsonify({
            "message": "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư (cả mục Spam)."
        }), 200
        
    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi quên mật khẩu: {err}")
        return jsonify({"message": "Lỗi server khi xử lý yêu cầu."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close() 
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Endpoint nhận token và mật khẩu mới để đặt lại mật khẩu."""
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')

    if not all([token, new_password]):
        return jsonify({"message": "Thiếu token hoặc mật khẩu mới."}), 400
    
    # 1. Xác nhận Token (Dùng hàm confirm_reset_token đã định nghĩa ở trên)
    email = confirm_reset_token(token, current_app) 

    if not email:
        return jsonify({"message": "Liên kết khôi phục không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới."}), 401

    # 2. Hash mật khẩu mới
    db = None
    try:
        password_bytes = new_password.encode('utf-8')
        password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        
        db = get_db_connection()
        cursor = db.cursor()

        # 3. Cập nhật mật khẩu trong Database
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE email = %s",
            (password_hash.decode('utf-8'), email)
        )
        db.commit()

        # 4. Trả về thành công
        return jsonify({"message": "Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập."}), 200

    except mysql.connector.Error as err:
        print(f"Lỗi MySQL khi đặt lại mật khẩu: {err}")
        return jsonify({"message": "Lỗi server khi đặt lại mật khẩu."}), 500
    finally:
        if db and db.is_connected():
            cursor.close()
            db.close()                       