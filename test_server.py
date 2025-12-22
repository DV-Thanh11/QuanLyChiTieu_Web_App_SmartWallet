#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script test để kiểm tra kết nối MySQL và khởi động server"""

import os
import sys
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv()

print("=" * 50)
print("KIEM TRA KET NOI MYSQL")
print("=" * 50)

# Kiểm tra file .env
mysql_password = os.getenv('MYSQL_ROOT_PASSWORD')
if mysql_password:
    print(f"✓ File .env đã được tải")
    print(f"  MYSQL_ROOT_PASSWORD: {'*' * len(mysql_password)}")
else:
    print("X File .env khong co MYSQL_ROOT_PASSWORD")
    sys.exit(1)

# Kiểm tra kết nối MySQL
print("\nĐang thử kết nối MySQL...")
try:
    import mysql.connector
    db = mysql.connector.connect(
        host='localhost',
        user='root',
        password=mysql_password
    )
    print("✓ Kết nối MySQL thành công!")
    db.close()
except mysql.connector.Error as err:
    print(f"X Loi ket noi MySQL: {err}")
    print("\nCac nguyen nhan co the:")
    print("1. MySQL Server chua duoc khoi dong")
    print("2. Mat khau trong file .env khong dung")
    print("3. MySQL chua duoc cai dat")
    sys.exit(1)
except Exception as e:
    print(f"✗ Lỗi không xác định: {e}")
    sys.exit(1)

# Thử khởi động Flask app
print("\n" + "=" * 50)
print("KHOI DONG FLASK SERVER")
print("=" * 50)

try:
    sys.path.insert(0, 'server')
    from app import app
    print("OK Flask app da duoc import thanh cong!")
    print("\nServer se chay tai: http://127.0.0.1:5000")
    print("Nhan Ctrl+C de dung server\n")
    app.run(debug=True, port=5000, host='127.0.0.1')
except Exception as e:
    print(f"X Loi khi khoi dong Flask: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

