#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script kiểm tra dữ liệu trong database"""

import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

try:
    db = mysql.connector.connect(
        host='localhost',
        user='root',
        password=os.getenv('MYSQL_ROOT_PASSWORD'),
        database='financial_app'
    )
    cursor = db.cursor(dictionary=True)
    
    # Đếm số người dùng
    cursor.execute('SELECT COUNT(*) as total FROM users')
    user_count = cursor.fetchone()['total']
    print(f"So nguoi dung trong database: {user_count}")
    
    # Đếm số giao dịch
    cursor.execute('SELECT COUNT(*) as total FROM transactions')
    tx_count = cursor.fetchone()['total']
    print(f"So giao dich trong database: {tx_count}")
    
    # Hiển thị danh sách người dùng
    if user_count > 0:
        cursor.execute('SELECT user_id, name, email FROM users LIMIT 5')
        users = cursor.fetchall()
        print("\nDanh sach nguoi dung:")
        for u in users:
            print(f"  - ID: {u['user_id']}, Ten: {u['name']}, Email: {u['email']}")
    
    # Hiển thị một số giao dịch
    if tx_count > 0:
        cursor.execute('''
            SELECT t.transaction_id, t.user_id, t.type, t.amount, t.description, t.transaction_date,
                   u.name as user_name
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.user_id
            ORDER BY t.transaction_date DESC
            LIMIT 5
        ''')
        transactions = cursor.fetchall()
        print("\nDanh sach giao dich gan day:")
        for tx in transactions:
            print(f"  - {tx['user_name']}: {tx['type']} {tx['amount']:,}đ - {tx['description']} ({tx['transaction_date']})")
    
    # Tính tổng thu/chi cho từng user
    if tx_count > 0:
        cursor.execute('''
            SELECT user_id, 
                   SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                   SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expense
            FROM transactions
            GROUP BY user_id
        ''')
        balances = cursor.fetchall()
        print("\nTong quan so du theo nguoi dung:")
        for bal in balances:
            cursor.execute('SELECT name FROM users WHERE user_id = %s', (bal['user_id'],))
            user = cursor.fetchone()
            balance = (bal['total_income'] or 0) - (bal['total_expense'] or 0)
            print(f"  - {user['name']}: Thu {bal['total_income'] or 0:,.0f}đ, Chi {bal['total_expense'] or 0:,.0f}đ, So du: {balance:,.0f}đ")
    
    db.close()
    
except mysql.connector.Error as err:
    print(f"Loi ket noi MySQL: {err}")
except Exception as e:
    print(f"Loi: {e}")

