import mysql.connector
import os

def init_database(app):
    """Thiết lập kết nối, tạo DB và các bảng nếu chưa tồn tại."""
    try:
        # 1. Kết nối đến MySQL Server (sử dụng thông tin cấu hình từ app.py)
        db = mysql.connector.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            password=app.config['MYSQL_PASSWORD']
        )
        cursor = db.cursor()

        # 2. Tạo Database nếu chưa tồn tại
        db_name = app.config['MYSQL_DB']
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        
        # 3. Kết nối lại với database đã tạo
        db.database = db_name
        
        # 4. Đọc và thực thi SQL Schema để tạo bảng users
        # os.path.join giúp tạo đường dẫn đa nền tảng
        schema_path = os.path.join(app.root_path, '..', 'docs', 'DATABASE_SCHEMA.sql')
        with open(schema_path, 'r',encoding= 'utf-8') as f:
            sql_commands = f.read()

        # Chạy từng lệnh SQL trong file
        for command in sql_commands.split(';'):
            if command.strip():
                try:
                    cursor.execute(command)
                except mysql.connector.Error as err:
                    # Bỏ qua lỗi nếu bảng đã tồn tại (lỗi phổ biến khi khởi động lại server)
                    if "already exists" not in str(err):
                        print(f"Lỗi khi thực thi SQL: {err}")
                        
        db.commit()
        print(f"Database '{db_name}' và bảng users đã sẵn sàng.")

    except mysql.connector.Error as err:
        print(f"LỖI KẾT NỐI/KHỞI TẠO DATABASE: {err}")
        print("Vui lòng đảm bảo MySQL Server đang chạy và thông tin đăng nhập trong app.py là chính xác.")

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'db' in locals() and db and db.is_connected():
            db.close()