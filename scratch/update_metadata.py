import sqlite3
import os

db_path = r"C:\Users\CHARISMA\AppData\Roaming\egdesk\user-data\development\projects\678d54e8-dd25-4586-aa98-191ec54289e8\user_data.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# user_tables 테이블 목록 확인
cursor.execute("SELECT table_name, display_name FROM user_tables WHERE table_name = 'products'")
row = cursor.fetchone()
print("user_tables record:", row)

# user_columns 메타데이터 확인
cursor.execute("SELECT column_name, display_name, data_type FROM user_columns WHERE table_name = 'products'")
cols = cursor.fetchall()
print("user_columns records:", cols)

# brand 컬럼 메타데이터 주입
has_brand_meta = any(c[0] == 'brand' for c in cols)
if not has_brand_meta:
    print("Inserting 'brand' into user_columns...")
    cursor.execute("""
        INSERT INTO user_columns (table_name, column_name, display_name, data_type, is_system)
        VALUES ('products', 'brand', 'Brand', 'TEXT', 0)
    """)
    conn.commit()
    print("Inserted 'brand' column metadata!")
else:
    print("'brand' metadata already exists!")

conn.close()
