import sqlite3
import os

db_path = r"C:\Users\CHARISMA\AppData\Roaming\egdesk\user-data\development\projects\678d54e8-dd25-4586-aa98-191ec54289e8\user_data.db"

if os.path.exists(db_path):
    print("DB File Exists:", db_path)
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # products 테이블 스키마 확인
    cursor.execute("PRAGMA table_info(products)")
    cols = [row[1] for row in cursor.fetchall()]
    print("Existing Columns:", cols)
    
    if "brand" not in cols:
        print("Adding 'brand' column to products table...")
        cursor.execute("ALTER TABLE products ADD COLUMN brand TEXT")
        conn.commit()
        print("Successfully added 'brand' column!")
    else:
        print("'brand' column already exists!")
        
    conn.close()
else:
    print("DB File Not Found!")
